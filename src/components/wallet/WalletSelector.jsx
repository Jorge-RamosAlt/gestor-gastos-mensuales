/**
 * WalletSelector.jsx
 *
 * Pantalla que aparece después del login cuando el usuario no tiene
 * una cartera activa en la sesión actual. Muestra:
 *   · Lista de carteras del usuario (de Firestore users/{uid})
 *   · Formulario para crear una nueva cartera
 *   · Formulario para unirse con código
 *   · Botón de cerrar sesión
 */
import { useState } from 'react';
import { signOut }  from 'firebase/auth';
import { auth }     from '../../lib/firebase';
import { createWallet, joinWallet, clearLocalWalletId } from '../../lib/firestoreService';

export default function WalletSelector({
  user,
  userWallets,          // [{ walletId, name }]
  initialCategories,
  onWalletReady,        // (walletId) → void
}) {
  const [tab,        setTab]      = useState(userWallets.length > 0 ? 'list' : 'create');
  const [walletName, setWalletName] = useState('');
  const [joinCode,   setJoinCode]   = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [createdCode, setCreatedCode] = useState(null);

  // ── Cerrar sesión ────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    // Limpiamos localStorage primero para que la app no recuerde nada
    clearLocalWalletId();
    localStorage.removeItem('gastos_solo_mode');
    localStorage.removeItem('gastos_perfil_v1');
    localStorage.removeItem('gastos_historial_v1');
    await signOut(auth);
    // onAuthStateChanged en App.jsx redirige automáticamente al login
  };

  // ── Crear cartera ────────────────────────────────────────────────────────────
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!walletName.trim()) { setError('Poné un nombre para la cartera.'); return; }
    setLoading(true); setError('');
    try {
      const { walletId, code } = await createWallet(user, walletName.trim(), initialCategories);
      setCreatedCode(code);
      setTimeout(() => onWalletReady(walletId), 2500);
    } catch {
      setError('No se pudo crear la cartera. Intentá de nuevo.');
    } finally { setLoading(false); }
  };

  // ── Unirse a cartera ────────────────────────────────────────────────────────
  const handleJoin = async (e) => {
    e.preventDefault();
    if (joinCode.trim().length < 4) { setError('Ingresá el código de sala.'); return; }
    setLoading(true); setError('');
    try {
      const walletId = await joinWallet(user, joinCode.trim());
      onWalletReady(walletId);
    } catch (err) {
      setError(err.message || 'No se pudo unir a la cartera.');
    } finally { setLoading(false); }
  };

  // ── Pantalla de código creado ────────────────────────────────────────────────
  if (createdCode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 w-full max-w-sm text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-xl font-bold text-white mb-2">¡Cartera creada!</h2>
          <p className="text-slate-400 text-sm mb-6">Compartí este código para invitar a otros:</p>
          <div className="bg-white/10 border border-white/20 rounded-2xl py-5 px-4 mb-4">
            <p className="text-4xl font-bold text-white tracking-widest font-mono">{createdCode}</p>
          </div>
          <button onClick={() => navigator.clipboard?.writeText(createdCode).catch(() => {})}
            className="text-sm text-blue-400 hover:text-blue-300 underline underline-offset-2 transition mb-6">
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

  const tabs = [
    ...(userWallets.length > 0 ? [{ id: 'list', label: '💼 Mis carteras' }] : []),
    { id: 'create', label: '✨ Crear nueva' },
    { id: 'join',   label: '🔑 Unirme' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 flex items-center justify-center p-4">

      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header: usuario + cerrar sesión */}
        <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b border-white/10">
          {user.photoURL
            ? <img src={user.photoURL} alt="" aria-hidden="true" className="w-10 h-10 rounded-full border-2 border-white/20 flex-shrink-0" />
            : <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                {user.displayName?.[0]?.toUpperCase() ?? '?'}
              </div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-semibold truncate">{user.displayName ?? 'Usuario'}</p>
            <p className="text-slate-400 text-xs truncate">{user.email}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex-shrink-0 text-slate-500 hover:text-red-400 text-xs font-medium px-3 py-1.5 rounded-lg border border-white/10 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Título */}
        <div className="px-8 pt-6 pb-4 text-center">
          <h2 className="text-xl font-bold text-white">Seleccioná una cartera</h2>
          <p className="text-slate-400 text-sm mt-1">
            {userWallets.length > 0 ? 'Elegí una de tus carteras o creá una nueva' : 'Creá tu primera cartera o unite con un código'}
          </p>
        </div>

        {/* Tabs */}
        <div className={`flex mx-8 mb-5 bg-white/5 rounded-2xl p-1 gap-1`}>
          {tabs.map(({ id, label }) => (
            <button key={id} onClick={() => { setTab(id); setError(''); }}
              className={`flex-1 text-xs font-semibold py-2 rounded-xl transition-all ${
                tab === id ? 'bg-white text-gray-800 shadow-sm' : 'text-slate-400 hover:text-slate-200'
              }`}>
              {label}
            </button>
          ))}
        </div>

        <div className="px-8 pb-8">

          {/* ── Tab: Mis carteras ─────────────────────────────────────── */}
          {tab === 'list' && (
            <div className="space-y-2">
              {userWallets.map((w) => (
                <button
                  key={w.walletId}
                  onClick={() => onWalletReady(w.walletId)}
                  className="
                    w-full flex items-center gap-3 text-left
                    bg-white/5 hover:bg-white/10 active:bg-white/15
                    border border-white/10 hover:border-white/20
                    rounded-2xl px-5 py-4 transition-all duration-150
                    group
                  "
                >
                  <span className="text-2xl">💼</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{w.name}</p>
                    <p className="text-slate-500 text-xs mt-0.5">Tus gastos sincronizados</p>
                  </div>
                  <span className="text-slate-600 group-hover:text-slate-300 transition text-lg">→</span>
                </button>
              ))}
            </div>
          )}

          {/* ── Tab: Crear nueva ──────────────────────────────────────── */}
          {tab === 'create' && (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">
                  Nombre de la cartera
                </label>
                <input
                  type="text"
                  value={walletName}
                  onChange={(e) => { setWalletName(e.target.value); setError(''); }}
                  placeholder='Ej: "Peralta Ramos", "Personal"'
                  maxLength={60}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-400 transition"
                />
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando…</>
                  : '✨ Crear cartera'}
              </button>
            </form>
          )}

          {/* ── Tab: Unirse con código ────────────────────────────────── */}
          {tab === 'join' && (
            <form onSubmit={handleJoin} className="space-y-4">
              <div>
                <label className="block text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">
                  Código de sala
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="Ej: GLSQ9N"
                  maxLength={8}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm text-center font-mono tracking-widest uppercase placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-sans focus:outline-none focus:border-emerald-400 transition"
                />
                <p className="text-slate-500 text-xs mt-1.5">Pedile el código al dueño de la cartera</p>
              </div>
              {error && <p className="text-red-400 text-xs">{error}</p>}
              <button type="submit" disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading
                  ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Uniéndome…</>
                  : '🔑 Unirme a la cartera'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
}
