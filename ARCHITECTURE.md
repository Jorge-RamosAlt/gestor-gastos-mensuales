# ARCHITECTURE.md — Decisiones de arquitectura

Documenta las decisiones de diseño técnico del proyecto: qué se eligió, por qué, y qué trade-offs implica.
Sirve como contexto para Claude y para cualquier contributor que quiera entender el sistema.

---

## 1. Stack general

### React 19 + Vite 7
**Decisión:** SPA (Single Page Application) con React y Vite como build tool.

**Por qué React:** Ecosistema maduro, excelente para UIs reactivas con estado complejo (categorías, gastos, sync en tiempo real). React 19 trae mejoras de rendimiento relevantes para listas grandes.

**Por qué Vite:** Build rápido, HMR instantáneo, soporte nativo de ESM. Permite code splitting manual para los chunks pesados (PDF.js = ~2MB, Tesseract = ~5MB, ExcelJS = ~1MB). Sin Vite, el bundle inicial sería inutilizable en mobile.

**Trade-off:** SPA con mucho JS del lado del cliente. SSR (Next.js) no fue elegido porque no hay necesidad de SEO (la app requiere login) y añade complejidad de deploy innecesaria para este caso.

---

### Firebase (Auth + Firestore + Hosting)
**Decisión:** Todo el backend es Firebase.

**Por qué Firebase:**
- **Firestore** ofrece real-time sync con `onSnapshot` sin necesidad de WebSocket propio ni polling. Fundamental para carteras colaborativas.
- **Offline support** nativo: Firestore coltiene datos en cache local y sincroniza al reconectarse. Sin esto habría que implementar una capa de sync propia.
- **Firebase Auth** tiene SDKs robustos para Google OAuth y Email/Password, con gestión de tokens, refresh automático y persistencia de sesión.
- **Firebase Hosting** sirve archivos estáticos con CDN global, HTTPS automático, y permite configurar HTTP headers de seguridad directamente en `firebase.json`.
- **Tier Spark (gratuito)** es suficiente para este caso de uso en su etapa actual.

**Trade-off:** Vendor lock-in con Google. Si Firebase cambia de precios o descontinúa el tier gratuito, la migración sería costosa. Aceptado conscientemente por la velocidad de desarrollo que habilita.

**No elegido:** Supabase (no tiene real-time tan maduro), PlanetScale/Neon (SQL, requiere backend propio), self-hosted (complejidad operacional innecesaria).

---

### JavaScript (sin TypeScript)
**Decisión:** El proyecto usa JavaScript puro (ES2022+, ESM).

**Por qué no TypeScript:**
- La app es open source y busca contributions de la comunidad. TypeScript añade fricción para contributors no familiarizados.
- Los parsers financieros (el código más complejo) son más rápidos de iterar en JS.
- JSDoc puede proveer type hints donde es crítico, sin el overhead de compilación.

**Trade-off:** Sin tipos estáticos, los bugs de tipo se detectan en runtime. Aceptable dado que el código de UI está bien testeado manualmente y los parsers tienen validación explícita de inputs.

**Decisión reversible:** Si el proyecto crece significativamente y se suman más contributors, la migración a TS incremental es posible (Vite + ESLint soportan `allowJs`).

---

## 2. Autenticación

### Modos de acceso
```
Anónimo (modo solo)
  └── localStorage únicamente, sin Firestore
  └── HISTORY_KEY = "gastos_historial_v1"

Autenticado
  ├── Google Sign-In (OAuth 2.0)
  └── Email/Password (con validación estricta: 12+ chars, mayúscula, minúscula, especial)
```

**Decisión de sesión:** `browserSessionPersistence` en lugar de `local`. Al cerrar el browser, la sesión expira. Elegido por seguridad en dispositivos compartidos (datos financieros sensibles).

**Trade-off:** El usuario tiene que volver a hacer login si cierra el browser. Aceptable dado el contexto de seguridad.

---

## 3. Modelo de carteras colaborativas

