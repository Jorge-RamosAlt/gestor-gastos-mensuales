import React, { useState } from "react";
import { fmt, pct } from "../../lib/formatters.js";
import { sanitizeName, sanitizeNote } from "../../lib/sanitize.js";
import { useToast } from "../../hooks/useToast.js";

function CategoryCard({ category, total, onUpdate, onDelete, darkMode }) {
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
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

  // Mapa de clases Tailwind → valores CSS reales (evita que Tailwind purgue clases dinámicas)
  const COLOR_MAP = {
    violet:  { bg: '#f5f3ff', border: '#c4b5fd', header: '#ede9fe', text: '#5b21b6', itemHover: 'rgba(237,233,254,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    cyan:    { bg: '#ecfeff', border: '#67e8f9', header: '#cffafe', text: '#155e75', itemHover: 'rgba(207,250,254,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    orange:  { bg: '#fff7ed', border: '#fdba74', header: '#ffedd5', text: '#9a3412', itemHover: 'rgba(255,237,213,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    pink:    { bg: '#fdf2f8', border: '#f9a8d4', header: '#fce7f3', text: '#9d174d', itemHover: 'rgba(252,231,243,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    teal:    { bg: '#f0fdfa', border: '#5eead4', header: '#ccfbf1', text: '#115e59', itemHover: 'rgba(204,251,241,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    blue:    { bg: '#eff6ff', border: '#93c5fd', header: '#dbeafe', text: '#1e40af', itemHover: 'rgba(219,234,254,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    green:   { bg: '#f0fdf4', border: '#86efac', header: '#dcfce7', text: '#166534', itemHover: 'rgba(220,252,231,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    yellow:  { bg: '#fefce8', border: '#fde047', header: '#fef9c3', text: '#854d0e', itemHover: 'rgba(254,249,195,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    purple:  { bg: '#faf5ff', border: '#d8b4fe', header: '#f3e8ff', text: '#6b21a8', itemHover: 'rgba(243,232,255,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    red:     { bg: '#fff1f2', border: '#fda4af', header: '#ffe4e6', text: '#9f1239', itemHover: 'rgba(255,228,230,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    indigo:  { bg: '#eef2ff', border: '#a5b4fc', header: '#e0e7ff', text: '#3730a3', itemHover: 'rgba(224,231,255,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    rose:    { bg: '#fff1f2', border: '#fda4af', header: '#ffe4e6', text: '#be123c', itemHover: 'rgba(255,228,230,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    lime:    { bg: '#f7fee7', border: '#bef264', header: '#ecfccb', text: '#3f6212', itemHover: 'rgba(236,252,203,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    emerald: { bg: '#ecfdf5', border: '#6ee7b7', header: '#d1fae5', text: '#065f46', itemHover: 'rgba(209,250,229,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    sky:     { bg: '#f0f9ff', border: '#7dd3fc', header: '#e0f2fe', text: '#0c4a6e', itemHover: 'rgba(224,242,254,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    amber:   { bg: '#fffbeb', border: '#fcd34d', header: '#fef3c7', text: '#92400e', itemHover: 'rgba(254,243,199,0.5)', itemText: '#374151', divider: '#e5e7eb' },
    gray:    { bg: '#f9fafb', border: '#d1d5db', header: '#f3f4f6', text: '#1f2937', itemHover: 'rgba(243,244,246,0.5)', itemText: '#374151', divider: '#e5e7eb' },
  };

  // Variantes oscuras para modo oscuro
  const COLOR_MAP_DARK = {
    violet:  { bg: '#1e1b3a', border: '#7c3aed', header: '#2d2a50', text: '#c4b5fd', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#3b3855' },
    cyan:    { bg: '#0c2830', border: '#06b6d4', header: '#163840', text: '#67e8f9', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#1e3840' },
    orange:  { bg: '#2a1a0e', border: '#f97316', header: '#3a2818', text: '#fdba74', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#3a2818' },
    pink:    { bg: '#2a1020', border: '#ec4899', header: '#3a2030', text: '#f9a8d4', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#3a2030' },
    teal:    { bg: '#0a2824', border: '#14b8a6', header: '#183830', text: '#5eead4', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#1e3830' },
    blue:    { bg: '#0f1d38', border: '#3b82f6', header: '#1a2d48', text: '#93c5fd', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#1f2d48' },
    green:   { bg: '#0e2818', border: '#22c55e', header: '#1a3828', text: '#86efac', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#1a3828' },
    yellow:  { bg: '#28220a', border: '#eab308', header: '#38320a', text: '#fde047', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#38321a' },
    purple:  { bg: '#1e1030', border: '#a855f7', header: '#2e2040', text: '#d8b4fe', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#2e2040' },
    red:     { bg: '#2a0e14', border: '#ef4444', header: '#3a1e24', text: '#fca5a5', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#3a1e24' },
    indigo:  { bg: '#111830', border: '#6366f1', header: '#1e2840', text: '#a5b4fc', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#1e2840' },
    rose:    { bg: '#2a0f18', border: '#f43f5e', header: '#3a1f28', text: '#fda4af', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#3a1f28' },
    lime:    { bg: '#162208', border: '#84cc16', header: '#243218', text: '#bef264', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#243218' },
    emerald: { bg: '#0a2a1e', border: '#10b981', header: '#183a2e', text: '#6ee7b7', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#183a2e' },
    sky:     { bg: '#0c1e2a', border: '#0ea5e9', header: '#1a2e3a', text: '#7dd3fc', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#1a2e3a' },
    amber:   { bg: '#281e08', border: '#f59e0b', header: '#382e18', text: '#fcd34d', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#382e18' },
    gray:    { bg: '#1e2228', border: '#6b7280', header: '#2e3238', text: '#d1d5db', itemHover: 'rgba(255,255,255,0.05)', itemText: '#e2e8f0', divider: '#2e3238' },
  };

  // Detecta el color base del nombre de clase de Tailwind almacenado
  const detectScheme = (isDark) => {
    const map = isDark ? COLOR_MAP_DARK : COLOR_MAP;
    const stored = category.color || '';
    for (const key of Object.keys(map)) {
      if (stored.includes(key)) return map[key];
    }
    // Fallback determinístico por ID para que cada categoría tenga un color consistente
    const keys = Object.keys(map);
    const idx = category.id ? category.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % keys.length : 0;
    return map[keys[idx]];
  };
  const scheme = detectScheme(darkMode);
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
    <div className="rounded-xl border-2 overflow-hidden shadow-sm" style={{ backgroundColor: scheme.bg, borderColor: scheme.border }}>
      <button
        className="group w-full flex items-center justify-between px-4 py-3 hover:brightness-95 transition"
        style={{ backgroundColor: scheme.header }}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-label={isOpen ? "Colapsar categoría" : "Expandir categoría"}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.icon}</span>
          <div className="text-left">
            <span className="font-semibold text-sm" style={{ color: scheme.text }}>{category.name}</span>
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
            {budget > 0 ? (
              <div className="text-xs font-bold" style={{ color: scheme.text }}>
                {fmt(catTotal)} <span className="font-normal opacity-70">/ {fmt(budget)}</span>
              </div>
            ) : (
              <span className="text-sm font-bold" style={{ color: scheme.text }}>{fmt(catTotal)}</span>
            )}
            {overBudget && (
              <span className="text-xs font-bold text-red-600">🚨 +{fmt(overAmount)}</span>
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
        <div style={{ borderColor: scheme.divider }} className="divide-y">
          {category.items.map((item) => (
            <div key={item.id} className={`flex items-start gap-2 justify-between px-4 py-2.5 transition group ${item.done ? 'opacity-60' : ''}`} style={{ '--hover-bg': scheme.itemHover }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = scheme.itemHover; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; }}
            >
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
                  <span className={`text-sm ${item.done ? 'line-through' : ''}`} style={{ color: item.done ? (darkMode ? '#94a3b8' : '#9ca3af') : scheme.itemText }}>{item.name}</span>
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
