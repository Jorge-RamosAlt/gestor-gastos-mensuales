import React from "react";
import { fmt, pct } from "../../lib/formatters.js";
import CategoryCard from "./CategoryCard.jsx";

function GastosTab({ categories, setCategories, total, TARGET }) {
  const gap = total - TARGET;

  const catTotal = (cat) => cat.items.reduce((s, i) => s + i.amount, 0);

  const handleCategoryUpdate = (updatedCat) => {
    setCategories(prev =>
      prev.map(cat => cat.id === updatedCat.id ? updatedCat : cat)
    );
  };

  const handleDeleteCategory = (catId) => {
    setCategories(prev => prev.filter(cat => cat.id !== catId));
  };

  return (
    <div className="space-y-3 pb-8">
      <p className="text-sm text-gray-500 mb-2">
        Hacé clic en cualquier monto para editarlo. Los ítems con 🔒 son inamovibles. Los cambios actualizan el total en tiempo real.
      </p>

      {categories.map((cat) => (
        <CategoryCard
          key={cat.id}
          category={cat}
          total={total}
          onUpdate={handleCategoryUpdate}
          onDelete={handleDeleteCategory}
        />
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
