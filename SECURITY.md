# 🔐 Security Policy

## Modelo de seguridad

Este proyecto implementa **defensa en profundidad** con 3 capas independientes. Una vulnerabilidad en una capa no compromete las demás.

---

## Capa 1 — Firestore Security Rules

Archivo: `firestore.rules`

| Colección | Lectura | Escritura | Notas |
|---|---|---|---|
| `users/{uid}` | Solo el owner (`request.auth.uid == uid`) | Solo el owner | Perfil y lista de wallets privados |
| `wallets/{walletId}` | Cualquier usuario auth (para validar códigos) | Create: solo si te incluís como miembro; Update: solo miembros | `list` bloqueado — no se pueden enumerar wallets ajenos |
| `wallet_codes/{code}` | `get`: cualquier auth; `list`: **false** | Create: cualquier auth; Update/Delete: **false** | Inmutabilidad garantizada por reglas, no por código |
| `wallets/{id}/data/{doc}` | Solo miembros del wallet (`isMember()`) | Solo miembros del wallet | Los gastos son privados a la cartera |

### Función `isMember()`
```javascript
function isMember(walletId) {
  return isAuth() && request.auth.uid in
    get(/databases/$(database)/documents/wallets/$(walletId)).data.members;
}
```

---

## Capa 2 — HTTP Security Headers

Configurados en `firebase.json`, aplicados por Firebase Hosting en cada respuesta.

| Header | Valor | Protección |
|---|---|---|
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | MITM, downgrade attacks (2 años) |
| `Content-Security-Policy` | Whitelist estricta (ver abajo) | XSS, code injection, data exfiltration |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME-sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Info leakage en headers |
| `Permissions-Policy` | Bloquea camera, microphone, geolocation, payment, usb, bluetooth, serial | Acceso no autorizado a hardware |
| `Cross-Origin-Opener-Policy` | `same-origin-allow-popups` | Cross-origin info leaks (permite popups de Google Auth) |
| `Cross-Origin-Resource-Policy` | `same-origin` | Cross-origin resource reads |

### Content-Security-Policy detallada
```
default-src 'self';
script-src 'self' https://apis.google.com https://accounts.google.com
           https://www.gstatic.com https://cdnjs.cloudflare.com 'wasm-unsafe-eval';
connect-src 'self' https://*.googleapis.com https://*.firebaseio.com
            https://*.firebase.google.com wss://*.firebaseio.com;
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
font-src 'self' https://fonts.gstatic.com;
img-src 'self' data: https://lh3.googleusercontent.com https://www.gstatic.com;
frame-src https://accounts.google.com;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

---

## Capa 3 — Autenticación y gestión de sesiones

| Aspecto | Implementación | Razón |
|---|---|---|
| Persistencia de auth | `browserSessionPersistence` (sessionStorage) | En equipos compartidos, cerrar el browser limpia la sesión automáticamente |
| Sign out completo | `signOut(auth)` + limpieza de localStorage | Elimina todos los tokens y estado local |
| Validación de contraseña | 12+ chars, mayúscula, minúscula, carácter especial | Previene passwords débiles |
| Proveedor OAuth | Google Sign-In con `signInWithPopup` | Delegación a proveedor de identidad confiable |
| displayName | Sincronizado con Firestore `profile.name` vía `updateProfile()` | Evita inconsistencias entre Auth y datos de la app |

---

## Bundle y dependencias

A diferencia de alternativas que cargan librerías desde CDN externos, esta app compila todas las dependencias en un bundle local con Vite. Esto elimina el riesgo de **supply chain attacks** vía CDN comprometidos.

Las dependencias están fijadas en `package-lock.json`. Para auditar vulnerabilidades:

```bash
npm audit
```

Las librerías pesadas (PDF.js, Tesseract.js, ExcelJS) se cargan con **lazy imports** bajo demanda, no en el bundle principal.

---

## Datos del usuario

- Los datos financieros (gastos, categorías, perfil) se almacenan en **Firestore**, protegidos por las Security Rules descritas arriba
- Las reglas garantizan que **ningún usuario puede acceder a los datos de otro usuario o de una cartera a la que no pertenece**
- No se recopilan analytics ni telemetría
- Las fotos de perfil provienen del proveedor OAuth (Google) y no se almacenan en Firestore

---

## Vulnerabilidades conocidas / pendientes

| Severidad | Descripción | Estado |
|---|---|---|
| 🟡 Baja | Sin tests automatizados — regresiones podrían introducir bugs de seguridad sin detección | Pendiente |
| 🟡 Baja | Sin rate limiting en operaciones de Firestore (creación de wallets, joins) | Pendiente — mitigado parcialmente por auth requerida |
| ✅ Resuelto | CSP bloqueaba `apis.google.com` en Google Sign-In | Corregido en v1.3.0 |
| ✅ Resuelto | OAuth authorized origins faltaban en producción | Corregido en v1.2.0 |
| ✅ Resuelto | `browserSessionPersistence` no configurado (tokens en localStorage) | Corregido en v1.3.0 |

---

## Reportar una vulnerabilidad

Si encontrás una vulnerabilidad en este proyecto, por favor abrí un [Issue](../../issues) con el tag `security` describiendo el problema de forma general. No incluyas información sensible ni exploits funcionales en el reporte público.
