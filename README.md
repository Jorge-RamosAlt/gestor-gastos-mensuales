# 💰 Gestor de Gastos Mensuales

> Aplicación web progresiva para gestionar gastos personales y familiares, con carteras colaborativas en tiempo real e importación de extractos bancarios desde PDF, Excel e imágenes.

[![CI](https://github.com/Jorge-RamosAlt/gestor-gastos-mensuales/actions/workflows/ci.yml/badge.svg)](https://github.com/Jorge-RamosAlt/gestor-gastos-mensuales/actions/workflows/ci.yml)
[![Deploy](https://github.com/Jorge-RamosAlt/gestor-gastos-mensuales/actions/workflows/deploy.yml/badge.svg)](https://github.com/Jorge-RamosAlt/gestor-gastos-mensuales/actions/workflows/deploy.yml)
[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![Firebase](https://img.shields.io/badge/Firebase-11-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![PWA](https://img.shields.io/badge/PWA-instalable-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**Demo en producción:** https://gestor-gastos-1f39a.web.app

---

## ✨ Características principales

- **Carteras colaborativas en tiempo real** — compartí una cartera con un código de 6 caracteres; todos los miembros ven los cambios instantáneamente via Firestore
- **Autenticación segura** — Google Sign-In y Email/Password con validación estricta (12+ chars, mayúscula, minúscula, carácter especial) y `browserSessionPersistence`
- **Importar archivos** — PDF con texto, PDF escaneado (OCR), Excel, Word, CSV, TSV, imágenes y TXT; la app extrae los gastos automáticamente
- **Offline-first** — funciona sin conexión con Workbox; sincroniza al reconectarse
- **Sincronización cross-device** — los datos viven en Firestore; abrí desde cualquier dispositivo
- **Historial mensual** — comparativa visual de gastos mes a mes con gráfico de tendencia
- **PWA instalable** — instalala en tu celular o escritorio como app nativa

---

## 🛠️ Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.2 | Framework de UI |
| Vite | 7.3 | Build tool y dev server |
| Tailwind CSS | 4.2 | Estilos utilitarios |
| Firebase Auth | 11 | Autenticación (Google + Email/Password) |
| Firestore | 11 | Base de datos en tiempo real con offline support |
| Firebase Hosting | — | Deploy con CDN global y HTTPS automático |
| PDF.js | 5.5 | Extracción de texto de PDFs |
| Tesseract.js | 5.1 | OCR para imágenes y PDFs escaneados |
| ExcelJS | 4.4 | Lectura de archivos Excel (.xlsx/.xls) |
| vite-plugin-pwa | 0.21 | Service Worker y manifest PWA |

---

## 📁 Estructura del proyecto

```
├── .github/
│   ├── workflows/
│   │   ├── ci.yml          # CI: lint + build en cada push/PR
│   │   └── deploy.yml      # CD: deploy automático a Firebase en push a main
│   └── ISSUE_TEMPLATE/     # Templates de bugs y features
├── src/
│   ├── components/
│   │   ├── AuthPage.jsx     # Login/registro (Google + Email/Password)
│   │   ├── WalletSelector.jsx # Selector de cartera post-login
│   │   └── WalletPage.jsx   # Crear/unirse a una cartera
│   ├── lib/
│   │   ├── firebase.js      # Inicialización y Auth persistence
│   │   ├── firestoreService.js # Todas las operaciones con Firestore
│   │   ├── fileExtractors.js # Pipeline de extracción de archivos
│   │   └── expenseParser.js # Parser de transacciones bancarias
│   ├── App.jsx              # Componente principal, routing, estado global
│   └── main.jsx             # Entry point
├── firestore.rules          # Reglas de seguridad de Firestore
├── firebase.json            # Hosting config + HTTP security headers
├── vite.config.js           # Build config con PWA y code splitting
└── .env.example             # Template de variables de entorno
```

---

## 🚀 Instalación y desarrollo local

### Prerequisitos
- Node.js 20+
- npm 10+
- Cuenta de Firebase con un proyecto creado

### 1. Clonar e instalar

```bash
git clone https://github.com/Jorge-RamosAlt/gestor-gastos-mensuales.git
cd gestor-gastos-mensuales
npm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env.local
```

Editá `.env.local` con las credenciales de tu proyecto de Firebase. Las encontrás en:
**Firebase Console → Tu proyecto → Configuración del proyecto → Tus apps → Web**

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=000000000000
VITE_FIREBASE_APP_ID=1:000000000000:web:xxxxxxxxxxxx
```

> ⚠️ **Nunca commitees `.env.local`** — ya está en `.gitignore`.

### 3. Habilitar servicios en Firebase

En [Firebase Console](https://console.firebase.google.com/):
- **Authentication** → Google Sign-In y Email/Password
- **Firestore Database** → Crear en modo producción
- **Hosting** → Registrar app web

### 4. Correr en desarrollo

```bash
npm run dev
```

Abre http://localhost:5173

### 5. Build y deploy

```bash
npm run build
npx firebase-tools deploy --only hosting,firestore:rules
```

---

## 🔐 Seguridad

La app implementa defensa en profundidad con múltiples capas independientes:

**1. Firestore Security Rules**
- Cada usuario solo accede a sus propias carteras y datos
- Los datos de categorías/gastos son visibles únicamente para miembros confirmados
- Validación de formato y longitud de datos del lado del servidor
- Enumeración de carteras y códigos bloqueada (`list: false`)

**2. HTTP Security Headers (firebase.json)**
- `Strict-Transport-Security` con preload (2 años)
- `Content-Security-Policy` estricta: bloquea scripts, estilos e iframes externos no autorizados
- `X-Frame-Options: DENY` — previene clickjacking
- `Permissions-Policy` — desactiva cámara, micrófono, geolocalización, pagos, USB, Bluetooth

**3. Autenticación**
- `browserSessionPersistence` — cerrar el browser limpia la sesión
- Contraseñas con validación de complejidad (12+ chars, mixto, especial)
- Código de sala generado con `crypto.getRandomValues()` (CSPRNG, sin `Math.random()`)

Ver [SECURITY.md](SECURITY.md) para el análisis completo.

---

## 📋 Formatos de archivo soportados

| Formato | Extensiones | Método |
|---|---|---|
| PDF con texto | `.pdf` | PDF.js — extracción directa |
| PDF escaneado | `.pdf` | PDF.js + Tesseract.js OCR |
| Excel | `.xlsx`, `.xls` | ExcelJS |
| Word | `.docx`, `.doc` | JSZip + extracción XML |
| Imagen | `.png`, `.jpg`, `.jpeg`, `.webp`, `.tiff`, `.bmp` | Tesseract.js OCR |
| CSV / TSV | `.csv`, `.tsv` | Parser nativo |
| Texto plano | `.txt`, `.rtf` | Extracción directa |

Tamaño máximo: **50 MB**

---

## 💾 Modelo de datos (Firestore)

```
users/{uid}
  ├── profile: { name, salaryActual, salaryTarget }
  └── wallets: { [walletId]: { name, lastUsed } }

wallets/{walletId}
  ├── name, code, createdBy, createdAt
  ├── members: { [uid]: { name, email, photo, joinedAt } }
  └── data/categories
        ├── categories: [{ id, name, icon, items: [{ id, name, amount }] }]
        └── updatedAt, updatedBy, updatedByName

wallet_codes/{code}
  └── walletId
```

---

## 🤝 Contribuir

1. Forkear el repositorio
2. Crear una rama: `git checkout -b feature/mi-feature`
3. Commitear: `git commit -m 'feat: agregar mi feature'`
4. Pushear: `git push origin feature/mi-feature`
5. Abrir un Pull Request

Por favor seguí las templates de issues para reportar bugs o sugerir features.

---

## 📄 Licencia

MIT — ver [LICENSE](LICENSE) para más detalles.
