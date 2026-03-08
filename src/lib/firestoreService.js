/**
 * firestoreService.js — todas las operaciones de Firestore.
 *
 * Estructura de datos en Firestore:
 *
 *   wallet_codes/{code}           → { walletId }  (lookup rápido por código)
 *
 *   wallets/{walletId}            → { name, code, createdBy, createdAt, members: { uid: {...} } }
 *   wallets/{walletId}/data/categories → { categories: [...], updatedAt, updatedBy, updatedByName }
 */

import {
  doc, setDoc, getDoc, updateDoc,
  collection, onSnapshot, serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

// ── Registro de cartera en el perfil del usuario ──────────────────────────────
// Guarda en users/{uid} qué carteras tiene el usuario, para recuperarlas
// aunque localStorage esté vacío (nuevo dispositivo, browser limpio, etc.)
export async function registerWalletForUser(uid, walletId, walletName) {
  const userRef = doc(db, 'users', uid);
  // Merge para no pisar otras carteras que ya tenga el usuario
  await setDoc(
    userRef,
    {
      wallets: {
        [walletId]: {
          name:     walletName,
          lastUsed: serverTimestamp(),
        },
      },
    },
    { merge: true }
  );
}

// ── Obtener las carteras del usuario desde Firestore ─────────────────────────
// Devuelve un array [ { walletId, name, lastUsed } ] ordenado por lastUsed desc.
export async function getUserWallets(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return [];
  const wallets = snap.data()?.wallets ?? {};
  return Object.entries(wallets)
    .map(([walletId, info]) => ({ walletId, ...info }))
    .sort((a, b) => {
      // lastUsed puede ser un Timestamp de Firestore o null
      const ta = a.lastUsed?.toMillis?.() ?? 0;
      const tb = b.lastUsed?.toMillis?.() ?? 0;
      return tb - ta; // más reciente primero
    });
}

// ── LocalStorage key para recordar la cartera del usuario ──
const WALLET_KEY = 'gastos_wallet_id';
const SOLO_KEY   = 'gastos_solo_mode';

export const getLocalWalletId  = ()     => localStorage.getItem(WALLET_KEY);
export const setLocalWalletId  = (id)   => localStorage.setItem(WALLET_KEY, id);
export const clearLocalWalletId = ()    => localStorage.removeItem(WALLET_KEY);
export const getSoloMode       = ()     => localStorage.getItem(SOLO_KEY) === 'true';
export const setSoloMode       = (val)  => localStorage.setItem(SOLO_KEY, String(val));

// ── Generador de código de sala (6 chars, sin caracteres ambiguos) ──
// Usa crypto.getRandomValues() (CSPRNG) en lugar de Math.random(),
// garantizando imprevisibilidad criptográfica para los códigos de cartera.
// El charset tiene 32 caracteres y Uint8Array produce valores 0-255;
// como 256 es múltiplo exacto de 32 (256/32 = 8), no hay sesgo de módulo.
function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars, sin O/0/I/1
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => chars[byte % chars.length]).join('');
}

// ── Crear una nueva cartera ──────────────────────────────────────────────────
export async function createWallet(user, walletName, initialCategories = []) {
  // Validar inputs del lado del cliente (las Firestore Rules hacen la misma
  // validación del lado del servidor — defensa en profundidad)
  const trimmed = (walletName ?? '').trim();
  if (!trimmed)          throw new Error('El nombre de la cartera no puede estar vacío.');
  if (trimmed.length > 100) throw new Error('El nombre no puede superar los 100 caracteres.');
  if (!user?.uid)        throw new Error('Usuario no autenticado.');
  walletName = trimmed;
  // Generar código único
  let code, codeRef, snap;
  do {
    code    = generateCode();
    codeRef = doc(db, 'wallet_codes', code);
    snap    = await getDoc(codeRef);
  } while (snap.exists());

  const walletRef = doc(collection(db, 'wallets'));
  const walletId  = walletRef.id;

  // Documento principal de la cartera
  await setDoc(walletRef, {
    name:      walletName,
    code,
    createdBy: user.uid,
    createdAt: serverTimestamp(),
    members: {
      [user.uid]: {
        name:     user.displayName,
        email:    user.email,
        photo:    user.photoURL,
        joinedAt: serverTimestamp(),
      },
    },
  });

  // Datos iniciales (categorías + gastos)
  await setDoc(doc(db, 'wallets', walletId, 'data', 'categories'), {
    categories:      initialCategories,
    updatedAt:       serverTimestamp(),
    updatedBy:       user.uid,
    updatedByName:   user.displayName,
  });

  // Índice de código → walletId
  await setDoc(codeRef, { walletId });

  // Registrar la cartera en el perfil del usuario (persistencia cross-device)
  await registerWalletForUser(user.uid, walletId, walletName);

  setLocalWalletId(walletId);
  return { walletId, code };
}

