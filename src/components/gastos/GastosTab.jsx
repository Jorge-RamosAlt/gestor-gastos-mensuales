import React, { useState } from "react";
import { fmt } from "../../lib/formatters.js";
import CategoryCard from "./CategoryCard.jsx";
import SearchBar from "./SearchBar.jsx";
import EmptyState from "../ui/EmptyState.jsx";

function GastosTab({ categories, setCategories, total, TARGET }) {
  const gap = total - TARGET;
  const [search, setSearch] = useState("");
  const [dragOverId, setDragOverId] = useState(null);
  const draggedId = React.useRef(null);

  const handleCategoryUpdate = (updatedCat) => {
    setCategories(prev =>
      prev.map(cat => cat.id === updatedCat.id ? updatedCat : cat)
    );
  };

  const handleDeleteCategory = (catId) => {
    setCategories(prev => prev.filter(cat => cat.id !== catId));
  };

  const overBudgetCats = categories.filter(cat => {
    if (!cat.budget || cat.budget <= 0) return false;
    const catTotal = cat.items.reduce((s, i) => s + i.amount, 0);
    return catTotal > cat.budget;
  });

  const searchLower = search.toLowerCase();
  const filteredCategories = search.trim()
    ? categories.filter(cat =>
        cat.items.some(item => item.name.toLowerCase().includes(searchLower))
      )
    : categories;

  const matchingCount = search.trim()
    ? categories.reduce((count, cat) =>
        count + cat.items.filter(item => item.name.toLowerCase().includes(searchLower)).length,
        0
      )
    : 0;

  return (
    <div className="space-y-3 pb-8">
      {overBudgetCats.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-xl p-3 mb-3 text-sm text-red-700">
          🚨 <strong>{overBudgetCats.length} categoría(s)</strong> superaron su presupuesto: {overBudgetCats.map(c => c.name).join(', ')}
        </div>
      )}
      <p className="text-sm text-gray-500 mb-2">
        Hacé clic en cualquier monto para editarlo. Los ítems con 🔒 son inamovibles. Los cambios actualizan el total en tiempo real.
      </p>

      <SearchBar value={search} onChange={setSearch} />

      {search && matchingCount > 0 && (
        <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
          🔍 {matchingCount} gasto{matchingCount !== 1 ? 's' : ''} encontrado{matchingCount !== 1 ? 's' : ''}
        </p>
      )}

      {filteredCategories.length === 0 && !search && (
        <EmptyState
          icon="💸"
          title="Sin categorías todavía"
          subtitle="Agregá tu primera categoría para empezar a registrar tus gastos del mes."
        />
      )}
      {filteredCategories.length === 0 && search && (
        <EmptyState
          icon="🔍"
          title="Sin resultados"
          subtitle={`No se encontraron gastos que coincidan con "${search}".`}
        />
      )}
      {filteredCategories.map((cat) => (
        <div
          key={cat.id}
          draggable
          onDragStart={() => { draggedId.current = cat.id; }}
          onDragOver={(e) => { e.preventDefault(); setDragOverId(cat.id); }}
          onDragLeave={() => setDragOverId(null)}
          onDrop={() => {
            if (!draggedId.current || draggedId.current === cat.id) {
              setDragOverId(null);
              return;
            }
            const from = categories.findIndex(c => c.id === draggedId.current);
            const to   = categories.findIndex(c => c.id === cat.id);
            if (from === -1 || to === -1) { setDragOverId(null); return; }
            const reordered = [...categories];
            const [moved] = reordered.splice(from, 1);
            reordered.splice(to, 0, moved);
            setCategories(reordered);
            draggedId.current = null;
            setDragOverId(null);
          }}
          className={`transition-all duration-150 ${dragOverId === cat.id ? 'ring-2 ring-blue-400 ring-offset-1 rounded-xl scale-[1.01]' : ''}`}
        >
          <div className="flex items-center gap-1">
            <span className="text-gray-300 text-lg cursor-grab select-none px-1 opacity-0 hover:opacity-100 transition" title="Arrastrar para reordenar">⠿</span>
            <div className="flex-1">
              <CategoryCard
                category={cat}
                total={total}
                onUpdate={handleCategoryUpdate}
                onDelete={handleDeleteCategory}
              />
            </div>
          </div>
        </div>
      ))}

      {/* Resumen total */}
      <div className={`rounded-xl p-4 border-2 shadow-md ${gap > 0 ? "bg-red-50 border-red-400" : "bg-green-50 border-green-400"}`}>
        <div className="flex justify-between items-center">
          <span className="font-bold text-lg text-gray-700">TOTAL GASTOS</span>
          <span className={`font-bold text-xl ${gap > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(total)}</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm text-gray-500">Target mensual</span>
          <span className="text-sm font-semibold text-blue-600">{fmt(TARGET)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">{gap > 0 ? "Te excedés en" : "Margen disponible"}</span>
          <span className={`text-sm font-bold ${gap > 0 ? "text-red-600" : "text-green-600"}`}>{fmt(Math.abs(gap))}</span>
        </div>
      </div>
    </div>
  );
}

export default GastosTab;
