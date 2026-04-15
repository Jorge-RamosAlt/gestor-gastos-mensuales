import React, { useState } from "react";
import { sanitizeName, sanitizeNote } from "../../lib/sanitize.js";
import { parseAmount } from "../../lib/expenseParser.js";
import { useToast } from "../../hooks/useToast.js";
import CategoryHeader from "./CategoryHeader.jsx";
import CategoryItemRow from "./CategoryItemRow.jsx";
import AddItemForm from "./AddItemForm.jsx";

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

  const setBudget = () => {
    const val = parseAmount(budgetValue);
    if (!isNaN(val) && val >= 0) {
      const updatedCat = { ...category, budget: val };
      onUpdate(updatedCat);
      if (val > 0 && catTotal > val) {
        toast.warning(
          `⚠️ ${category.name} superó el presupuesto por ${(catTotal - val).toLocaleString("es-AR", { style: "currency", currency: "ARS" }).replace("ARS", "").trim()}`
        );
      }
      setShowBudgetEdit(false);
      setBudgetValue("");
    }
  };

  const startEdit = (itemId, currentAmount) => {
    setEditingId(itemId);
    setEditValue(currentAmount);
  };

  const commitEdit = (itemId) => {
    const parsed = parseAmount(editValue);
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
    const parsed = parseAmount(newItemAmount) || 0;
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

  const toggleDone = (itemId) => {
    const updatedItems = category.items.map(i =>
      i.id === itemId ? { ...i, done: !i.done } : i
    );
    onUpdate({ ...category, items: updatedItems });
  };

  const handleDeleteCategory = (categoryId) => {
    if (onDelete) {
      onDelete(categoryId);
      toast.info(`Categoría "${category.name}" eliminada`);
    }
  };

  return (
    <div
      className="rounded-xl border-2 overflow-hidden shadow-sm"
      style={{ backgroundColor: scheme.bg, borderColor: scheme.border }}
    >
      <CategoryHeader
        category={category}
        total={total}
        isOpen={isOpen}
        onToggleOpen={() => setIsOpen(!isOpen)}
        catTotal={catTotal}
        budget={budget}
        recurringCount={recurringCount}
        doneCount={doneCount}
        scheme={scheme}
        darkMode={darkMode}
        onDelete={onDelete ? handleDeleteCategory : null}
        onNoteToggle={() => setShowNotes(!showNotes)}
        showNotes={showNotes}
      />

      <div
        className={`overflow-hidden transition-all duration-200 ${
          isOpen ? "max-h-[3000px]" : "max-h-0"
        }`}
      >
        <div style={{ borderColor: scheme.divider }} className="divide-y">
          {category.items.map((item) => (
            <CategoryItemRow
              key={item.id}
              item={item}
              scheme={scheme}
              darkMode={darkMode}
              editingId={editingId}
              editValue={editValue}
              onStartEdit={startEdit}
              onCommitEdit={commitEdit}
              onSetEditValue={setEditValue}
              onToggleDone={() => toggleDone(item.id)}
              onToggleRecurring={toggleRecurring}
              onDelete={deleteItem}
            />
          ))}

          <AddItemForm
            showAddForm={showAddForm}
            newItemName={newItemName}
            newItemAmount={newItemAmount}
            onSetNewItemName={setNewItemName}
            onSetNewItemAmount={setNewItemAmount}
            onAddItem={addItem}
            onToggleAddForm={setShowAddForm}
            showBudgetEdit={showBudgetEdit}
            budgetValue={budgetValue}
            onSetBudgetValue={setBudgetValue}
            onSetBudget={setBudget}
            onToggleBudgetEdit={setShowBudgetEdit}
            budget={budget}
            showNotes={showNotes}
            noteValue={noteValue}
            onSetNoteValue={setNoteValue}
            onSaveNote={saveNote}
            onToggleNotes={setShowNotes}
          />
        </div>
      </div>
    </div>
  );
}

export default CategoryCard;
