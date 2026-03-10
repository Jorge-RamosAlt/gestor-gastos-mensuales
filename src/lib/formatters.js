/**
 * formatters.js — formatting utilities for currency, dates, and calculations
 */

const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

export const fmt = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

export const pct = (part, total) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

export const fmtShort = (n) => {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
};

export const monthLabel = (month, year) => `${MESES[month]} ${year}`;

export const getCurrentMonthLabel = () => {
  const now = new Date();
  return now.toLocaleString("es-AR", { month: "long", year: "numeric" });
};

export const fmtDelta = (cur, prev) => {
  if (!prev) return null;
  const d   = cur - prev;
  const pct = Math.round((d / prev) * 100);
  return { d, pct, up: d > 0 };
};

export const catFromEntry = (entry, catId, currentCats, currentTotal) => {
  if (!entry) return 0;
  if (entry.breakdown?.[catId] !== undefined) return entry.breakdown[catId];
  const cat = currentCats.find(c => c.id === catId);
  if (!cat || currentTotal === 0) return 0;
  return Math.round(entry.total * (cat.total / currentTotal));
};

export { MESES };
