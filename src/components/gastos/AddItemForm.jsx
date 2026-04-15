import React from "react";
import { fmt } from "../../lib/formatters.js";

function AddItemForm({
  showAddForm,
  newItemName,
  newItemAmount,
  onSetNewItemName,
  onSetNewItemAmount,
  onAddItem,
  onToggleAddForm,
  showBudgetEdit,
  budgetValue,
  onSetBudgetValue,
  onSetBudget,
  onToggleBudgetEdit,
  budget,
  showNotes,
  noteValue,
  onSetNoteValue,
  onSaveNote,
  onToggleNotes,
}) {
  return (
    <>
      {/* Budget setting section */}
      {showBudgetEdit ? (
        <div className="px-4 py-3 bg-amber-50 border-t-2 border-amber-200 flex gap-2 items-center">
          <input
            autoFocus
            type="text"
            inputMode="numeric"
            placeholder="Presupuesto (dejar vacío para eliminar)"
            value={budgetValue}
            onChange={(e) => onSetBudgetValue(e.target.value)}
            className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
            onKeyDown={(e) => {
              if (e.key === "Enter") onSetBudget();
              if (e.key === "Escape") {
                onToggleBudgetEdit(false);
                onSetBudgetValue("");
              }
            }}
          />
          <button
            onClick={onSetBudget}
            className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition text-sm"
          >
            ✓
          </button>
          <button
            onClick={() => {
              onToggleBudgetEdit(false);
              onSetBudgetValue("");
            }}
            className="border-2 border-gray-300 text-gray-600 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            onToggleBudgetEdit(true);
            onSetBudgetValue(budget ? String(budget) : "");
          }}
          className="w-full px-4 py-2.5 text-left text-sm text-amber-700 hover:bg-amber-50 transition font-medium flex items-center gap-2 border-t border-gray-200"
        >
          ⚙️ {budget > 0 ? `Presupuesto: ${fmt(budget)}` : "Establecer presupuesto"}
        </button>
      )}

      {/* Add item form */}
      {showAddForm ? (
        <div className="px-4 py-3 bg-blue-50 border-t-2 border-blue-200">
          <div className="flex gap-2">
            <input
              autoFocus
              type="text"
              placeholder="Descripción"
              value={newItemName}
              onChange={(e) => onSetNewItemName(e.target.value)}
              className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddItem();
                if (e.key === "Escape") onToggleAddForm(false);
              }}
            />
            <input
              type="text"
              inputMode="numeric"
              placeholder="Monto"
              value={newItemAmount}
              onChange={(e) => onSetNewItemAmount(e.target.value)}
              className="w-28 border rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
              onKeyDown={(e) => {
                if (e.key === "Enter") onAddItem();
                if (e.key === "Escape") onToggleAddForm(false);
              }}
            />
            <button
              onClick={onAddItem}
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg transition text-sm"
            >
              ✓
            </button>
            <button
              onClick={() => {
                onToggleAddForm(false);
                onSetNewItemName("");
                onSetNewItemAmount("");
              }}
              className="border-2 border-gray-300 text-gray-600 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => onToggleAddForm(true)}
          className="w-full px-4 py-2.5 text-left text-sm text-blue-700 hover:bg-blue-50 transition font-medium flex items-center gap-2"
        >
          ➕ Agregar gasto
        </button>
      )}

      {/* Notes section */}
      {showNotes && (
        <div className="px-4 py-3 bg-amber-50 border-t-2 border-amber-200">
          <textarea
            autoFocus
            value={noteValue}
            onChange={(e) => onSetNoteValue(e.target.value)}
            onBlur={onSaveNote}
            placeholder="Agregar nota sobre esta categoría..."
            className="w-full border-2 border-amber-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
            rows="3"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={onSaveNote}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition text-sm"
            >
              ✓ Guardar
            </button>
            <button
              onClick={() => {
                onToggleNotes(false);
                onSetNoteValue("");
              }}
              className="border-2 border-gray-300 text-gray-600 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm"
            >
              ✕ Cancelar
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default AddItemForm;