### Diseño
Una "cartera" es la unidad de colaboración. Tiene un código de 6 caracteres para compartir.

```
Usuario A crea cartera → genera código "ABC123"
Usuario B ingresa "ABC123" → se une a la cartera
Ambos ven los mismos gastos en tiempo real (Firestore onSnapshot)
```

### Generación del código
```js
// crypto.getRandomValues() — CSPRNG, no Math.random()
// Charset de 32 chars (sin O/0/I/1 para evitar confusión visual)
// 256 es múltiplo exacto de 32 → sin sesgo de módulo
const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
```

**Por qué CSPRNG:** Los códigos de sala son el único mecanismo de acceso a datos privados. `Math.random()` es predecible; `crypto.getRandomValues()` no.

### Lookup de carteras
```
wallet_codes/{code} → { walletId }
```
Índice separado para hacer lookup por código en O(1) sin exponer todos los IDs de carteras.
`list` está bloqueado en Firestore rules: nadie puede enumerar todos los códigos del sistema.

---

## 4. Pipeline de importación de archivos

### Arquitectura del pipeline
```
Archivo (usuario)
  → validateFile() [tamaño, extensión]
  → fileExtractors.js [extrae texto/tabla según formato]
      ├── CSV/TSV      → parseCSV()
      ├── Excel        → ExcelJS → parseXLSX()
      ├── PDF (texto)  → PDF.js → extractPDFText()
      ├── PDF (scan)   → PDF.js → Tesseract OCR → extractPDFOCR()
      ├── DOCX         → JSZip → xmlToText()
      └── Imagen       → Tesseract OCR
  → expenseParser.js [detecta transacciones en el texto]
      ├── parseAsStructuredTable() [CSV/Excel con headers]
      ├── parseAsBankStatement()   [fecha + desc + monto]
      ├── parseAsReceipt()         [ticket con ítems]
      └── parseGeneric()           [fallback: cualquier monto]
  → [opcional] parser específico [BBVA, etc.]
  → Array<{ name, amount, date, category }>
  → UI: usuario revisa y confirma antes de guardar
```

### Lazy loading de librerías pesadas
PDF.js, Tesseract y ExcelJS se cargan **solo cuando se necesitan** (dynamic `import()`), con cache singleton:
```js
let _pdfjs = null;
async function getPDFJS() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = await import('pdfjs-dist');
  // ...
  return _pdfjs;
}
```
Esto mantiene el bundle inicial pequeño y no penaliza a usuarios que solo usan importación manual.

### Chunks de Vite
```js
manualChunks: {
  'vendor-pdf':       ['pdfjs-dist'],       // ~2MB
  'vendor-exceljs':   ['exceljs'],          // ~1MB
  'vendor-jszip':     ['jszip'],            // ~300KB
  'vendor-tesseract': ['tesseract.js'],     // ~500KB (+ ~10MB tessdata en runtime)
}
```

### PDF Worker
El worker de PDF.js se bundlea localmente (no CDN):
```js
const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
_pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
```
Requerido por la CSP (`worker-src 'self' blob:`). Un worker de CDN externo sería bloqueado.

---

## 5. Seguridad

### Defense in depth
La seguridad se aplica en 4 capas independientes:

```
Capa 1: HTTP Headers (firebase.json)
  → CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy

Capa 2: Firebase Auth
  → Solo usuarios autenticados pueden hacer requests a Firestore

Capa 3: Firestore Security Rules (firestore.rules)
  → Validación server-side de ownership, membership, tipos y tamaños
  → Última barrera: imposible bypassear desde el cliente

Capa 4: Sanitización en cliente (sanitize.js)
  → Sanitiza inputs antes de persistir (primera línea de defensa UX)
  → No reemplaza las rules del servidor
```