// ── Unirse a una cartera existente ───────────────────────────────────────────
export async function joinWallet(user, code) {
  const normalized = (code ?? '').toUpperCase().trim();
  if (!normalized || normalized.length < 4)
    throw new Error('El código de sala es inválido.');
  if (!user?.uid)
    throw new Error('Usuario no autenticado.');
  const codeRef  = doc(db, 'wallet_codes', normalized);
  const codeSnap = await getDoc(codeRef);

  if (!codeSnap.exists()) {
    throw new Error('Código incorrecto. Verificá que esté bien escrito.');
  }


  const { walletId } = codeSnap.data();
  const walletRef    = doc(db, 'wallets', walletId);

  // Verificar que la cartera existe
  const walletSnap = await getDoc(walletRef);
  if (!walletSnap.exists()) {
    throw new Error('La cartera ya no existe.');
  }

  // Agregar usuario como miembro
  await updateDoc(walletRef, {
    [`members.${user.uid}`]: {
      name:     user.displayName,
      email:    user.email,
      photo:    user.photoURL,
      joinedAt: serverTimestamp(),
    },
  });

  // Registrar la cartera en el perfil del usuario (persistencia cross-device)
  await registerWalletForUser(user.uid, walletId, walletSnap.data().name);

  setLocalWalletId(walletId);
  return walletId;
}

// ── Obtener datos de una cartera (una vez) ───────────────────────────────────
export async function getWallet(walletId) {
  const snap = await getDoc(doc(db, 'wallets', walletId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

// ── Guardar categorías en Firestore (debounced en el caller) ─────────────────
export async function saveCategories(walletId, categories, user) {
  await setDoc(doc(db, 'wallets', walletId, 'data', 'categories'), {
    categories,
    updatedAt:     serverTimestamp(),
    updatedBy:     user.uid,
    updatedByName: user.displayName,
  });
}

// ── Listener en tiempo real de categorías ────────────────────────────────────
// Devuelve la función unsub para llamar en cleanup.
export function subscribeToCategories(walletId, onUpdate, onError) {
  const ref = doc(db, 'wallets', walletId, 'data', 'categories');
  return onSnapshot(
    ref,
    (snap) => { if (snap.exists()) onUpdate(snap.data()); },
    (err)  => { if (onError) onError(err); }
  );
}

// ── Listener en tiempo real de la cartera (miembros, nombre, etc.) ───────────
export function subscribeToWallet(walletId, onUpdate, onError) {
  const ref = doc(db, 'wallets', walletId);
  return onSnapshot(
    ref,
    (snap) => { if (snap.exists()) onUpdate({ id: snap.id, ...snap.data() }); },
    (err)  => { if (onError) onError(err); }
  );
}

// ── Salir de la cartera (solo localmente — los datos quedan en Firestore) ────
export function leaveWallet() {
  clearLocalWalletId();
}

// ── Guardar perfil del usuario en Firestore ───────────────────────────────────
// Almacena nombre y sueldos bajo users/{uid}.profile (merge, no pisa carteras)
export async function saveUserProfile(uid, profile) {
  await setDoc(
    doc(db, 'users', uid),
    { profile },
    { merge: true }
  );
}

// ── Leer perfil del usuario desde Firestore ───────────────────────────────────
export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return snap.data()?.profile ?? null;
}
