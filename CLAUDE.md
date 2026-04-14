# CLAUDE.md — Guía para Claude en el proyecto Gastos

Este archivo es leído automáticamente por Claude cada vez que trabaja en este repositorio.
Contiene todo lo necesario para operar con criterio, sin necesidad de reexplicar el contexto en cada sesión.

---

## 🧭 Identidad del proyecto

**Nombre:** Gastos (nombre corto) / Gestor de Gastos Mensuales (nombre completo)
**URL producción:** https://gestor-gastos-1f39a.web.app
**Repositorio:** https://github.com/Jorge-RamosAlt/gestor-gastos-mensuales
**Licencia:** MIT — pública y abierta a contribuciones externas
**Estado:** Activo, en evolución. Destinado a usuarios reales (no solo al autor).

### Propósito
App web PWA para que cualquier persona (usuario de clase media, Argentina) gestione sus gastos mensuales: importa resúmenes de tarjetas/banco en múltiples formatos, organiza por categorías, controla presupuesto, compara meses y exporta reportes. Puede usarse solo (sin cuenta) o en modo colaborativo con otras personas.

### Usuario objetivo
- Persona adulta con múltiples tarjetas de crédito, servicios y gastos variados
- Contexto económico argentino: inflación, pesos ARS como moneda primaria, bancos locales (BBVA, Galicia, Santander, Macro, etc.)
- No técnico, accede desde PC y celular
- Valora la privacidad: sus datos financieros son sensibles

---

## 🛠️ Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| UI | React | 19 | Componentes funcionales + hooks, sin clases |
| Build | Vite | 7 | Con code splitting manual para chunks pesados |
| Estilos | Tailwind CSS | 4.2 | Utility-first, dark mode habilitado |
| Auth | Firebase Auth | 11 | Google Sign-In + Email/Password |
| DB | Firestore | 11 | Real-time, offline support habilitado |
| Hosting | Firebase Hosting | — | CDN global, HTTPS automático, HTTP headers de seguridad |
| PWA | vite-plugin-pwa + Workbox | 0.21 | Service worker autoUpdate, offline-first |
| PDF | PDF.js | 5.5 | Worker bundleado, sin CDN externo |
| OCR | Tesseract.js | 5.1 | Para PDFs escaneados e imágenes |
| Excel | ExcelJS | 4.4 | Import de .xlsx/.xls |
| ZIP | JSZip | 3.10 | Lectura de .docx (Word) |
| Router | React Router | 7 | SPA routing |
| Linting | ESLint | 9 | Configuración plana (eslint.config.js) |
| CI/CD | GitHub Actions | — | CI en todo push/PR, deploy automático a main |

**Lenguaje:** JavaScript (ES2022+, módulos ESM). No TypeScript por ahora — mantener accesibilidad para contributors.

---

## 📁 Estructura del proyecto

```
src/
├── App.jsx                    # Componente raíz: routing, estado global, orquestación
├── main.jsx                   # Entry point: React + Router + ToastProvider
├── components/
│   ├── auth/
│   │   └── AuthPage.jsx       # Login: Google + Email/Password + modo solo
│   ├── wallet/
│   │   ├── WalletPage.jsx     # Crear nueva cartera
│   │   ├── WalletSelector.jsx # Elegir cartera existente
│   │   └── WalletBar.jsx      # Barra superior con info de cartera
│   ├── gastos/
│   │   ├── GastosTab.jsx      # Tab principal: lista de categorías con gastos
│   │   ├── CategoryCard.jsx   # Tarjeta de categoría con ítems editables
│   │   ├── PlanTab.jsx        # Tab de presupuesto/planificación
│   │   ├── SetupPage.jsx      # Configuración inicial del mes
│   │   ├── SearchBar.jsx      # Búsqueda de gastos
│   │   ├── SummaryHeader.jsx  # Header con totales y % del presupuesto
│   │   ├── ShareModal.jsx     # Modal para compartir cartera con código
│   │   ├── ResetModal.jsx     # Modal de confirmación para resetear mes
│   │   ├── TemplateModal.jsx  # Modal para guardar/cargar plantillas de categorías
│   │   └── CargarMesModal.jsx # Modal de cierre de mes: guardar/limpiar/continuar
│   ├── historial/
│   │   └── CompareTab.jsx     # Comparativa visual de historial mensual
│   ├── importar/
│   │   └── ImportTab.jsx      # UI de importación de archivos
│   ├── charts/
│   │   └── ChartPanel.jsx     # Gráficos (Recharts)
│   └── ui/
│       ├── ToastContainer.jsx # Sistema de notificaciones toast
│       ├── Skeleton.jsx       # Loading skeletons
│       └── EmptyState.jsx     # Estados vacíos
├── hooks/
│   └── useToast.js            # Hook para disparar toasts
└── lib/
    ├── firebase.js            # Init Firebase + Auth con browserSessionPersistence
    ├── firestoreService.js    # TODAS las operaciones de Firestore (único punto de acceso a DB)
    ├── fileExtractors.js      # Pipeline de extracción: PDF / Excel / DOCX / OCR / CSV
    ├── expenseParser.js       # Motor de parsing de transacciones desde texto
    ├── parsers/
    │   ├── bbvaParser.js      # Parser específico para resúmenes BBVA
    │   └── excelParser.js     # Parser específico para Excel estructurado
    ├── exportPDF.js           # Generación de PDF de resumen mensual
    ├── exportUtils.js         # Export a CSV y Excel
    ├── sanitize.js            # Sanitización de inputs de usuario
    └── formatters.js          # Formato de moneda ARS, fechas, porcentajes
```

