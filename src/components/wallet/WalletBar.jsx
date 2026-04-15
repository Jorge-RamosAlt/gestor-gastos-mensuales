import React, { useState } from "react";
import { useToast } from "../../hooks/useToast.js";

function WalletBar({ walletData, authUser, onLeave, onChangeWallet }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);
  const members = Object.entries(walletData?.members ?? {});

  const copyCode = () => {
    navigator.clipboard?.writeText(walletData.code ?? '').catch(() => {});
    setCopied(true);
    toast.success('Código copiado al portapapeles');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 mb-4 flex-wrap" role="navigation" aria-label="Cartera activa">
      {/* Nombre + código */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <span className="text-base">💼</span>
        <span className="text-white text-sm font-semibold truncate">{walletData.name}</span>
        <button
          onClick={copyCode}
          title="Copiar código de sala"
          className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-xs text-slate-300 hover:text-white px-2 py-0.5 rounded-lg transition font-mono tracking-wider"
        >
          {copied ? '✅ Copiado' : `🔑 ${walletData.code}`}
        </button>
      </div>

      {/* Avatares de miembros */}
      <div className="flex items-center gap-1">
        {members.slice(0, 5).map(([uid, m]) => (
          <div key={uid} title={m.name} className="relative group">
            {m.photo ? (
              <img
                src={m.photo}
                alt=""
                aria-hidden="true"
                className={`w-7 h-7 rounded-full border-2 object-cover transition ${
                  authUser?.uid === uid ? 'border-emerald-400' : 'border-white/30'
                }`}
              />
            ) : (
              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold text-white transition ${
                authUser?.uid === uid ? 'bg-emerald-500 border-emerald-400' : 'bg-blue-500 border-white/30'
              }`}>
                {m.name?.[0] ?? '?'}
              </div>
            )}
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 bg-slate-900 text-white text-xs rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition pointer-events-none z-10">
              {m.name}{authUser?.uid === uid ? ' (vos)' : ''}
            </div>
          </div>
        ))}
        {members.length > 5 && (
          <div className="w-7 h-7 rounded-full bg-white/10 border-2 border-white/20 flex items-center justify-center text-xs text-slate-400">
            +{members.length - 5}
          </div>
        )}
      </div>

      {/* Botón cambiar cartera */}
      {onChangeWallet && (
        <button
          onClick={onChangeWallet}
          className="text-xs text-slate-400 hover:text-blue-300 transition"
          title="Cambiar de cartera"
        >
          Cambiar
        </button>
      )}

      {/* Botón salir de sesión */}
      {onLeave && (
        <button
          onClick={onLeave}
          className="text-xs text-slate-400 hover:text-red-400 transition ml-1"
          title="Cerrar sesión"
        >
          Salir
        </button>
      )}
    </div>
  );
}

export default WalletBar;
