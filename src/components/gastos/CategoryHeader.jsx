import React from "react";
import { fmt, pct } from "../../lib/formatters.js";

function CategoryHeader({
  category,
  total,
  isOpen,
  onToggleOpen,
  catTotal,
  budget,
  recurringCount,
  doneCount,
  scheme,
  onDelete,
  onNoteToggle,
}) {
  const overBudget = budget > 0 && catTotal > budget;
  const overAmount = overBudget ? catTotal - budget : 0;

  return (
    <button
      className="group w-full flex items-center justify-between px-4 py-3 hover:brightness-95 transition"
      style={{ backgroundColor: scheme.header }}
      onClick={onToggleOpen}
      aria-expanded={isOpen}
      aria-label={isOpen ? "Colapsar categoría" : "Expandir categoría"}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{category.icon}</span>
        <div className="text-left">
          <span className="font-semibold text-sm" style={{ color: scheme.text }}>
            {category.name}
          </span>
          {category.note && (
            <p className="text-xs text-gray-500 truncate max-w-xs">
              {category.note.split("\n")[0]}
            </p>
          )}
        </div>
        {category.locked && (
          <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">
            FIJO
          </span>
        )}
        {recurringCount > 0 && (
          <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">
            🔁 {recurringCount}
          </span>
        )}
        {doneCount > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
            ✓ {doneCount} listo{doneCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>
      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-2">
          {budget > 0 ? (
            <div className="text-xs font-bold" style={{ color: scheme.text }}>
              {fmt(catTotal)}{" "}
              <span className="font-normal opacity-70">/ {fmt(budget)}</span>
            </div>
          ) : (
            <span className="text-sm font-bold" style={{ color: scheme.text }}>
              {fmt(catTotal)}
            </span>
          )}
          {overBudget && (
            <span className="text-xs font-bold text-red-600">🚨 +{fmt(overAmount)}</span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNoteToggle();
            }}
            title="Agregar nota"
            aria-label="Agregar nota"
            className="text-amber-600 hover:text-amber-700 text-xs px-1 opacity-0 group-hover:opacity-100 transition"
          >
            📝
          </button>
          {onDelete && (
            <button
              onClick={(e) => {
                if (category.locked) return;
                e.stopPropagation();
                if (window.confirm(`¿Eliminar categoría "${category.name}"?`)) {
                  onDelete(category.id);
                }
              }}
              title={category.locked ? undefined : "Eliminar categoría"}
              aria-label={
                category.locked ? undefined : `Eliminar categoría ${category.name}`
              }
              className={`text-red-400 hover:text-red-600 text-xs px-1 transition ${
                category.locked ? "invisible pointer-events-none" : "opacity-0 group-hover:opacity-100"
              }`}
            >
              🗑
            </button>
          )}
          <span
            className="text-gray-500 transition-transform duration-200"
            style={{ transform: isOpen ? "rotate(0deg)" : "rotate(180deg)" }}
          >
            ▲
          </span>
        </div>
        {budget > 0 && (
          <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${
                catTotal > budget
                  ? "bg-red-500"
                  : catTotal > budget * 0.8
                    ? "bg-amber-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${Math.min(100, (catTotal / budget) * 100)}%` }}
            />
          </div>
        )}
        <span className="text-gray-500 text-xs">{pct(catTotal, total)}% del total</span>
      </div>
    </button>
  );
}

export default CategoryHeader;