---

## 🗄️ Modelo de datos (Firestore)

```
users/{uid}
  └── wallets: { [walletId]: { name: string, lastUsed: Timestamp } }

wallets/{walletId}
  ├── name: string
  ├── code: string (6 chars, CSPRNG, charset sin ambiguos)
  ├── createdBy: uid
  ├── createdAt: Timestamp
  └── members: { [uid]: { displayName, email, joinedAt } }

wallets/{walletId}/data/categories
  └── categories: Array<Category>
      ├── id: string
      ├── name: string
      ├── icon: string (emoji)
      ├── budget: number (ARS)
      └── items: Array<Item>
          ├── id: string
          ├── name: string
          ├── amount: number (ARS)
          ├── locked: boolean
          └── source: 'manual' | 'import'

wallets/{walletId}/historial/{YYYY-MM}
  ├── yearMonth: string ("2026-04")
  ├── total: number
  ├── categories: Array<Category> (snapshot)
  └── savedAt: Timestamp

wallet_codes/{code}
  └── walletId: string
```

**Estado local (localStorage):**
- `gastos_wallet_id` — ID de la cartera activa
- `gastos_solo_mode` — boolean, modo sin cuenta
- `gastos_historial_v1` — historial en modo solo (sin Firestore)
- `gastos_perfil_v1` — perfil del usuario (nombre, presupuesto target)

---

## 🔒 Seguridad — Principios no negociables

Esta es una app pública con datos financieros de usuarios reales. La seguridad es prioridad máxima.

### HTTP Headers (firebase.json)
Ya configurados: CSP estricta, HSTS preload, X-Frame-Options DENY, Referrer-Policy strict, Permissions-Policy restrictiva, CORP, COOP. **No debilitar estos headers sin justificación documentada.**

### Firestore Rules (firestore.rules)
- Cada usuario solo accede a sus propios datos (`isOwner`)
- Solo miembros confirmados pueden leer/escribir datos de una cartera (`isMember`)
- `list` bloqueado en wallets y wallet_codes (nadie puede enumerar recursos del sistema)
- Validaciones de tipos y tamaños en el servidor (no solo en cliente)
- **Las rules son defensa en profundidad: el cliente también valida, pero las rules son la última barrera.**

### Inputs
- `sanitize.js` — sanitiza todos los strings que vienen del usuario antes de persistir
- `fileExtractors.js` — valida tipo, tamaño (≤50MB) y extensión antes de procesar
- XSS: nunca usar `dangerouslySetInnerHTML` con datos de usuario sin sanitizar
- El PDF export usa `esc()` para HTML-encode antes de inyectar en templates

### CodeQL / Dependabot
- Los 4 alertas CodeQL están resueltos (ver historial de commits)
- Los 9 alertas Dependabot están cerrados (versiones parcheadas en package.json overrides)
- Mantener `npm audit` en 0 vulnerabilidades en cada release

---

## ✍️ Convenciones de código

