# Changelog

Todos los cambios relevantes de este proyecto están documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es/1.0.0/).

---

## [2.0.0] - 2026-03-07

### 🔐 Seguridad
- Implementadas Firestore Security Rules con control de acceso por usuario y por wallet
- Agregados HTTP Security Headers en `firebase.json`: HSTS (2 años), CSP estricta, X-Frame-Options: DENY, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy
- Cambiada persistencia de auth a `browserSessionPersistence` (sessionStorage) — cierra sesión al cerrar el browser
- CSP actualizada con `upgrade-insecure-requests` y whitelist de orígenes Google/Firebase

### ✅ Nuevas funcionalidades
- **WalletSelector**: pantalla post-login que muestra todas las carteras del usuario con tabs para crear, unirse o seleccionar
- **Cambiar cartera sin cerrar sesión**: botón "Cambiar" en la barra de cartera activa
- **Cerrar sesión real**: botón "Salir" limpia localStorage y llama `signOut(auth)`, vuelve al login
- **Perfil sincronizado en Firestore**: nombre y sueldo se guardan en `users/{uid}/profile` y cargan automáticamente en cualquier dispositivo
- **Registro de carteras cross-device**: `users/{uid}/wallets` trackea todas las carteras del usuario para recuperarlas desde cualquier dispositivo
- **Retroactive wallet registration**: `registerWalletForUser()` en `subscribeToWallet()` registra carteras existentes

### 🐛 Fixes
- Corregido nombre incorrecto en el header (mostraba "Jirge" en lugar de "Jorge") — `updateProfile()` ahora sincroniza el displayName con el perfil guardado en Firestore
- Corregido "Salir" que no cerraba sesión — ahora llama `signOut(auth)` y limpia todo el estado local
- Corregido loop de auth que dejaba al usuario en WalletPage sin poder volver a sus carteras

---

## [1.3.0] - 2026-02-28

### ✅ Nuevas funcionalidades
- **Autenticación Email/Password**: registro con validación en tiempo real (12+ chars, mayúscula, minúscula, carácter especial)
- **AuthPage rediseñada**: dos tabs (Google | Email) con formularios independientes de login y registro
- **Envío de email de verificación** al registrarse (no bloqueante)
- Mensajes de error en español para todos los códigos de error de Firebase Auth

### 🐛 Fixes
- Corregido error `auth/internal-error` en Google Sign-In causado por CSP bloqueando `apis.google.com`
- Agregados dominios de Google a `script-src` y `connect-src` en la CSP

---

## [1.2.0] - 2026-02-20

### 🚀 Deploy y PWA
- Configurado Firebase Hosting con SPA rewrite (`**` → `/index.html`)
- Convertida a PWA con `vite-plugin-pwa`: manifest, service worker Workbox, iconos 192/512px
- Configurado caching de assets (1 año) y Google Fonts (CacheFirst)
- Agregado `offline.html` como fallback

### 🔐 Seguridad
- Configurados OAuth authorized origins en Google Cloud Console
- Habilitado HTTPS enforced en Firebase Hosting

---

## [1.1.0] - 2026-02-10

### ✅ Nuevas funcionalidades
- **Carteras colaborativas**: crear cartera con código único, unirse con código, ver miembros en tiempo real
- **WalletBar**: barra con nombre de cartera, código copiable y avatares de miembros
- **Sincronización en tiempo real**: `onSnapshot()` listeners para categorías y datos del wallet
- **Toast de sync**: notificación cuando otro miembro actualiza los gastos
- **Firestore offline persistence**: `persistentLocalCache()` con `persistentMultipleTabManager()`
- **Historial mensual**: comparativa visual mes a mes con gráfico SVG de tendencia
- **ShareModal**: convertir modo solo a cartera compartida sin perder datos

### 🛠️ Mejoras técnicas
- Debounce de 800ms en saves a Firestore (evita escrituras excesivas)
- Merge strategy con `setDoc(..., { merge: true })` para actualizaciones no destructivas
- Lazy imports para PDF.js, Tesseract.js y ExcelJS (code splitting automático)
- `wallet_codes/{code}` como índice de lookup para joins por código

---

## [1.0.0] - 2026-01-25

### 🚀 Lanzamiento inicial
- Dashboard de análisis de gastos con categorías fijas y variables
- Perfil de usuario: nombre, sueldo actual y sueldo objetivo (target)
- Barra de progreso con alerta visual al superar el target
- Resumen financiero: sueldo actual, objetivo, total de gastos, diferencia
- **Importar archivos**: PDF (texto y OCR), Excel, Word, CSV, TXT, imágenes
- **Parser de transacciones**: extrae gastos automáticamente con vista previa antes de confirmar
- Plan de Ajuste por fases: sugerencias automáticas Urgente / Importante / Revisable
- Pestaña Comparar: historial y gráfico de tendencia mensual
- Modo pantalla completa para análisis
- Google Sign-In con Firebase Auth
- Modo solo (sin cuenta): datos en localStorage
- SetupPage: configuración inicial de perfil
- ErrorBoundary para recuperación ante errores inesperados
- ResetModal con confirmación para reiniciar datos
- Autenticación Google con `signInWithPopup`
- Soporte ARS (pesos argentinos) con formato `$ 1.234.567`