### Content Security Policy
La CSP es estricta y sin `unsafe-eval`. Dominios permitidos en `connect-src`:
- `*.googleapis.com`, `*.firebaseio.com`, `*.firebase.com` — Firebase
- `tessdata.projectnaptha.com` — Datos de idioma para Tesseract OCR (única dependencia externa de red en runtime)
- `securetoken.googleapis.com`, `identitytoolkit.googleapis.com` — Firebase Auth
- `accounts.google.com` — Google Sign-In

### Autenticación Email: política de contraseñas
Mínimo 12 caracteres, al menos una mayúscula, una minúscula y un carácter especial. Aplicado tanto en cliente como con Firebase Auth.

---

## 6. Sincronización y estado

### Arquitectura de estado
```
App.jsx (estado global)
├── authUser          — usuario autenticado (Firebase Auth)
├── walletId          — cartera activa (localStorage)
├── walletData        — metadata de la cartera
├── categories        — Array<Category>, synced con Firestore
└── historial         — Array<HistorialEntry>

Firestore (fuente de verdad)
├── subscribeToCategories() → actualiza categories en tiempo real
├── subscribeToWallet()     → actualiza walletData
└── subscribeToHistorial()  → actualiza historial

localStorage (fallback / modo solo)
├── gastos_wallet_id
├── gastos_solo_mode
├── gastos_historial_v1
└── gastos_perfil_v1
```

### Modo solo vs. modo colaborativo
- **Modo solo:** datos en localStorage, sin Firestore. Útil para usuarios sin cuenta o sin conexión.
- **Modo colaborativo:** datos en Firestore, sync en tiempo real. Los cambios de cualquier miembro se propagan instantáneamente.
- La app detecta el modo en `getSoloMode()` y enruta las operaciones al storage correspondiente.

---

## 7. Offline-first

### Workbox (Service Worker)
```js
// vite.config.js
workbox: {
  globPatterns: ['**/*.{js,css,html,ico,svg,png,woff2}'],
  navigateFallback: '/index.html',
  // Fuentes con CacheFirst
  // Firebase APIs no se cachean (tokens)
}
```

### Firestore offline
Firestore tiene cache local habilitado por defecto en el SDK web. Al perder conexión:
- Las lecturas sirven desde cache
- Las escrituras se encolan y se sincronizan al reconectarse

---

## 8. Export

### PDF (exportPDF.js)
Genera un HTML completo con los gastos y lo abre en una nueva pestaña para que el usuario imprima/guarde como PDF.
- Usa `Blob + URL.createObjectURL()` (no `document.write()` — fix de seguridad CodeQL)
- HTML-encode de todos los strings de usuario con `esc()` antes de inyectar en el template
- URL revocada a los 60 segundos para liberar memoria

### CSV y Excel (exportUtils.js)
Genera y descarga archivos directamente desde el cliente, sin servidor.

---

## 9. CI/CD

```
Push / PR → GitHub Actions CI
  ├── npm install --legacy-peer-deps
  ├── npm run lint
  └── npm run build

Push a main → GitHub Actions Deploy
  └── firebase deploy --only hosting
```

El build de Vite falla si hay errores de sintaxis o imports rotos → protección básica antes de deploy.
ESLint corre en CI → los errores de linting bloquean el merge.

---

## 10. Decisiones pendientes / roadmap técnico

| Decisión | Estado | Contexto |
|---|---|---|
| Multimoneda | Pendiente | `parseAmount()` ya maneja ARS. Falta: selector de moneda por ítem, tipo de cambio en tiempo real |
| Parsers adicionales | En progreso | BBVA implementado. Galicia, Santander, MercadoPago pendientes |
| Automatización de importación | Roadmap | Gmail → adjunto PDF → parse automático → push a Firestore |
| TypeScript | Descartado por ahora | Revisable si el proyecto escala en contributors |
| Tests automatizados | Roadmap | No hay tests unitarios. Prioritario para los parsers (lógica crítica) |
| Notificaciones push | Roadmap | Firebase Cloud Messaging para alertas de presupuesto |
| Backend propio | Descartado | Firebase cubre todas las necesidades actuales sin server-side code |

---

*Última actualización: Abril 2026*