### General
- **Idioma del código:** inglés (variables, funciones, comentarios técnicos)
- **Idioma de la UI:** español rioplatense (textos visibles para el usuario)
- **Idioma de los commits:** inglés, con prefijos convencionales (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`)

### React
- Componentes funcionales con hooks. Sin clases.
- Lazy loading para tabs pesadas: `const Tab = lazy(() => import('./Tab.jsx'))`
- Estado global mínimo en App.jsx; estado local dentro del componente que lo necesita
- No usar librerías de estado global (Redux, Zustand) — Firestore + useState es suficiente por ahora
- Props explícitas, sin spread indiscriminado (`{...props}`)

### Estilos
- Tailwind utility classes. Sin CSS-in-JS, sin módulos CSS a menos que sea inevitable.
- Dark mode con clases `dark:*` de Tailwind
- No usar `!important` salvo emergencia documentada

### Firestore
- **Todas** las operaciones de Firestore van en `firestoreService.js`. Ningún componente llama a Firestore directamente.
- Usar `onSnapshot` para suscripciones en tiempo real; limpiar con `unsubscribe` en `useEffect` cleanup
- Los datos del historial se guardan como snapshots completos (desnormalizados) para independencia temporal

### Seguridad en código
- Nunca loguear datos de usuario en producción (usar `if (import.meta.env.DEV)` para console.log)
- Nunca hardcodear credenciales. Las variables de Firebase van en `.env.local` (ver `.env.example`)
- Las claves de Firebase son de client-side y son públicas por diseño, pero las rules de Firestore son la barrera real

---

## 🚫 Qué NO hacer

1. **No migrar a TypeScript** sin discutirlo primero. Es una decisión arquitectónica mayor.
2. **No reemplazar Firebase** por Supabase, PlanetScale u otro. Firebase fue elegido por su SDK real-time y la gratuidad del tier Spark para este caso de uso.
3. **No debilitar la CSP** (`unsafe-eval`, `unsafe-inline` en scripts) por conveniencia de desarrollo.
4. **No agregar dependencias de producción** sin analizar: tamaño del bundle, mantenimiento, seguridad. El bundle ya es pesado (PDF.js + Tesseract + ExcelJS).
5. **No llamar a Firestore directamente desde componentes.** Siempre pasar por `firestoreService.js`.
6. **No usar `Math.random()`** para generar IDs o códigos de seguridad. Usar `crypto.getRandomValues()`.
7. **No hacer commits directamente con `--no-verify`** (skipear hooks de CI).
8. **No tocar los HTTP security headers** de `firebase.json` sin justificación de seguridad.
9. **No agregar `console.log` en producción** sin el guard `if (import.meta.env.DEV)`.

---

## ✅ Qué SÍ hacer

- **Proponer mejoras proactivamente** cuando veas algo que se puede hacer mejor, pero siempre explicar el porqué antes de cambiar.
- **Mantener los commits atómicos y descriptivos.** Un commit = un cambio lógico coherente.
- **Escribir comentarios en el código** cuando la lógica no es obvia (especialmente en parsers financieros y reglas de Firestore).
- **Siempre probar el build** (`npm run build`) antes de commitear cambios significativos.
- **Al agregar un parser nuevo** (banco/tarjeta), seguir el patrón de `bbvaParser.js`: detectar formato, parsear montos con `parseAmount()`, auto-categorizar con reglas de merchant.
- **Al agregar una feature nueva**, considerar: ¿funciona en modo solo? ¿funciona offline? ¿funciona en mobile?
- **Al modificar Firestore rules**, actualizar también la fecha de revisión en el comentario del archivo.

---

## 🌍 Contexto Argentina

- **Moneda principal:** ARS (pesos argentinos). Formato: `$1.234.567,89` (puntos de miles, coma decimal).
- `parseAmount()` en `expenseParser.js` maneja ambos formatos (AR y estándar).
- Los montos se guardan como **números enteros en centavos** o como floats redondeados según el parser.
- Los bancos argentinos relevantes: BBVA, Galicia, Santander, Macro, ICBC, Brubank, Naranja X, Mercado Pago.
- El parser BBVA (`bbvaParser.js`) es el más completo. Nuevos parsers deben seguir ese patrón.
- **Multimoneda** está en el roadmap pero no implementado. Al diseñar features nuevas, no asumir moneda única.

---

## 🗺️ Roadmap conocido

- Automatización de importación (Gmail → PDF → parse automático)
- Parsers para más bancos argentinos (Galicia, Santander, Mercado Pago)
- Multimoneda con fuente de tipo de cambio confiable (BCRA, Dolarito API, etc.)
- Mejoras en la experiencia mobile
- Notificaciones de alertas de presupuesto

---

## 🔄 Flujo de desarrollo

```bash
npm run dev          # Servidor local (Vite HMR)
npm run build        # Build de producción (verifica que compila)
npm run lint         # ESLint
npm run preview      # Preview del build
npm run deploy       # Build + deploy a Firebase Hosting
```

CI corre automáticamente en cada push/PR: lint + build.
Deploy automático en push a `main`.

---

*Última actualización: Abril 2026*
