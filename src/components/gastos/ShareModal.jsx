import React, { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../lib/firebase.js";
import { createWallet } from "../../lib/firestoreService.js";

const _googleProvider = new GoogleAuthProvider();

function ShareModal({ currentCategories, initialAuthUser, onClose, onShareComplete }) {
  const [step,       setStep]       = useState(initialAuthUser ? 'name' : 'auth');
  const [user,       setUser]       = useState(initialAuthUser);
  const [walletName, setWalletName] = useState('Mis gastos');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [code,       setCode]       = useState(null);
  const [copied,     setCopied]     = useState(false);

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, _googleProvider);
      if (result?.user) {
        setUser(result.user);
        setStep('name');
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('[ShareModal auth]', e.code, e.message, e);
      if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
        setError('No se pudo iniciar sesión. Revisá la consola (F12).');
      }
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!walletName.trim()) { setError('Poné un nombre para la cartera.'); return; }
    setLoading(true);
    setError('');
    try {
      const { walletId, code: newCode } = await createWallet(
        user,
        walletName.trim(),
        currentCategories
      );
      setCode(newCode);
      setStep('done');
      setTimeout(() => onShareComplete(walletId, user), 500);
    } catch (e) {
      setError('No se pudo crear la cartera. Intentá de nuevo.');
      if (import.meta.env.DEV) console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(code ?? '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

        {/* Header del modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔗</span>
            <h2 className="text-white font-bold text-base">Hacer cartera colaborativa</h2>
          </div>
          {step !== 'done' && (
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-300 text-xl leading-none transition"
            >×</button>
          )}
        </div>

        {/* ── Step: auth ── */}
        {step === 'auth' && (
          <div className="px-8 py-8">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🔐</div>
              <p className="text-white font-semibold text-sm">Necesitás una cuenta para compartir</p>
              <p className="text-slate-400 text-xs mt-1.5">
                Tus gastos actuales se van a subir a la cartera compartida
              </p>
            </div>

            {/* Preview de lo que se va a subir */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
                Se va a subir:
              </p>
              <div className="space-y-1">
                {currentCategories.slice(0, 4).map(cat => (
                  <div key={cat.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <span>{cat.icon}</span>
                    <span className="truncate">{cat.name}</span>
                    <span className="ml-auto text-slate-500 text-xs flex-shrink-0">
                      {cat.items?.length ?? 0} ítems
                    </span>
                  </div>
                ))}
                {currentCategories.length > 4 && (
                  <p className="text-slate-500 text-xs text-center pt-1">
                    + {currentCategories.length - 4} categorías más
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleGoogleAuth}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold text-sm px-6 py-3.5 rounded-2xl shadow-lg transition disabled:opacity-60"
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {loading ? 'Iniciando sesión…' : 'Continuar con Google'}
            </button>
            {error && <p className="text-red-400 text-xs text-center mt-3">{error}</p>}
          </div>
        )}

        {/* ── Step: nombrar cartera ── */}
        {step === 'name' && (
          <form onSubmit={handleCreate} className="px-8 py-8">
            {/* Usuario logueado */}
            {user && (
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 mb-6">
                {user.photoURL ? (
                  <img src={user.photoURL} alt="" aria-hidden="true" className="w-8 h-8 rounded-full" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                    {user.displayName?.[0]}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">{user.displayName}</p>
                  <p className="text-slate-400 text-xs truncate">{user.email}</p>
                </div>
                <span className="ml-auto text-emerald-400 text-xs flex-shrink-0">✓ Logueado</span>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-slate-300 text-xs font-semibold mb-2 uppercase tracking-wider">
                Nombre de la cartera
              </label>
              <input
                type="text"
                value={walletName}
                onChange={(e) => setWalletName(e.target.value)}
                placeholder='Ej: "Hogar 2026", "Gastos Jorge"'
                autoFocus
                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-blue-400 transition"
              />
              <p className="text-slate-500 text-xs mt-2">
                Tus {currentCategories.length} categorías y gastos actuales se van a subir a esta cartera
              </p>
            </div>

            {error && <p className="text-red-400 text-xs mb-4">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-500 hover:bg-blue-400 text-white font-bold py-3 rounded-xl shadow-lg transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando cartera…</>
              ) : '🚀 Crear y obtener código para compartir'}
            </button>
          </form>
        )}

        {/* ── Step: código creado ── */}
        {step === 'done' && (
          <div className="px-8 py-8 text-center">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-white font-bold text-lg mb-1">¡Cartera creada!</h3>
            <p className="text-slate-400 text-sm mb-6">
              Compartí este código con quien quieras invitar:
            </p>

            {/* Código grande */}
            <div className="bg-white/10 border border-white/20 rounded-2xl py-6 px-4 mb-4">
              <p className="text-4xl font-bold text-white tracking-[0.3em] font-mono">{code}</p>
            </div>

            <button
              onClick={copyCode}
              className="flex items-center gap-2 text-sm mx-auto mb-6 text-blue-400 hover:text-blue-300 transition"
            >
              {copied ? '✅ Código copiado' : '📋 Copiar código'}
            </button>

            <p className="text-slate-500 text-xs">
              La otra persona abre la app, clickea "Unirme con código" e ingresa este código.
              Desde ese momento ven y editan los mismos gastos en tiempo real.
            </p>

            <button
              onClick={onClose}
              className="mt-6 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-bold py-3 rounded-xl transition"
            >
              Entendido →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShareModal;
