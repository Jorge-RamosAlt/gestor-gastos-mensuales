/**
 * WalletPage.jsx — crear una cartera nueva o unirse a una existente.
 * Funciona con usuarios anónimos (signInAnonymously) y Google.
 * Se muestra cuando el usuario no tiene cartera asignada.
 */
import { useState } from 'react';
import { createWallet, joinWallet } from '../lib/firestoreService';

export default function WalletPage({ user, initialCategories, onWalletReady, onSoloMode }) {
  const [tab,          setTab]       = useState('create'); // 'create' | 'join'
  const [walletName,   setWalletName] = useState('');
  const [joinCode,     setJoinCode]   = useState('');
  const [loading,      setLoading]    = useState(false);
  const [error,        setError]      = useState('');
  const [createdCode,  setCreatedCode] = useState(null); // código mostrado tras crear

  // ── Crear cartera ───────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!walletName.trim()) { setError('Poné un nombre para la cartera.'); return; }
    setLoading(true);
    setError('');
    try {
      const { walletId, code } = await createWallet(
        user,
        walletName.trim(),
        initialCategories
      );
      setCreatedCode(code);
      setTimeout(() => onWalletReady(walletId), 2500);
    } catch (e) {
      setError('No se pudo crear la cartera. Intentá de nuevo.');
      if (import.meta.env.DEV) console.error('[WalletPage/create]', e);
    } finally {
      setLoading(false);
    }
  };

  // ── Unirse a cartera ────────────────────────────────────────────────────────
  const handleJoin = async (e) => {
    e.preventDefault();
    if (joinCode.trim().length < 4) { setError('Ingresá el código de sala.'); return; }
    setLoading(true);
    setError('');
    try {
      const walletId = await joinWallet(user, joinCode.trim());
      onWalletReady(walletId);
    } catch (e) {
      setError(e.message || 'No se pudo unir a la cartera.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(createdCode).catch(() => {});
  };

  // ── Pantalla de código creado ────────────────────────────────────────────────
  if (createdCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-white mb-2">¡Cartera creada!</h2>
          <p className="text-slate-400 text-sm mb-6">
            Compartí este código con las personas que quieras invitar:
          </p>

          {/* Código grande */}
          <div className="bg-white/10 border border-white/20 rounded-2xl py-5 px-4 mb-4">
            <p className="text-4xl font-bold text-white tracking-widest font-mono">
              {createdCode}
            </p>
          </div>

          <button
            onClick={copyCode}
            className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition mb-6"
          >
            Copiar código
          </button>

          <div className="flex items-center gap-2 justify-center text-slate-400 text-xs">
            <span className="w-4 h-4 border-2 border-slate-500 border-t-emerald-400 rounded-full animate-spin" />
            Entrando a la cartera…
          </div>
        </div>
      </div>
    );
  }

  // ── Datos del usuario para el header ────────────────────────────────────────
  const isAnonymous = user?.isAnonymous !== false;
  const displayName = user?.displayName;
  const photoURL    = user?.photoURL;
  const email       = user?.email;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header: solo para usuarios de Google con datos reales */}
        {!isAnonymous && (displayName || email) && (
          <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/10">
            {photoURL ? (
              <img src={photoURL} alt="" className="w-9 h-9 rounded-full border-2 border-white/20" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                {displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              {displayName && <p className="text-white text-sm font-medium truncate">{displayName}</p>}
              {email       && <p className="text-slate-400 text-xs truncate">{email}</p>}
            </div>
          </div>
        )}

        {/* Título */}
        <div className="px-8 pt-8 pb-4 text-center">
          <div className="text-5xl mb-3">💼</div>
          <h2 className="text-xl font-bold text-white">Tu cartera de gastos</h2>
          <p className="text-slate-400 text-sm mt-1">
            Creá una nueva o unite a la de alguien más con un código
          </p>
        </div>

        {/* Tabs */}
        <div className="flex mx-8 mb-6 bg-white/5 rounded-2xl p-1 gap-1">
          {[
            { id: 'create', label: '✨ Crear nueva' },
            { id: 'join',   label: '🔑 Unirme con código' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setError(''); }}
              className={`
                flex-1 text-sm font-semibold py-2 rounded-xl transition-all
                ${tab === id
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'}
              `}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Formulario */}
        <div className="px-8 pb-6">

          {tab === 'create' ? (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">
                  Nombre de la cartera
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => setWalletName(e.target.value)}
                  placeholder='Ej: "Hogar", "Gastos Jorge", "Casa 2026"'
                  className="
                    w-full bg-white/10 border border-white/20 rounded-xl
                    px-4 py-3 text-white text-sm
                    placeholder:text-slate-500
                    focus:outline-none focus:border-blue-400
                    transition
                  "
                />
                <p className="text-slate-500 text-xs mt-1.5">
                  Podés invitar a otros después con el código que te daremos
                </p>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full bg-blue-500 hover:bg-blue-400 active:bg-blue-600
                  text-white font-bold py-3 rounded-xl
                  shadow-lg hover:shadow-blue-500/30
                  transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando…</>
                ) : '✨ Crear cartera'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">
                  Código de sala
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Ej: CASA26"
                  maxLength={8}
                  className="
                    w-full bg-white/10 border border-white/20 rounded-xl
                    px-4 py-3 text-white text-sm text-center font-mono
                    tracking-widest uppercase
                    placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans
                    focus:outline-none focus:border-emerald-400
                    transition
                  "
                />
                <p className="text-slate-500 text-xs mt-1.5">
                  Pedile el código al dueño de la cartera
                </p>
              </div>

              {error && <p className="text-red-400 text-xs">{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="
                  w-full bg-emerald-500 hover:bg-emerald-400 active:bg-emerald-600
                  text-white font-bold py-3 rounded-xl
                  shadow-lg hover:shadow-emerald-500/30
                  transition-all duration-200
                  disabled:opacity-60 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2
                "
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uniéndome…</>
                ) : '🔑 Unirme a la cartera'}
              </button>
            </form>
          )}
        </div>

        {/* Separador + opción sin sync */}
        {onSoloMode && (
          <div className="px-8 pb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-slate-600 text-xs">o</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>
            <button
              onClick={onSoloMode}
              className="
                w-full text-slate-400 hover:text-slate-200
                text-sm py-2.5 rounded-xl
                border border-white/10 hover:border-white/20
                hover:bg-white/5
                transition-all duration-200
              "
            >
              Usar sin sincronización (solo este dispositivo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
