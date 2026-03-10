import React, { useState } from "react";
import { fmt, pct } from "../../lib/formatters.js";

function CategoryCard({ category, total, onUpdate, onDelete }) {
  const [isOpen, setIsOpen] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemAmount, setNewItemAmount] = useState("");

  const catTotal = category.items.reduce((s, i) => s + i.amount, 0);

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
  };

  const addItem = () => {
    if (!newItemName.trim()) return;
    const parsed = parseInt(newItemAmount.replace(/\D/g, ""), 10) || 0;
    const newItem = {
      id: `item_${Date.now()}`,
      name: newItemName.trim(),
      amount: parsed,
      locked: false,
    };
    const updatedItems = [...category.items, newItem];
    onUpdate({ ...category, items: updatedItems });
    setNewItemName("");
    setNewItemAmount("");
    setShowAddForm(false);
  };

  return (
    <div className={`rounded-xl border-2 overflow-hidden shadow-sm ${category.color}`}>
      <button
        className={`w-full flex items-center justify-between px-4 py-3 ${category.headerColor} hover:brightness-95 transition`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{category.icon}</span>
          <span className={`font-semibold text-sm ${category.textColor}`}>{category.name}</span>
          {category.locked && <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">FIJO</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-bold text-sm ${category.textColor}`}>{fmt(catTotal)}</span>
          <span className="text-gray-400 text-xs">{pct(catTotal, total)}% del total</span>
          <span className="text-gray-500">{isOpen ? "▲" : "▼"}</span>
        </div>
      </button>

      {isOpen && (
        <div className="divide-y divide-gray-200">
          {category.items.map((item) => (
            <div key={item.id} className="flex items-start justify-between px-4 py-2.5 hover:bg-white/50 transition group">
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1">
                  {item.locked && <span className="text-gray-400 text-xs">🔒</span>}
                  {item.alert && !item.locked && <span className="text-xs">⚠️</span>}
                  <span className="text-sm text-gray-700">{item.name}</span>
                </div>
                {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {item.locked ? (
                  <span className="text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-lg">
                    {fmt(item.amount)}
                  </span>
                ) : editingId === item.id ? (
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
                      title="Clic para editar"
                    >
                      {fmt(item.amount)}
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="text-gray-400 hover:text-red-500 transition text-lg leading-none opacity-0 group-hover:opacity-100"
                      title="Eliminar"
                    >
                      ×
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}

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
        </div>
      )}
    </div>
  );
}

export default CategoryCard;
