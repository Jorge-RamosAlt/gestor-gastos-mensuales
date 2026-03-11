/**
 * sanitize.js — sanitiza strings de usuario antes de guardar en Firestore.
 * Elimina caracteres de control, limita longitud y strip HTML básico.
 */

/** Elimina tags HTML y caracteres de control; recorta espacios */
export function sanitizeText(str, maxLen = 200) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '')           // strip HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '')  // strip control characters
    .trim()
    .slice(0, maxLen);
}

/** Para nombres cortos (categorías, ítems): max 80 chars */
export function sanitizeName(str) {
  return sanitizeText(str, 80);
}

/** Para notas/descripciones: max 500 chars */
export function sanitizeNote(str) {
  return sanitizeText(str, 500);
}
