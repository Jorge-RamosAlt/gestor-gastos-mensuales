/**
 * firebase.js — inicialización centralizada de Firebase.
 * Todos los módulos importan db/auth desde acá.
 */
import { initializeApp }  from 'firebase/app';
import { getAuth, browserSessionPersistence, setPersistence } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

// Firestore con persistencia local habilitada:
// · Los datos se cachean en IndexedDB del navegador
// · La app funciona offline y sincroniza cuando vuelve la conexión
// · persistentMultipleTabManager permite tener varias pestañas abiertas
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// Auth con persistencia de SESIÓN:
// · F5 en la misma pestaña → mantiene la sesión (sessionStorage)
// · Cerrar el browser / abrir nueva ventana → pide login de nuevo
// · Nunca escribe en localStorage, ideal para apps financieras
export const auth = getAuth(app);
setPersistence(auth, browserSessionPersistence);
