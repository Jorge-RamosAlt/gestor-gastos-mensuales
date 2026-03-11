import React, { useState } from "react";
import { sanitizeName } from "../../lib/sanitize.js";
import { useToast } from "../../hooks/useToast.js";

const TEMPLATES_KEY = "gastos_templates_v1";

function loadTemplates() {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { /* ignore */ return []; }
}

function saveTemplates(templates) {
  try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)); }
  catch { /* ignore */ }
}

export default function TemplateModal({ categories, onApply, onClose }) {
  const toast = useToast();
  const [templates, setTemplates] = useState(loadTemplates);
  const [newName, setNewName] = useState("");

  const handleSave = () => {
    const name = sanitizeName(newName.trim());
    if (!name) return;
    // Save structure only: name, icon, color, headerColor, textColor, budget — no items or amounts
    const structure = categories.map(cat => ({
      id: `tpl_${cat.id}`,
      name: cat.name,
      icon: cat.icon,
      color: cat.color,
      headerColor: cat.headerColor,
      textColor: cat.textColor,
      budget: cat.budget || 0,
      locked: cat.locked || false,
      items: [],
    }));
    const tpl = { id: Date.now(), name, structure, createdAt: new Date().toISOString() };
    const updated = [...templates, tpl];
    setTemplates(updated);
    saveTemplates(updated);
    setNewName("");
    toast.success(`📋 Template "${name}" guardado`);
  };

  const handleApply = (tpl) => {
    if (window.confirm(`¿Aplicar el template "${tpl.name}"? Se reemplazarán las categorías actuales (los gastos se perderán).`)) {
      onApply(tpl.structure);
      toast.success(`✅ Template "${tpl.name}" aplicado`);
      onClose();
    }
  };

  const handleDelete = (id) => {
    const updated = templates.filter(t => t.id !== id);
    setTemplates(updated);
    saveTemplates(updated);
    toast.info("Template eliminado");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-5 border-b dark:border-slate-700 flex items-center justify-between">
          <h2 className="font-bold text-lg dark:text-white">📋 Templates de mes</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Save current as template */}
        <div className="p-4 border-b dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">Guardar la estructura actual ({categories.length} categorías) como template:</p>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nombre del template (ej: Mes típico)"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSave()}
              className="flex-1 border rounded-xl px-3 py-2 text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              maxLength={50}
            />
            <button
              onClick={handleSave}
              disabled={!newName.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white font-semibold px-4 py-2 rounded-xl text-sm transition"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* List of templates */}
        <div className="p-4 space-y-2">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No hay templates guardados todavía.</p>
          ) : (
            templates.map(tpl => (
              <div key={tpl.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm dark:text-white truncate">{tpl.name}</p>
                  <p className="text-xs text-gray-400">{tpl.structure.length} categorías · {new Date(tpl.createdAt).toLocaleDateString('es-AR')}</p>
                </div>
                <button
                  onClick={() => handleApply(tpl)}
                  className="bg-green-100 hover:bg-green-200 text-green-700 font-semibold px-3 py-1.5 rounded-lg text-xs transition"
                >
                  Aplicar
                </button>
                <button
                  onClick={() => handleDelete(tpl.id)}
                  className="text-red-400 hover:text-red-600 transition text-lg leading-none"
                >×</button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
