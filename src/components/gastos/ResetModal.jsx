import React from "react";

function ResetModal({ onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">🔄</div>
          <h2 className="text-lg font-bold text-gray-800">Resetear aplicación</h2>
          <p className="text-gray-500 text-sm mt-2">
            Esto borrará tu perfil (nombre y sueldos) y volverás a la pantalla de inicio.
            Los datos de gastos se restaurarán a los valores originales.
          </p>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onCancel}
            className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-xl transition text-sm"
          >
            Sí, resetear
          </button>
        </div>
      </div>
    </div>
  );
}

export default ResetModal;
