import React, { useState } from "react";

function SetupPage({ onComplete }) {
  const [name, setName]               = useState("");
  const [salaryActual, setSalaryActual] = useState("");
  const [salaryTarget, setSalaryTarget] = useState("");
  const [error, setError]             = useState("");

  const formatInput = (raw) =>
    raw.replace(/\D/g, "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const parseInput = (val) => parseInt(val.replace(/\./g, ""), 10);

  const handleSubmit = (e) => {
    e.preventDefault();
    const parsedActual = parseInput(salaryActual);
    const parsedTarget = parseInput(salaryTarget);

    if (!name.trim())                       { setError("Ingresá tu nombre."); return; }
    if (isNaN(parsedActual) || parsedActual <= 0) { setError("Ingresá un sueldo actual válido."); return; }
    if (isNaN(parsedTarget) || parsedTarget <= 0) { setError("Ingresá un sueldo objetivo válido."); return; }

    onComplete({
      name: name.trim(),
      salaryActual: parsedActual,
      salaryTarget: parsedTarget,
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-8 py-6 text-center text-white">
          <div className="text-5xl mb-2">📊</div>
          <h1 className="text-xl font-bold">Gestor de Gastos Mensuales</h1>
          <p className="text-slate-400 text-sm mt-1">Configurá tu perfil para comenzar</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-8 py-6 space-y-5">

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              👤 Tu nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Jorge Ramos"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              💰 Sueldo actual ($ ARS)
            </label>
            <p className="text-xs text-gray-400 mb-1">Lo que ganás hoy</p>
            <input
              type="text"
              inputMode="numeric"
              value={salaryActual}
              onChange={(e) => setSalaryActual(formatInput(e.target.value))}
              placeholder="Ej: 4.518.000"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              🎯 Sueldo al que apuntás ($ ARS)
            </label>
            <p className="text-xs text-gray-400 mb-1">El nuevo ingreso o el tope de gastos que querés alcanzar</p>
            <input
              type="text"
              inputMode="numeric"
              value={salaryTarget}
              onChange={(e) => setSalaryTarget(formatInput(e.target.value))}
              placeholder="Ej: 2.500.000"
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-400 transition"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">
              ⚠️ {error}
            </p>
          )}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white font-bold py-3 rounded-xl transition text-sm shadow-md"
          >
            Comenzar →
          </button>

          {/* Opción para volver al login con Google */}
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem('gastos_solo_mode');
                localStorage.removeItem('gastos_wallet_id');
                window.location.reload();
              }}
              className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition"
            >
              ¿Querés sincronizar con otros? Configurar cartera compartida
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SetupPage;
