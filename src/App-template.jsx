import { useState, useMemo, useEffect, useCallback } from "react";

// VALORES PARA QUE TU AMIGO COMPLETE
const TARGET = 0;
const SALARY_ACTUAL = 0;
const SALARY_NUEVO = 0;

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const pct = (part, total) => (total > 0 ? Math.round((part / total) * 100) : 0);

const INITIAL_CATEGORIES = [
  {
    id: "fijos",
    name: "Gastos Fijos",
    icon: "🏠",
    locked: true,
    color: "bg-gray-100 border-gray-400",
    headerColor: "bg-gray-200",
    textColor: "text-gray-700",
    items: [
      { id: "item1", name: "Ejemplo Gasto Fijo", amount: 0, locked: true, note: "Completar aquí" },
    ],
  },
  {
    id: "variables",
    name: "Gastos Variables",
    icon: "🛒",
    locked: false,
    color: "bg-blue-50 border-blue-300",
    headerColor: "bg-blue-100",
    textColor: "text-blue-800",
    items: [
      { id: "item2", name: "Ejemplo Gasto Variable", amount: 0, locked: false },
    ],
  },
];

// RECOMENDACIONES VACÍAS
const RECOMMENDATIONS = [
  { priority: "🟡 REVISABLE", title: "Ejemplo de ahorro", saving: 0, detail: "Explicación del ahorro", category: "variables" },
];

// ... (Acá sigue el resto de la lógica de IconExpand, IconCompress y la función GastosApp que ya tenés)