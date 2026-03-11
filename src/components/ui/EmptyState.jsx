import React from "react";

export default function EmptyState({ icon = "📭", title, subtitle, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-6xl mb-4 select-none">{icon}</div>
      <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-2">{title}</h3>
      {subtitle && (
        <p className="text-sm text-gray-500 dark:text-slate-400 max-w-xs mb-6">{subtitle}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
