import React, { useState } from "react";
import { fmt, pct } from "../../lib/formatters.js";
import { sanitizeName, sanitizeNote } from "../../lib/sanitize.js";
import { useToast } from "../../hooks/useToast.js";

function CategoryCard({ category, total, onUpdate, onDelete }) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");
  const [showBudgetEdit, setShowBudgetEdit] = useState(false);
  const [budgetValue, setBudgetValue] = useState("");
  const [showNotes, setShowNotes] = useState(false);
  const [noteValue, setNoteValue] = useState(category.note || "");

  const catTotal = category.items.reduce((s, i) => s + i.amount, 0);
  const recurringCount = category.items.filter(i => i.recurring).length;
  const doneCount = category.items.filter(i => i.done).length;
  const budget = category.budget || 0;
  const overBudget = budget > 0 && catTotal > budget;
  const overAmount = overBudget ? catTotal - budget : 0;

  const setBudget = () => {
    const val = parseInt(budgetValue.replace(/\D/g, ""), 10);
    if (!isNaN(val) && val >= 0) {
      const updatedCat = { ...category, budget: val };
      onUpdate(updatedCat);
      if (val > 0 && catTotal > val) {
        toast.warning(`⚠️ ${category.name} superó el presupuesto por ${fmt(catTotal - val)}`);
      }
      setShowBudgetEdit(false);
      setBudgetValue("");
    }
  };

  const startEdit = (itemId, currentAmount) => {
    setEditingId(itemId);
    setEditValue(String(currentAmount));
  };

  const commitEdit = (itemId) => {
    const parsed = parseInt(editValue.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      const updatedItems = category.items.map(item =>
        item.id === itemId ? { ...item, amount: parsed } : item
      );
      onUpdate({ ...category, items: updatedItems });
    }
    setEditingId(null);
  };

  const deleteItem = (itemId) => {
    const updatedItems = category.items.filter(item => item.id !== itemId);
    onUpdate({ ...category, items: updatedItems });
    toast.info('Ítem eliminado');
  };

  const toggleRecurring = (itemId) => {
    const updatedItems = category.items.map(item =>
      item.id === itemId ? { ...item, recurring: !item.recurring } : item
    );
    onUpdate({ ...category, items: updatedItems });
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    const parsed = parseInt(newItemAmount.replace(/\D/g, ""), 10) || 0;
    const newItem = {
      id: `item_${Date.now()}`,
      name: sanitizeName(newItemName.trim()),
      amount: parsed,
      locked: false,
    };
    const updatedItems = [...category.items, newItem];
    onUpdate({ ...category, items: updatedItems });
    toast.success('Gasto agregado ✅');
    setNewItemName("");
    setNewItemAmount("");
    setShowAddForm(false);
  };

  const saveNote = () => {
    onUpdate({ ...category, note: sanitizeNote(noteValue) });
    setShowNotes(false);
  };

  return (
    <div className={`rounded-xl border-2 overflow-hidden shadow-sm ${category.color}`}>
      <button
        className={`group w-full flex items-center justify-between px-4 py-3 ${category.headerColor} hover:brightness-95 transition`}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Colapsar categoría" : "Expandir categoría"}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.icon}</span>
          <div className="text-left">
            <span className={`font-semibold text-sm ${category.textColor}`}>{category.name}</span>
            {category.note && (
              <p className="text-xs text-gray-500 truncate max-w-xs">{category.note.split('\n')[0]}</p>
            )}
          </div>
          {category.locked && <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">FIJO</span>}
          {recurringCount > 0 && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-semibold">🔁 {recurringCount}</span>}
          {doneCount > 0 && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
              ✓ {doneCount} listo{doneCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            {budget > 0 && (
              <div className="text-xs text-gray-600 font-medium">
                🎯 {fmt(catTotal)} / {fmt(budget)}
              </div>
            )}
            {overBudget && (
              <span className="text-xs font-bold text-red-600">🚨 +{fmt(overAmount)} sobre presupuesto</span>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowNotes(!showNotes);
              }}
              title="Agregar nota"
              aria-label="Agregar nota"
              className="text-amber-600 hover:text-amber-700 text-xs px-1 opacity-0 group-hover:opacity-100 transition"
            >📝</button>
            {!category.locked && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`¿Eliminar categoría "${category.name}"?`)) {
                    onDelete(category.id);
                    toast.info(`Categoría "${category.name}" eliminada`);
                  }
                }}
                title="Eliminar categoría"
                aria-label={`Eliminar categoría ${category.name}`}
                className="text-red-400 hover:text-red-600 text-xs px-1 opacity-0 group-hover:opacity-100 transition"
              >🗑</button>
            )}
            <span className="text-gray-500 transition-transform duration-200" style={{ transform: isOpen ? 'rotate(0deg)' : 'rotate(180deg)' }}>▲</span>
          </div>
          {budget > 0 && (
            <div className="w-48 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  catTotal > budget ? 'bg-red-500' : catTotal > budget * 0.8 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (catTotal / budget) * 100)}%` }}
              />
            </div>
          )}
          <span className={`text-gray-500 text-xs`}>{pct(catTotal, total)}% del total</span>
        </div>
      </button>

      <div className={`overflow-hidden transition-all duration-200 ${isOpen ? 'max-h-[3000px]' : 'max-h-0'}`}>
        <div className="divide-y divide-gray-200">
          {category.items.map((item) => (
            <div key={item.id} className={`flex items-start gap-2 justify-between px-4 py-2.5 hover:bg-white/50 transition group ${item.done ? 'opacity-60' : ''}`}>
              <input
                type="checkbox"
                checked={!!item.done}
                onChange={() => {
                  const updatedItems = category.items.map(i =>
                    i.id === item.id ? { ...i, done: !i.done } : i
                  );
                  onUpdate({ ...category, items: updatedItems });
                }}
                className="mt-0.5 w-4 h-4 rounded accent-green-500 cursor-pointer flex-shrink-0"
                title={item.done ? "Marcar como pendiente" : "Marcar como listo (no se copiará al mes siguiente)"}
                aria-label={item.done ? "Marcar como pendiente" : "Marcar como listo"}
              />
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1">
                  {item.locked && <span className="text-gray-400 text-xs">🔒</span>}
                  {item.alert && !item.locked && <span className="text-xs">⚠️</span>}
                  <span className={`text-sm text-gray-700 ${item.done ? 'line-through text-gray-400' : ''}`}>{item.name}</span>
                  {item.done && <span className="text-xs text-green-600 font-semibold bg-green-50 px-1.5 py-0.5 rounded-full">✓ Listo</span>}
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
                      onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
                      onBlur={() => commitEdit(item.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter")  commitEdit(item.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                    />
                    <button className="text-green-600 text-xs font-bold" onMouseDown={() => commitEdit(item.id)}>✓</button>
                  </div>
                ) : (
                  <>
                    <button
                      className="text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition cursor-pointer border border-blue-200"
                      onClick={() => startEdit(item.id, item.amount)}
                      title="Clic para editar monto"
                    >
                      {fmt(item.amount)}
                    </button>
                    {!item.locked && (
                      <button
                        onClick={() => toggleRecurring(item.id)}
                        className="text-gray-400 hover:text-teal-600 transition opacity-0 group-hover:opacity-100"
                        title="Gasto recurrente"
                        aria-label={item.recurring ? "Quitar recurrencia" : "Marcar como recurrente"}
                      >🔁</button>
                    )}
                    {!item.locked && (
                      <button
                        onClick={() => deleteItem(item.id)}
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
          ))}

          {/* Budget setting section */}
          {showBudgetEdit ? (
            <div className="px-4 py-3 bg-amber-50 border-t-2 border-amber-200 flex gap-2 items-center">
              <input
                autoFocus
                type="text"
                inputMode="numeric"
                placeholder="Presupuesto (dejar vacío para eliminar)"
                value={budgetValue}
                onChange={(e) => setBudgetValue(e.target.value.replace(/\D/g, ""))}
                className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                onKeyDown={(e) => {
                  if (e.key === "Enter") setBudget();
                  if (e.key === "Escape") {
                    setShowBudgetEdit(false);
                    setBudgetValue("");
                  }
                }}
              />
              <button
                onClick={setBudget}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition text-sm"
              >
                ✓
              </button>
              <button
                onClick={() => {
                  setShowBudgetEdit(false);
                  setBudgetValue("");
                }}
                className="border-2 border-gray-300 text-gray-600 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm"
              >
                ✕
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setShowBudgetEdit(true);
                setBudgetValue(budget ? String(budget) : "");
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
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-1 border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onKeyDown={(e) => { if (e.key === "Enter") addItem(); if (e.key === "Escape") setShowAddForm(false); }}
                />
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="Monto"
                  value={newItemAmount}
                  onChange={(e) => setNewItemAmount(e.target.value.replace(/\D/g, ""))}
                  className="w-28 border rounded px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                  onKeyDown={(e) => { if (e.key === "Enter") addItem(); if (e.key === "Escape") setShowAddForm(false); }}
                />
                <button
                  onClick={addItem}
                  className="bg-green-500 hover:bg-green-600 text-white font-bold px-3 py-1.5 rounded-lg transition text-sm"
                >
                  ✓
                </button>
                <button
                  onClick={() => { setShowAddForm(false); setNewItemName(""); setNewItemAmount(""); }}
                  className="border-2 border-gray-300 text-gray-600 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm"
                >
                  ✕
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
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
                onChange={(e) => setNoteValue(e.target.value)}
                onBlur={saveNote}
                placeholder="Agregar nota sobre esta categoría..."
                className="w-full border-2 border-amber-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none bg-white"
                rows="3"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={saveNote}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg transition text-sm"
                >
                  ✓ Guardar
                </button>
                <button
                  onClick={() => {
                    setShowNotes(false);
                    setNoteValue(category.note || "");
                  }}
                  className="border-2 border-gray-300 text-gray-600 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition text-sm"
                >
                  ✕ Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CategoryCard;
