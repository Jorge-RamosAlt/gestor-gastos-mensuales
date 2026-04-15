import React from "react";
import { fmt } from "../../lib/formatters.js";

function CategoryItemRow({
  item,
  scheme,
  darkMode,
  editingId,
  editValue,
  onStartEdit,
  onCommitEdit,
  onSetEditValue,
  onToggleDone,
  onToggleRecurring,
  onDelete,
}) {
  return (
    <div
      className={`flex items-start gap-2 justify-between px-4 py-2.5 transition group ${
        item.done ? "opacity-60" : ""
      }`}
      style={{ "--hover-bg": scheme.itemHover }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = scheme.itemHover;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "";
      }}
    >
      <input
        type="checkbox"
        checked={!!item.done}
        onChange={onToggleDone}
        className="mt-0.5 w-4 h-4 rounded accent-green-500 cursor-pointer flex-shrink-0"
        title={
          item.done ? "Marcar como pendiente" : "Marcar como listo (no se copiará al mes siguiente)"
        }
        aria-label={item.done ? "Marcar como pendiente" : "Marcar como listo"}
      />
      <div className="flex-1 min-w-0 pr-4">
        <div className="flex items-center gap-1">
          {item.locked && <span className="text-gray-400 text-xs">🔒</span>}
          {item.alert && !item.locked && <span className="text-xs">⚠️</span>}
          <span
            className={`text-sm ${item.done ? "line-through" : ""}`}
            style={{
              color: item.done ? (darkMode ? "#94a3b8" : "#9ca3af") : scheme.itemText,
            }}
          >
            {item.name}
          </span>
          {item.done && (
            <span className="text-xs text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">
              ✓ Listo
            </span>
          )}
          {item.recurring && <span className="text-teal-600 text-xs font-semibold">🔁</span>}
        </div>
        {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {editingId === item.id ? (
          <div className="flex items-center gap-1">
            <input
              autoFocus
              className="w-28 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={editValue}
              onChange={(e) => onSetEditValue(e.target.value)}
              onBlur={() => onCommitEdit(item.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onCommitEdit(item.id);
                if (e.key === "Escape") onStartEdit(null, "");
              }}
            />
            <button
              className="text-green-600 text-xs font-bold"
              onMouseDown={() => onCommitEdit(item.id)}
            >
              ✓
            </button>
          </div>
        ) : (
          <>
            <button
              className="text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition cursor-pointer border border-blue-200"
              onClick={() => onStartEdit(item.id, String(item.amount))}
              title="Clic para editar monto"
            >
              {fmt(item.amount)}
            </button>
            {!item.locked && (
              <button
                onClick={() => onToggleRecurring(item.id)}
                className="text-gray-400 hover:text-teal-600 transition opacity-0 group-hover:opacity-100"
                title="Gasto recurrente"
                aria-label={item.recurring ? "Quitar recurrencia" : "Marcar como recurrente"}
              >
                🔁
              </button>
            )}
            {!item.locked && (
              <button
                onClick={() => onDelete(item.id)}
                className="text-gray-400 hover:text-red-500 transition text-lg leading-none opacity-0 group-hover:opacity-100"
                title="Eliminar"
                aria-label={`Eliminar ${item.name}`}
              >
                ×
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default CategoryItemRow;
