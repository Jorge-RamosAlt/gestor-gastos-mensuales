import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { extractFromFile, isFileSupported, SUPPORTED_EXTENSIONS } from "./lib/fileExtractors.js";
import { parseExpenses } from "./lib/expenseParser.js";
import { onAuthStateChanged, signOut, GoogleAuthProvider, signInWithPopup, updateProfile } from "firebase/auth";
import { auth } from "./lib/firebase.js";
import {
  getLocalWalletId, clearLocalWalletId, setLocalWalletId,
  getSoloMode, setSoloMode,
  saveCategories,
  subscribeToCategories, subscribeToWallet,
  leaveWallet, createWallet,
  getUserWallets, registerWalletForUser,
  saveUserProfile, getUserProfile,
} from "./lib/firestoreService.js";
import AuthPage       from "./components/AuthPage.jsx";
import WalletPage     from "./components/WalletPage.jsx";
import WalletSelector from "./components/WalletSelector.jsx";

// ── Storage keys ──
const PROFILE_KEY   = "gastos_perfil_v1";
const HISTORY_KEY   = "gastos_historial_v1";

// ── Calendar helpers ──
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function monthLabel(month, year) { return `${MESES[month]} ${year}`; }

function loadHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveHistory(entries) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(entries)); }
  catch (e) { console.warn("No se pudo guardar el historial:", e); }
}

// ── Formatters ──
const fmt = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const pct = (part, total) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

const getCurrentMonthLabel = () => {
  const now = new Date();
  return now.toLocaleString("es-AR", { month: "long", year: "numeric" });
};

// ── Initial expense data ──
const INITIAL_CATEGORIES = [];

const RECOMMENDATIONS = [];

// ── Icons ──
function IconExpand() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/>
      <path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
    </svg>
  );
}
function IconCompress() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3v3a2 2 0 0 1-2 2H3"/><path d="M21 8h-3a2 2 0 0 1-2-2V3"/>
      <path d="M3 16h3a2 2 0 0 1 2 2v3"/><path d="M16 21v-3a2 2 0 0 1 2-2h3"/>
    </svg>
  );
}

// ─────────────────────────────────────────────
// SETUP PAGE — aparece la primera vez o al resetear
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// RESET MODAL
// ─────────────────────────────────────────────
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

// ─────────────────────────────────────────────
// SHARE MODAL — compartir cartera existente
// ─────────────────────────────────────────────
const _googleProvider = new GoogleAuthProvider();

function ShareModal({ currentCategories, initialAuthUser, onClose, onShareComplete }) {
  const [step,       setStep]       = useState(initialAuthUser ? 'name' : 'auth');
  const [user,       setUser]       = useState(initialAuthUser);
  const [walletName, setWalletName] = useState('Mis gastos');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [code,       setCode]       = useState(null);
  const [copied,     setCopied]     = useState(false);

  // ── Paso 1: auth con Google (popup) ─────────────────────────────────────
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

  // ── Paso 2: crear cartera con datos actuales ─────────────────────────────
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
      // Avisar al App que la cartera fue creada (con delay para que lea el código)
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
                  <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full" />
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

// ─────────────────────────────────────────────
// WALLET BAR — barra de cartera colaborativa
// ─────────────────────────────────────────────
function WalletBar({ walletData, authUser, onLeave, onChangeWallet }) {
  const [copied, setCopied] = useState(false);
  const members = Object.entries(walletData?.members ?? {});

  const copyCode = () => {
    navigator.clipboard?.writeText(walletData.code ?? '').catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center gap-3 bg-white/8 border border-white/15 rounded-xl px-4 py-2.5 mb-4 flex-wrap">
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
                alt={m.name}
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

// ─────────────────────────────────────────────
// MAIN APP — recibe perfil como prop
// ─────────────────────────────────────────────
function GastosApp({ profile, onReset, categories, setCategories, walletData, authUser, onLeaveWallet, onChangeWallet, onShareRequest }) {
  const TARGET        = profile.salaryTarget;
  const SALARY_ACTUAL = profile.salaryActual;
  const SALARY_NUEVO  = profile.salaryTarget;

  // categories y setCategories vienen de App (con sync a Firestore si corresponde)
  const [editingId, setEditingId]           = useState(null);
  const [editValue, setEditValue]           = useState("");
  const [activeTab, setActiveTab]           = useState("gastos");
  const [openCategories, setOpenCategories] = useState(
    Object.fromEntries((categories ?? []).map((c) => [c.id, true]))
  );
  const [isFullscreen, setIsFullscreen]     = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [importSuccess, setImportSuccess]   = useState(null); // { count, catName }

  // ── Cuando llegan categorías de Firestore, abrir las nuevas automáticamente ──
  useEffect(() => {
    if (!categories?.length) return;
    setOpenCategories(prev => {
      let changed = false;
      const next = { ...prev };
      categories.forEach(c => {
        if (!(c.id in next)) { next[c.id] = true; changed = true; }
      });
      return changed ? next : prev;
    });
  }, [categories]);

  // ── Import handler: creates a new category with imported items ──
  const handleImport = useCallback((items, sourceFilename) => {
    const catId  = `importados_${Date.now()}`;
    const catName = sourceFilename.length > 30 ? sourceFilename.slice(0, 27) + '…' : sourceFilename;
    const newCat = {
      id: catId,
      name: `📥 ${catName}`,
      icon: "📥",
      locked: false,
      color: "bg-teal-50 border-teal-300",
      headerColor: "bg-teal-100",
      textColor: "text-teal-800",
      items: items.map(item => ({
        id: item.id,
        name: item.description,
        amount: item.amount,
        locked: false,
        note: item.date ? `Fecha: ${item.date}` : undefined,
      })),
    };
    setCategories(prev => [...prev, newCat]);
    setOpenCategories(prev => ({ ...prev, [catId]: true }));
    setImportSuccess({ count: items.length, catName: newCat.name });
    setActiveTab("gastos");
  }, []);

  // ── Fullscreen ──
  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  // ── Totals ──
  const total = useMemo(() => {
    let sum = 0;
    for (const cat of categories) {
      for (const item of cat.items) {
        const n = Number(item.amount);
        if (isFinite(n)) sum += n;
      }
    }
    return sum;
  }, [categories]);

  const gap          = total - TARGET;
  const totalRec     = RECOMMENDATIONS.reduce((s, r) => s + r.saving, 0);
  const postRecTotal = total - totalRec;
  const catTotal     = (cat) => cat.items.reduce((s, i) => s + i.amount, 0);

  // ── Editing ──
  const startEdit = (itemId, currentAmount) => {
    setEditingId(itemId);
    setEditValue(String(currentAmount));
  };

  const commitEdit = (catId, itemId) => {
    const parsed = parseInt(editValue.replace(/\D/g, ""), 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setCategories((prev) =>
        prev.map((cat) =>
          cat.id === catId
            ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, amount: parsed } : item) }
            : cat
        )
      );
    }
    setEditingId(null);
  };

  const toggleCategory = (id) =>
    setOpenCategories((prev) => ({ ...prev, [id]: !prev[id] }));

  const monthLabel = getCurrentMonthLabel();

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {showResetModal && (
        <ResetModal
          onConfirm={() => { setShowResetModal(false); onReset(); }}
          onCancel={() => setShowResetModal(false)}
        />
      )}

      {/* Import success toast */}
      {importSuccess && (
        <div className="fixed bottom-6 right-6 z-50 bg-teal-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-pulse">
          <span className="text-xl">✅</span>
          <div>
            <p className="font-bold text-sm">{importSuccess.count} gastos importados</p>
            <p className="text-teal-200 text-xs">{importSuccess.catName} → Mis Gastos</p>
          </div>
          <button onClick={() => setImportSuccess(null)} className="ml-2 text-teal-200 hover:text-white text-lg font-bold">×</button>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-5 shadow-lg">
        <div className="max-w-5xl mx-auto">

          {/* Title row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">
                📊 Análisis de Gastos — {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
              </h1>
              <p className="text-slate-300 text-sm">
                {profile.name} · De {fmt(SALARY_ACTUAL)} → {fmt(SALARY_NUEVO)}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-4">
              {/* Botón compartir: solo si no hay cartera colaborativa activa */}
              {!walletData && onShareRequest && (
                <button
                  onClick={onShareRequest}
                  title="Hacer esta cartera colaborativa"
                  className="flex items-center gap-1.5 bg-blue-500/30 hover:bg-blue-500/60 text-blue-200 hover:text-white text-xs font-semibold px-3 py-2 rounded-lg transition border border-blue-400/40"
                >
                  🔗 Compartir
                </button>
              )}
              <button
                onClick={() => setShowResetModal(true)}
                title="Resetear configuración"
                className="flex items-center gap-1.5 bg-white/10 hover:bg-red-500/60 text-white text-xs font-medium px-3 py-2 rounded-lg transition border border-white/20"
              >
                🔄 Reset
              </button>
              <button
                onClick={toggleFullscreen}
                title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-lg transition border border-white/20"
              >
                {isFullscreen ? <><IconCompress /> Salir</> : <><IconExpand /> Pantalla completa</>}
              </button>
            </div>
          </div>

          {/* ── Barra de cartera colaborativa (solo si hay wallet) ── */}
          {walletData && (
            <WalletBar
              walletData={walletData}
              authUser={authUser}
              onChangeWallet={onChangeWallet}
              onLeave={onLeaveWallet}
            />
          )}

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard label="Sueldo actual"  value={fmt(SALARY_ACTUAL)} sub="Este mes"          color="text-emerald-400" />
            <SummaryCard label="Sueldo objetivo" value={fmt(SALARY_NUEVO)}  sub="Meta laboral"      color="text-yellow-300" />
            <SummaryCard
              label="Gastos totales"
              value={fmt(total)}
              sub={`${pct(total, SALARY_ACTUAL)}% del sueldo`}
              color={total > TARGET ? "text-red-400" : "text-emerald-400"}
            />
            <SummaryCard
              label={gap > 0 ? "Hay que reducir" : "¡Dentro del target!"}
              value={fmt(Math.abs(gap))}
              sub={gap > 0 ? `para llegar a ${fmt(TARGET)}` : "✅ Objetivo cumplido"}
              color={gap > 0 ? "text-red-400" : "text-emerald-400"}
            />
          </div>

          {/* Progress bar */}
          <div className="mt-4">
            <div className="flex justify-between text-xs text-slate-400 mb-1">
              <span>$0</span>
              <span className="text-yellow-300 font-semibold">TARGET: {fmt(TARGET)}</span>
              <span>{fmt(total)}</span>
            </div>
            <div className="relative h-4 bg-slate-600 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${total > TARGET ? "bg-red-500" : "bg-emerald-500"}`}
                style={{ width: `${Math.min(100, (total / (total * 1.1)) * 100)}%` }}
              />
              <div
                className="absolute top-0 h-full w-0.5 bg-yellow-400"
                style={{ left: `${(TARGET / (total * 1.1)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className={total > TARGET ? "text-red-400" : "text-emerald-400"}>
                {total > TARGET
                  ? `⬆ Excedés el target en ${fmt(gap)} (${pct(gap, TARGET)}% más)`
                  : "✅ Dentro del objetivo"}
              </span>
              <span className="text-slate-400">Target: {fmt(TARGET)}</span>
            </div>
          </div>

        </div>
      </div>

      {/* ─── TABS ─── */}
      <div className="max-w-5xl mx-auto px-4 mt-4">
        <div className="flex gap-2 border-b border-gray-200 mb-4">
          {[
            { id: "gastos",          label: "📋 Mis Gastos" },
            { id: "recomendaciones", label: "💡 Recomendaciones" },
            { id: "plan",            label: "🎯 Plan de Ajuste" },
            { id: "importar",        label: "📂 Importar" },
            { id: "comparar",        label: "📊 Comparar" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ─── TAB: GASTOS ─── */}
        {activeTab === "gastos" && (
          <div className="space-y-3 pb-8">
            <p className="text-sm text-gray-500 mb-2">
              Hacé clic en cualquier monto para editarlo. Los ítems con 🔒 son inamovibles. Los cambios actualizan el total en tiempo real.
            </p>

            {categories.map((cat) => {
              const subtotal = catTotal(cat);
              const isOpen   = openCategories[cat.id];
              return (
                <div key={cat.id} className={`rounded-xl border-2 overflow-hidden shadow-sm ${cat.color}`}>
                  <button
                    className={`w-full flex items-center justify-between px-4 py-3 ${cat.headerColor} hover:brightness-95 transition`}
                    onClick={() => toggleCategory(cat.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{cat.icon}</span>
                      <span className={`font-semibold text-sm ${cat.textColor}`}>{cat.name}</span>
                      {cat.locked && <span className="text-xs bg-gray-300 text-gray-600 px-2 py-0.5 rounded-full">FIJO</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm ${cat.textColor}`}>{fmt(subtotal)}</span>
                      <span className="text-gray-400 text-xs">{pct(subtotal, total)}% del total</span>
                      <span className="text-gray-500">{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="divide-y divide-gray-200">
                      {cat.items.map((item) => (
                        <div key={item.id} className="flex items-start justify-between px-4 py-2.5 hover:bg-white/50 transition">
                          <div className="flex-1 min-w-0 pr-4">
                            <div className="flex items-center gap-1">
                              {item.locked && <span className="text-gray-400 text-xs">🔒</span>}
                              {item.alert && !item.locked && <span className="text-xs">⚠️</span>}
                              <span className="text-sm text-gray-700">{item.name}</span>
                            </div>
                            {item.note && <p className="text-xs text-gray-400 mt-0.5">{item.note}</p>}
                          </div>
                          <div className="flex-shrink-0">
                            {item.locked ? (
                              <span className="text-sm font-semibold text-gray-600 bg-gray-200 px-3 py-1 rounded-lg">
                                {fmt(item.amount)}
                              </span>
                            ) : editingId === item.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  autoFocus
                                  className="w-28 border rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
                                  onBlur={() => commitEdit(cat.id, item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter")  commitEdit(cat.id, item.id);
                                    if (e.key === "Escape") setEditingId(null);
                                  }}
                                />
                                <button className="text-green-600 text-xs font-bold" onMouseDown={() => commitEdit(cat.id, item.id)}>✓</button>
                              </div>
                            ) : (
                              <button
                                className="text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition cursor-pointer border border-blue-200"
                                onClick={() => startEdit(item.id, item.amount)}
                                title="Clic para editar"
                              >
                                {fmt(item.amount)}
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

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
        )}

        {/* ─── TAB: RECOMENDACIONES ─── */}
        {activeTab === "recomendaciones" && (
          <div className="pb-8 space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <p className="text-sm text-blue-800">
                Si aplicás <strong>todas las recomendaciones</strong>, el ahorro potencial es de{" "}
                <strong>{fmt(totalRec)}</strong>. Tus gastos bajarían a aproximadamente{" "}
                <strong className={postRecTotal <= TARGET ? "text-green-700" : "text-red-700"}>
                  {fmt(postRecTotal)}
                </strong>{" "}
                {postRecTotal <= TARGET ? "✅ — ¡dentro del objetivo!" : `— todavía ${fmt(postRecTotal - TARGET)} sobre el target`}.
              </p>
            </div>

            {RECOMMENDATIONS.map((rec, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-bold">{rec.priority}</span>
                  <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-0.5 rounded-full border border-emerald-200">
                    Ahorro: {fmt(rec.saving)}/mes
                  </span>
                </div>
                <p className="font-semibold text-gray-800 mb-1">{rec.title}</p>
                <p className="text-sm text-gray-500">{rec.detail}</p>
              </div>
            ))}

            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mt-4">
              <h3 className="font-bold text-gray-700 mb-3">📊 Resumen del Potencial de Ahorro</h3>
              <div className="space-y-1">
                {[
                  { label: "Gasto actual",                          value: total,         color: "text-red-600" },
                  { label: "− Ahorro potencial total",              value: -totalRec,     color: "text-emerald-600" },
                  { label: "Gasto proyectado (aplicando todo)",     value: postRecTotal,  color: postRecTotal <= TARGET ? "text-green-700" : "text-orange-600" },
                  { label: "🎯 Target mensual",                     value: TARGET,        color: "text-blue-600" },
                ].map((row, i) => (
                  <div key={i} className="flex justify-between items-center py-1 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{row.label}</span>
                    <span className={`text-sm font-bold ${row.color}`}>{fmt(row.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── TAB: PLAN ─── */}
        {activeTab === "plan" && (
          <div className="pb-8 space-y-4">
            <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl p-5">
              <h2 className="text-lg font-bold mb-1">🎯 Tu Plan de Ajuste: de {fmt(total)} a {fmt(TARGET)}</h2>
              <p className="text-slate-300 text-sm">
                Necesitás reducir {fmt(gap)} ({pct(gap, total)}% de tus gastos actuales). Esto es posible. Acá está el plan paso a paso.
              </p>
            </div>

            <PlanPhase
              phase="FASE 1" title="Acciones inmediatas (Mes 1)"
              color="bg-red-50 border-red-300" headerColor="bg-red-100" textColor="text-red-800"
              totalSaving={94401 + 18000 + 40000}
              items={[
                { action: "Cancelar plan BNA Viejo (Cel Nativa)",    saving: 94401, detail: "Llamar al banco esta semana" },
                { action: "Reducir streamings a 2 máximo",           saving: 18000, detail: "Elegir Netflix y Spotify. Cancelar YouTube Premium y Google One" },
                { action: "Bajar plan Personal al básico",           saving: 40000, detail: "Llamar a Personal y pedir downgrade de plan" },
              ]}
            />

            <PlanPhase
              phase="FASE 2" title="Revisar gastos grandes (Mes 1-2)"
              color="bg-orange-50 border-orange-300" headerColor="bg-orange-100" textColor="text-orange-800"
              totalSaving={150000 + 150000 + 80000 + 65000}
              items={[
                { action: "Reducir carnicería Torcuato De Campos",      saving: 150000, detail: "$250k/mes en carnicería es el mayor gasto de alimentos. Reducir cantidad o frecuencia puede ahorrar $150k fácilmente" },
                { action: "Reducir 'Otros / Gastos varios' ($312k)",    saving: 150000, detail: "Identificar qué ítems lo componen y recortar los no esenciales. Meta: bajar de $312k a $160k" },
                { action: "Buscar estacionamiento más barato",          saving: 80000,  detail: "SafeParking = $138k/mes. Encontrar alternativa por $50k-$60k" },
                { action: "Cortar fast food y delivery a 4 veces/mes", saving: 65000,  detail: "McD + PedidosYa reducido de $91k a $26k = ahorro $65k" },
              ]}
            />

            <PlanPhase
              phase="FASE 3" title="Frenar nuevas compras (Mes 1 en adelante)"
              color="bg-yellow-50 border-yellow-300" headerColor="bg-yellow-100" textColor="text-yellow-800"
              totalSaving={100000 + 40000}
              items={[
                { action: "Cero compras nuevas en MercadoLibre",      saving: 100000, detail: "Las cuotas actuales ($218k) siguen, pero podés evitar agregar más. Ahorro neto a futuro" },
                { action: "Reducir consumo eléctrico (EDENOR)",       saving: 40000,  detail: "Apagar climatización innecesaria. Meta: bajar de $180k a $140k" },
              ]}
            />

            <PlanPhase
              phase="A FUTURO" title="Gastos que se liberan solos"
              color="bg-green-50 border-green-300" headerColor="bg-green-100" textColor="text-green-700"
              totalSaving={162333 + 20171 + 71815}
              items={[
                { action: "Sistema Hecate: quedan ~4 cuotas",      saving: 162333, detail: "En ~4 meses, se liberan $162.333/mes automáticamente" },
                { action: "LoJack: esta es la ÚLTIMA cuota",       saving: 20171,  detail: "El mes que viene ya no lo pagás" },
                { action: "GADNIC (electrónica): quedan 5 cuotas", saving: 71815,  detail: "En 5 meses se libera $71.815/mes" },
              ]}
            />

            {/* Proyección final */}
            <div className="bg-slate-800 text-white rounded-xl p-5">
              <h3 className="font-bold text-lg mb-3">📈 Proyección de ahorro total</h3>
              <div className="space-y-2">
                {[
                  { label: "Gasto actual",                                           value: total },
                  { label: "Fase 1 (acciones inmediatas)",                           value: total - (94401 + 18000 + 40000) },
                  { label: "+ Fase 2 (pagos grandes + parking + delivery)",          value: total - (94401 + 18000 + 40000 + 150000 + 150000 + 80000 + 65000) },
                  { label: "+ Fase 3 (compras + electricidad)",                      value: total - (94401 + 18000 + 40000 + 150000 + 150000 + 80000 + 65000 + 100000 + 40000) },
                  { label: "+ A futuro (cuotas que terminan)",                       value: total - (94401 + 18000 + 40000 + 150000 + 150000 + 80000 + 65000 + 100000 + 40000 + 162333 + 20171 + 71815) },
                  { label: "🎯 TARGET",                                              value: TARGET },
                ].map((row, i) => {
                  const diff = row.value - TARGET;
                  const colors = ["text-red-300","text-orange-300","text-yellow-300","text-blue-300","text-emerald-300","text-yellow-300"];
                  return (
                    <div key={i} className="flex justify-between items-center py-1 border-b border-slate-600 last:border-0">
                      <span className="text-sm text-slate-300">{row.label}</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold ${colors[i]}`}>{fmt(row.value)}</span>
                        {i > 0 && i < 5 && (
                          <span className={`text-xs ${diff <= 0 ? "text-emerald-400" : "text-red-400"}`}>
                            {diff <= 0 ? `✅ ${fmt(Math.abs(diff))} bajo target` : `${fmt(diff)} sobre target`}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
              <h3 className="font-bold text-amber-800 mb-2">🥩 Dato clave: Alimentación = $482k/mes</h3>
              <p className="text-sm text-amber-700">
                La carnicería Torcuato De Campos ($250k) + Carnes Botta ($12k) + almacén ($128k) + fast food ($92k)
                suman <strong>$482.032 solo en alimentación</strong> — el 12.5% del total.
                Es una categoría con margen real de reducción sin afectar la calidad de vida.
              </p>
            </div>
          </div>
        )}

        {/* ─── TAB: IMPORTAR ─── */}
        {activeTab === "importar" && (
          <ImportTab
            categories={categories}
            onImport={handleImport}
          />
        )}

        {/* ─── TAB: COMPARAR ─── */}
        {activeTab === "comparar" && (
          <CompareTab
            categories={categories}
            target={TARGET}
          />
        )}

      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// COMPARE TAB — helpers
// ─────────────────────────────────────────────

/** Given a history entry, return category total (from breakdown or proportional estimate) */
function catFromEntry(entry, catId, currentCats, currentTotal) {
  if (!entry) return 0;
  if (entry.breakdown?.[catId] !== undefined) return entry.breakdown[catId];
  const cat = currentCats.find(c => c.id === catId);
  if (!cat || currentTotal === 0) return 0;
  return Math.round(entry.total * (cat.total / currentTotal));
}

function fmtDelta(cur, prev) {
  if (!prev) return null;
  const d   = cur - prev;
  const pct = Math.round((d / prev) * 100);
  return { d, pct, up: d > 0 };
}

function fmtShort(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(0)}k`;
  return `$${n}`;
}

// ── SVG Trend Line ────────────────────────────────────────────────────────────
function TrendSVG({ months, target }) {
  if (months.length < 2) return null;
  const W = 520, H = 200;
  const PAD = { t: 35, b: 45, l: 65, r: 20 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const maxVal = Math.max(...months.map(m => m.total), target || 0) * 1.12;
  const minVal = 0;

  const xOf = (i) => PAD.l + (months.length < 2 ? cW / 2 : (i / (months.length - 1)) * cW);
  const yOf = (v)  => PAD.t + (1 - (v - minVal) / (maxVal - minVal)) * cH;

  const linePts = months.map((m, i) => `${xOf(i)},${yOf(m.total)}`);
  const linePath = "M" + linePts.join(" L");
  const areaPath = `${linePath} L${xOf(months.length - 1)},${PAD.t + cH} L${xOf(0)},${PAD.t + cH} Z`;
  const targetY  = target ? yOf(target) : null;

  // Y-axis ticks (4 evenly spaced)
  const yTicks = [0, 0.33, 0.66, 1].map(f => maxVal * f);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
      {/* Grid + Y labels */}
      {yTicks.map((v) => {
        const y = yOf(v);
        return (
          <g key={v}>
            <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#e2e8f0" strokeWidth="0.8" />
            <text x={PAD.l - 6} y={y + 3.5} textAnchor="end" fontSize="9" fill="#94a3b8">
              {fmtShort(v)}
            </text>
          </g>
        );
      })}

      {/* Target line */}
      {targetY && (
        <>
          <line x1={PAD.l} y1={targetY} x2={W - PAD.r} y2={targetY}
                stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6,3" />
          <text x={PAD.l + 4} y={targetY - 4} fontSize="8.5" fill="#d97706" fontWeight="bold">TARGET</text>
        </>
      )}

      {/* Area fill */}
      <path d={areaPath} fill="#0d9488" fillOpacity="0.07" />

      {/* Line */}
      <path d={linePath} fill="none" stroke="#0d9488" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />

      {/* Points */}
      {months.map((m, i) => {
        const x = xOf(i), y = yOf(m.total);
        const isCurrent = m.id === "current";
        return (
          <g key={m.id}>
            <circle cx={x} cy={y} r="5" fill={isCurrent ? "#0d9488" : "white"}
                    stroke="#0d9488" strokeWidth="2.5" />
            <text x={x} y={y - 10} textAnchor="middle" fontSize="9.5"
                  fill="#0f766e" fontWeight="bold">
              {fmtShort(m.total)}
            </text>
            {/* Month label (2 lines: name + year) */}
            <text x={x} y={H - PAD.b + 14} textAnchor="middle" fontSize="9" fill="#475569">
              {MESES[m.month].slice(0, 3)}
            </text>
            <text x={x} y={H - PAD.b + 25} textAnchor="middle" fontSize="8" fill="#94a3b8">
              {m.year}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Compare Tab ───────────────────────────────────────────────────────────────
function CompareTab({ categories, target }) {
  const now       = new Date();
  const curYear   = now.getFullYear();
  const curMonth  = now.getMonth(); // 0-indexed

  // ── State ──
  const [history, setHistoryState] = useState(loadHistory);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId]         = useState(null); // id being edited
  const [formMonth, setFormMonth]   = useState(curMonth === 0 ? 11 : curMonth - 1);
  const [formYear, setFormYear]     = useState(curMonth === 0 ? curYear - 1 : curYear);
  const [formTotal, setFormTotal]   = useState("");
  const [useBreakdown, setUseBreakdown] = useState(false);
  const [breakdownVals, setBreakdownVals] = useState({});

  // ── Computed: current month live data ──
  const currentCats = useMemo(() =>
    categories.map(c => ({
      id:    c.id,
      name:  c.name,
      icon:  c.icon || "📋",
      total: c.items.reduce((s, i) => s + i.amount, 0),
    })),
    [categories]
  );
  const currentTotal = useMemo(() =>
    currentCats.reduce((s, c) => s + c.total, 0),
    [currentCats]
  );

  const currentEntry = useMemo(() => ({
    id:        "current",
    label:     `${monthLabel(curMonth, curYear)} (actual)`,
    year:      curYear,
    month:     curMonth,
    total:     currentTotal,
    breakdown: Object.fromEntries(currentCats.map(c => [c.id, c.total])),
    isLive:    true,
  }), [currentTotal, currentCats, curMonth, curYear]);

  // ── All months sorted oldest→newest, max 3 ──
  const allMonths = useMemo(() => {
    const combined = [
      ...history.filter(h => !(h.year === curYear && h.month === curMonth)),
      currentEntry,
    ].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    return combined.slice(-3); // keep last 3
  }, [history, currentEntry, curYear, curMonth]);

  const prevEntry = allMonths.length >= 2 ? allMonths[allMonths.length - 2] : null;
  const hasHistory = history.length > 0;

  // ── History CRUD ──
  const persistHistory = (entries) => {
    setHistoryState(entries);
    saveHistory(entries);
  };

  const deleteHistoryEntry = (id) => {
    persistHistory(history.filter(h => h.id !== id));
  };

  // ── "Save current month" button ──
  const saveCurrentMonth = () => {
    const id = `${curMonth}_${curYear}`;
    const entry = {
      id,
      label:     monthLabel(curMonth, curYear),
      year:      curYear,
      month:     curMonth,
      total:     currentTotal,
      breakdown: Object.fromEntries(currentCats.map(c => [c.id, c.total])),
    };
    persistHistory([...history.filter(h => h.id !== id), entry]);
  };

  // ── Form helpers ──
  const openAddForm = (existingId = null) => {
    if (existingId) {
      const e = history.find(h => h.id === existingId);
      if (!e) return;
      setEditId(existingId);
      setFormMonth(e.month);
      setFormYear(e.year);
      setFormTotal(String(e.total));
      setUseBreakdown(!!e.breakdown);
      setBreakdownVals(e.breakdown || {});
    } else {
      setEditId(null);
      setFormMonth(curMonth === 0 ? 11 : curMonth - 1);
      setFormYear(curMonth === 0 ? curYear - 1 : curYear);
      setFormTotal("");
      setUseBreakdown(false);
      setBreakdownVals({});
    }
    setShowAddForm(true);
  };

  const closeForm = () => { setShowAddForm(false); setEditId(null); };

  // When total changes and breakdown is enabled, reset proportional defaults
  const handleTotalChange = (raw) => {
    const val = raw.replace(/\D/g, "");
    setFormTotal(val);
    if (useBreakdown && val) {
      const tot = parseInt(val, 10);
      if (!isNaN(tot) && currentTotal > 0) {
        const proposed = {};
        currentCats.forEach(c => {
          proposed[c.id] = Math.round(tot * (c.total / currentTotal));
        });
        setBreakdownVals(proposed);
      }
    }
  };

  const handleBreakdownChange = (catId, raw) => {
    const val = raw.replace(/\D/g, "");
    setBreakdownVals(prev => ({ ...prev, [catId]: parseInt(val, 10) || 0 }));
  };

  const submitForm = () => {
    const total = parseInt(formTotal, 10);
    if (!total || total <= 0) return;
    const id = `${formMonth}_${formYear}`;
    const entry = {
      id,
      label:     monthLabel(formMonth, formYear),
      year:      formYear,
      month:     formMonth,
      total,
      breakdown: useBreakdown ? { ...breakdownVals } : null,
    };
    persistHistory([...history.filter(h => h.id !== id), entry]);
    closeForm();
  };

  const breakdownSum = Object.values(breakdownVals).reduce((s, v) => s + (v || 0), 0);
  const formTotalNum = parseInt(formTotal, 10) || 0;

  // ── Top movers vs previous month ──
  const movers = useMemo(() => {
    if (!prevEntry) return [];
    return currentCats
      .map(c => {
        const prev = catFromEntry(prevEntry, c.id, currentCats, currentTotal);
        const { d, pct, up } = fmtDelta(c.total, prev) || { d: 0, pct: 0, up: false };
        return { ...c, prev, d, pct, up };
      })
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 6);
  }, [prevEntry, currentCats, currentTotal]);

  // Max value for bar chart scale
  const barMax = useMemo(() => {
    if (!prevEntry) return currentTotal;
    return Math.max(
      ...currentCats.map(c => c.total),
      ...currentCats.map(c => catFromEntry(prevEntry, c.id, currentCats, currentTotal))
    ) * 1.05;
  }, [prevEntry, currentCats, currentTotal]);

  // ── Render helpers ──
  const DeltaBadge = ({ cur, prev }) => {
    if (!prev) return null;
    const delta = fmtDelta(cur, prev);
    return (
      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ml-1
        ${delta.up ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
        {delta.up ? "▲" : "▼"} {Math.abs(delta.pct)}%
      </span>
    );
  };

  // ════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════
  return (
    <div className="pb-10 space-y-4">

      {/* ─ Header ─ */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl p-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold mb-1">📊 Comparación Mensual</h2>
          <p className="text-slate-300 text-sm">
            {hasHistory
              ? `Comparando ${allMonths.map(m => m.label.split(" (")[0]).join(" · ")}`
              : "Agregá al menos un mes anterior para ver la comparación."}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap justify-end">
          <button
            onClick={saveCurrentMonth}
            title="Guardar una foto del mes actual en el historial"
            className="text-xs font-medium bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-2 rounded-lg transition"
          >
            💾 Guardar mes actual
          </button>
          <button
            onClick={() => openAddForm()}
            className="text-xs font-bold bg-teal-500 hover:bg-teal-400 px-3 py-2 rounded-lg transition"
          >
            + Agregar mes anterior
          </button>
        </div>
      </div>

      {/* ─ History pills ─ */}
      {history.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {history.map(h => (
            <div key={h.id} className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-full px-3 py-1 text-xs">
              <span className="font-medium text-slate-700">{h.label}</span>
              <span className="text-slate-400">· {fmtShort(h.total)}</span>
              {h.breakdown ? <span className="text-teal-500">· desglose</span> : <span className="text-gray-400">· est.</span>}
              <button onClick={() => openAddForm(h.id)} className="ml-1 text-slate-400 hover:text-blue-500 transition">✏️</button>
              <button onClick={() => deleteHistoryEntry(h.id)} className="text-slate-300 hover:text-red-500 transition">×</button>
            </div>
          ))}
        </div>
      )}

      {/* ─ Empty state ─ */}
      {!hasHistory && !showAddForm && (
        <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-10 text-center">
          <div className="text-5xl mb-3">📅</div>
          <p className="font-bold text-gray-700 mb-1">Sin historial aún</p>
          <p className="text-gray-400 text-sm mb-5">
            Cargá los datos del mes anterior para empezar a comparar.
            Solo necesitás el total gastado — el desglose por categoría es opcional.
          </p>
          <button
            onClick={() => openAddForm()}
            className="bg-teal-600 hover:bg-teal-500 text-white font-bold px-6 py-3 rounded-xl transition text-sm shadow"
          >
            + Agregar mes anterior
          </button>
        </div>
      )}

      {/* ─ Add / Edit form ─ */}
      {showAddForm && (
        <div className="bg-white border-2 border-teal-300 rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4">
            {editId ? "✏️ Editar mes" : "➕ Agregar mes anterior"}
          </h3>

          {/* Month + Year selectors */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Mes</label>
              <select
                value={formMonth}
                onChange={e => setFormMonth(Number(e.target.value))}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
              >
                {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Año</label>
              <input
                type="number"
                value={formYear}
                onChange={e => setFormYear(Number(e.target.value))}
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
                min="2020" max="2030"
              />
            </div>
          </div>

          {/* Total */}
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Total de gastos ese mes ($)
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder={`Ej: ${fmt(currentTotal)}`}
              value={formTotal ? Number(formTotal).toLocaleString("es-AR") : ""}
              onChange={e => handleTotalChange(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400"
            />
          </div>

          {/* Toggle breakdown */}
          <label className="flex items-center gap-2 mb-4 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={useBreakdown}
              onChange={e => {
                setUseBreakdown(e.target.checked);
                if (e.target.checked && formTotalNum > 0 && currentTotal > 0) {
                  const proposed = {};
                  currentCats.forEach(c => {
                    proposed[c.id] = Math.round(formTotalNum * (c.total / currentTotal));
                  });
                  setBreakdownVals(proposed);
                }
              }}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">Desglosar por categoría (opcional)</span>
            {!useBreakdown && (
              <span className="text-xs text-gray-400">— se estima proporcionalmente</span>
            )}
          </label>

          {/* Per-category inputs */}
          {useBreakdown && (
            <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2">
              {currentCats.map(c => (
                <div key={c.id} className="flex items-center gap-3">
                  <span className="text-sm text-gray-600 flex-1 truncate">{c.icon} {c.name.split(" (")[0]}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={breakdownVals[c.id] ? Number(breakdownVals[c.id]).toLocaleString("es-AR") : ""}
                    onChange={e => handleBreakdownChange(c.id, e.target.value)}
                    className="w-28 border-2 border-gray-200 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:border-teal-400"
                  />
                </div>
              ))}
              {/* Running total */}
              <div className={`flex justify-between text-xs font-bold pt-2 border-t ${
                Math.abs(breakdownSum - formTotalNum) < 1000 ? "text-green-600" : "text-amber-600"
              }`}>
                <span>Suma del desglose:</span>
                <span>{fmt(breakdownSum)} {formTotalNum > 0 && `(${fmt(Math.abs(breakdownSum - formTotalNum))} de diferencia)`}</span>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={closeForm}
              className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-2.5 rounded-xl hover:bg-gray-50 transition text-sm">
              Cancelar
            </button>
            <button onClick={submitForm} disabled={!formTotalNum}
              className={`flex-1 font-bold py-2.5 rounded-xl transition text-sm shadow
                ${formTotalNum ? "bg-teal-600 hover:bg-teal-500 text-white" : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}>
              {editId ? "Guardar cambios" : "Guardar mes"}
            </button>
          </div>
        </div>
      )}

      {/* ─ Charts section (only if we have at least 2 months) ─ */}
      {allMonths.length >= 2 && (
        <>
          {/* ── SUMMARY DELTA CARDS ── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {
                label: `${monthLabel(curMonth, curYear)}`,
                value: fmt(currentTotal),
                sub: `${pct(currentTotal, prevEntry?.total || currentTotal)}% vs mes ant.`,
                color: "text-gray-800",
                bg: "bg-white",
              },
              {
                label: prevEntry ? prevEntry.label : "—",
                value: prevEntry ? fmt(prevEntry.total) : "—",
                sub: "Mes anterior",
                color: "text-gray-600",
                bg: "bg-gray-50",
              },
              (() => {
                const d = prevEntry ? fmtDelta(currentTotal, prevEntry.total) : null;
                return {
                  label: d ? (d.up ? "Subió el gasto" : "Bajó el gasto") : "Diferencia",
                  value: d ? fmt(Math.abs(d.d)) : "—",
                  sub: d ? `${d.up ? "+" : "-"}${Math.abs(d.pct)}% vs mes anterior` : "",
                  color: d ? (d.up ? "text-red-600" : "text-green-600") : "text-gray-400",
                  bg: d ? (d.up ? "bg-red-50" : "bg-green-50") : "bg-gray-50",
                  icon: d ? (d.up ? "⬆" : "⬇") : "",
                };
              })(),
              (() => {
                const vs = currentTotal - target;
                return {
                  label: vs > 0 ? "Sobre el target" : "Bajo el target",
                  value: fmt(Math.abs(vs)),
                  sub: `Target: ${fmt(target)}`,
                  color: vs > 0 ? "text-red-600" : "text-green-600",
                  bg: vs > 0 ? "bg-red-50" : "bg-green-50",
                  icon: vs > 0 ? "⚠️" : "✅",
                };
              })(),
            ].map((card, i) => (
              <div key={i} className={`${card.bg} rounded-xl p-4 border border-gray-100 shadow-sm`}>
                <p className="text-xs text-gray-500 font-medium truncate">{card.label}</p>
                <p className={`text-xl font-bold mt-0.5 ${card.color}`}>
                  {card.icon && <span className="mr-1">{card.icon}</span>}{card.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* ── CATEGORY BAR CHART ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-4">📊 Comparación por Categoría</h3>
            <div className="flex gap-4 mb-4 text-xs">
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-blue-300"></span>{prevEntry?.label.split(" (")[0]}</span>
              <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-3 rounded bg-teal-500"></span>{monthLabel(curMonth, curYear)} (actual)</span>
              <span className="flex items-center gap-1.5 ml-auto text-gray-400">🟢 bajó · 🔴 subió</span>
            </div>

            <div className="space-y-4">
              {currentCats.map(cat => {
                const prev = prevEntry ? catFromEntry(prevEntry, cat.id, currentCats, currentTotal) : 0;
                const curr = cat.total;
                const delta = prevEntry ? fmtDelta(curr, prev) : null;
                const barPrevPct = barMax > 0 ? (prev / barMax) * 100 : 0;
                const barCurrPct = barMax > 0 ? (curr / barMax) * 100 : 0;

                return (
                  <div key={cat.id}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-semibold text-gray-700 truncate max-w-[200px]">
                        {cat.icon} {cat.name.split(" (")[0]}
                      </span>
                      {delta && (
                        <span className={`text-xs font-bold ${delta.up ? "text-red-600" : "text-green-600"}`}>
                          {delta.up ? "▲" : "▼"} {fmt(Math.abs(delta.d))} ({Math.abs(delta.pct)}%)
                        </span>
                      )}
                    </div>
                    {/* Previous bar */}
                    {prevEntry && (
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] text-gray-400 w-6 flex-shrink-0 text-right">ant</span>
                        <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-300 rounded-full transition-all duration-500"
                               style={{ width: `${barPrevPct}%` }} />
                        </div>
                        <span className="text-[10px] text-gray-500 w-20 text-right flex-shrink-0">{fmt(prev)}</span>
                      </div>
                    )}
                    {/* Current bar */}
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 font-medium w-6 flex-shrink-0 text-right">act</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500
                            ${!delta ? "bg-teal-400" : delta.up ? "bg-red-400" : "bg-green-400"}`}
                          style={{ width: `${barCurrPct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-700 font-bold w-20 text-right flex-shrink-0">{fmt(curr)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {!prevEntry?.breakdown && prevEntry && (
              <p className="text-xs text-amber-600 mt-4 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ El desglose por categoría del mes anterior es estimado proporcionalmente.
                Editá ese mes para ingresar los valores exactos.
              </p>
            )}
          </div>

          {/* ── TREND LINE (3 months) ── */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-1">📈 Tendencia de Gastos</h3>
            <p className="text-xs text-gray-400 mb-4">
              {allMonths.length < 3
                ? `Mostrando ${allMonths.length} mes/es — agregá más meses para ver la tendencia completa.`
                : "Últimos 3 meses · La línea amarilla es el TARGET."}
            </p>
            <TrendSVG months={allMonths} target={target} />
          </div>

          {/* ── TOP MOVERS ── */}
          {prevEntry && movers.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
              <h3 className="font-bold text-gray-800 mb-3">🔀 Mayores Cambios por Categoría</h3>
              <div className="divide-y divide-gray-100">
                {movers.map(m => (
                  <div key={m.id} className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg w-8 h-8 flex items-center justify-center rounded-full
                        ${m.up ? "bg-red-50" : "bg-green-50"}`}>
                        {m.up ? "⬆️" : "⬇️"}
                      </span>
                      <div>
                        <p className="text-sm font-medium text-gray-700">{m.name.split(" (")[0]}</p>
                        <p className="text-xs text-gray-400">{fmt(m.prev)} → {fmt(m.total)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${m.up ? "text-red-600" : "text-green-600"}`}>
                        {m.up ? "+" : "-"}{fmt(Math.abs(m.d))}
                      </p>
                      <p className={`text-xs font-semibold ${m.up ? "text-red-400" : "text-green-400"}`}>
                        {m.up ? "+" : "-"}{Math.abs(m.pct)}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// IMPORT TAB
// ─────────────────────────────────────────────
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const CONF_LABEL = (c) =>
  c >= 0.8 ? { label: "Alta",  cls: "bg-green-100 text-green-700"  } :
  c >= 0.6 ? { label: "Media", cls: "bg-yellow-100 text-yellow-700" } :
             { label: "Baja",  cls: "bg-orange-100 text-orange-700" };

const FORMAT_CHIPS = [
  { ext: "CSV",  color: "bg-green-100 text-green-700"  },
  { ext: "XLSX", color: "bg-blue-100 text-blue-700"    },
  { ext: "PDF",  color: "bg-red-100 text-red-700"      },
  { ext: "DOCX", color: "bg-indigo-100 text-indigo-700"},
  { ext: "TXT",  color: "bg-gray-100 text-gray-600"    },
  { ext: "PNG",  color: "bg-purple-100 text-purple-700"},
  { ext: "JPG",  color: "bg-pink-100 text-pink-700"    },
];

function ImportTab({ categories, onImport }) {
  const [step, setStep]             = useState("idle");   // idle | processing | preview | error
  const [file, setFile]             = useState(null);
  const [progress, setProgress]     = useState({ stage: "", percent: 0 });
  const [previewItems, setPreviewItems] = useState([]);
  const [parserMeta, setParserMeta] = useState({});
  const [errorMsg, setErrorMsg]     = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editField, setEditField]   = useState(null);
  const [editValue, setEditValue]   = useState("");

  const fileInputRef = useRef(null);

  // ── File validation ──
  const validateFile = (f) => {
    if (!f) return "No se seleccionó ningún archivo.";
    if (f.size > MAX_FILE_SIZE) return `El archivo supera el límite de 50 MB.`;
    if (!isFileSupported(f))
      return `Formato .${f.name.split(".").pop()} no soportado. Formatos aceptados: ${SUPPORTED_EXTENSIONS.join(", ")}.`;
    return null;
  };

  // ── Process file ──
  const processFile = async (f) => {
    const err = validateFile(f);
    if (err) { setErrorMsg(err); setStep("error"); return; }

    setFile(f);
    setStep("processing");
    setProgress({ stage: "Iniciando…", percent: 5 });
    setErrorMsg("");

    try {
      const extracted = await extractFromFile(f, setProgress);
      setProgress({ stage: "Detectando gastos…", percent: 95 });

      const parsed = parseExpenses(extracted);
      if (!parsed.items.length) {
        setErrorMsg("No se encontraron gastos en el archivo. Probá con otro formato o revisá que el documento contenga montos.");
        setStep("error");
        return;
      }

      setParserMeta({ strategy: parsed.strategy, warning: parsed.warning });
      setPreviewItems(
        parsed.items.map(item => ({
          ...item,
          selected: true,
          assignedCatId: "nueva",
        }))
      );
      setProgress({ stage: "Listo", percent: 100 });
      setStep("preview");
    } catch (e) {
      setErrorMsg(e.message || "Error al procesar el archivo.");
      setStep("error");
    }
  };

  // ── Drag & drop handlers ──
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  // ── Inline editing ──
  const startEdit = (id, field, value) => {
    setEditingId(id); setEditField(field); setEditValue(String(value));
  };
  const commitEdit = () => {
    setPreviewItems(prev => prev.map(item => {
      if (item.id !== editingId) return item;
      if (editField === "amount") {
        const n = parseInt(editValue.replace(/\D/g, ""), 10);
        return isNaN(n) ? item : { ...item, amount: n };
      }
      if (editField === "description") {
        return editValue.trim() ? { ...item, description: editValue.trim() } : item;
      }
      return item;
    }));
    setEditingId(null); setEditField(null);
  };

  // ── Selection helpers ──
  const selectedItems  = previewItems.filter(i => i.selected);
  const selectedTotal  = selectedItems.reduce((s, i) => s + i.amount, 0);
  const toggleItem     = (id) => setPreviewItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const toggleAll      = () => {
    const allSel = previewItems.every(i => i.selected);
    setPreviewItems(prev => prev.map(i => ({ ...i, selected: !allSel })));
  };

  // ── Confirm import ──
  const confirmImport = () => {
    if (!selectedItems.length) return;
    onImport(selectedItems, file.name);
    setStep("idle");
    setPreviewItems([]);
    setFile(null);
  };

  // ── Reset ──
  const resetToIdle = () => {
    setStep("idle"); setFile(null); setPreviewItems([]); setErrorMsg(""); setProgress({ stage: "", percent: 0 });
  };

  // ──────────────────────────────────────────
  // RENDER
  // ──────────────────────────────────────────
  return (
    <div className="pb-8 space-y-4">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl p-5">
        <h2 className="text-lg font-bold mb-1">📂 Importar Gastos desde Archivo</h2>
        <p className="text-teal-200 text-sm">
          Subí un extracto bancario, factura, planilla o imagen — el sistema detecta los montos automáticamente.
        </p>
      </div>

      {/* ── IDLE: Drop zone ── */}
      {step === "idle" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
            ${isDragging ? "border-teal-500 bg-teal-50 scale-[1.01]" : "border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50/40"}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={SUPPORTED_EXTENSIONS.map(e => `.${e}`).join(",")}
            onChange={(e) => { if (e.target.files[0]) processFile(e.target.files[0]); e.target.value = ""; }}
          />
          <div className="text-5xl mb-3">{isDragging ? "📂" : "📁"}</div>
          <p className="font-bold text-gray-700 text-base mb-1">
            {isDragging ? "Soltá el archivo aquí" : "Arrastrá un archivo o hacé clic para seleccionar"}
          </p>
          <p className="text-gray-400 text-sm mb-4">Máx. 50 MB</p>
          <div className="flex flex-wrap justify-center gap-2">
            {FORMAT_CHIPS.map(({ ext, color }) => (
              <span key={ext} className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>{ext}</span>
            ))}
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">+más</span>
          </div>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {step === "processing" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-3 animate-bounce">⚙️</div>
          <p className="font-bold text-gray-700 mb-1">{file?.name}</p>
          <p className="text-gray-400 text-sm mb-5">{progress.stage}</p>
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mx-auto max-w-xs">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-teal-600 text-sm font-medium mt-2">{progress.percent}%</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {step === "error" && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="font-bold text-red-700 mb-1">No se pudo procesar el archivo</p>
          <p className="text-red-600 text-sm mb-4">{errorMsg}</p>
          <button
            onClick={resetToIdle}
            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-5 py-2 rounded-xl text-sm transition"
          >
            Intentar con otro archivo
          </button>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {step === "preview" && (
        <div className="space-y-3">

          {/* File info + strategy */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-teal-800">📄 {file?.name}</p>
              <p className="text-xs text-teal-600">Estrategia: {parserMeta.strategy}</p>
              {parserMeta.warning && (
                <p className="text-xs text-amber-600 mt-0.5">⚠️ {parserMeta.warning}</p>
              )}
            </div>
            <button onClick={resetToIdle} className="text-xs text-teal-600 hover:text-teal-800 underline flex-shrink-0">
              Cambiar archivo
            </button>
          </div>

          {/* Selection summary */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-800">{selectedItems.length}</span> de{" "}
              <span className="font-bold">{previewItems.length}</span> ítems seleccionados
              {" · "}Total: <span className="font-bold text-teal-700">{fmt(selectedTotal)}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={toggleAll}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg"
              >
                {previewItems.every(i => i.selected) ? "Deseleccionar todo" : "Seleccionar todo"}
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <input
                        type="checkbox"
                        checked={previewItems.every(i => i.selected)}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-gray-600 font-semibold">Descripción</th>
                    <th className="px-3 py-2 text-right text-gray-600 font-semibold">Monto</th>
                    <th className="px-3 py-2 text-center text-gray-600 font-semibold w-20">Confianza</th>
                    <th className="px-3 py-2 text-center text-gray-600 font-semibold w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewItems.map((item) => {
                    const conf = CONF_LABEL(item.confidence);
                    return (
                      <tr
                        key={item.id}
                        className={`transition ${item.selected ? "bg-white" : "bg-gray-50 opacity-50"}`}
                      >
                        {/* Checkbox */}
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={item.selected} onChange={() => toggleItem(item.id)} className="rounded" />
                        </td>

                        {/* Description */}
                        <td className="px-3 py-2 max-w-xs">
                          {editingId === item.id && editField === "description" ? (
                            <input
                              autoFocus
                              className="w-full border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setEditingId(null); } }}
                            />
                          ) : (
                            <div>
                              <button
                                className="text-left text-gray-700 hover:text-teal-700 hover:underline truncate max-w-[240px] block"
                                onClick={() => startEdit(item.id, "description", item.description)}
                                title="Clic para editar"
                              >
                                {item.description}
                              </button>
                              {item.date && <p className="text-xs text-gray-400">{item.date}</p>}
                            </div>
                          )}
                        </td>

                        {/* Amount */}
                        <td className="px-3 py-2 text-right">
                          {editingId === item.id && editField === "amount" ? (
                            <input
                              autoFocus
                              className="w-28 border rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
                              onBlur={commitEdit}
                              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                            />
                          ) : (
                            <button
                              className="font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition border border-blue-200 text-xs"
                              onClick={() => startEdit(item.id, "amount", item.amount)}
                              title="Clic para editar"
                            >
                              {fmt(item.amount)}
                            </button>
                          )}
                        </td>

                        {/* Confidence */}
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${conf.cls}`}>{conf.label}</span>
                        </td>

                        {/* Delete row */}
                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setPreviewItems(prev => prev.filter(i => i.id !== item.id))}
                            className="text-gray-300 hover:text-red-500 transition text-base leading-none"
                            title="Eliminar fila"
                          >×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tip */}
          <p className="text-xs text-gray-400 text-center">
            💡 Hacé clic en la descripción o el monto para editar antes de importar.
          </p>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetToIdle}
              className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={confirmImport}
              disabled={!selectedItems.length}
              className={`flex-1 font-bold py-3 rounded-xl transition text-sm shadow
                ${selectedItems.length
                  ? "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Importar {selectedItems.length > 0 ? `${selectedItems.length} gastos →` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// ERROR BOUNDARY — captura errores de React en producción
// Evita que un crash silencioso deje al usuario con pantalla en blanco.
// ─────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production you'd send this to a monitoring service (Sentry, etc.)
    console.error('[GastosApp] Error capturado por ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Algo salió mal</h2>
          <p className="text-gray-500 text-sm mb-2">
            Ocurrió un error inesperado en la aplicación.
          </p>
          <p className="text-gray-400 text-xs mb-6 font-mono bg-gray-50 rounded-lg px-3 py-2">
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="border-2 border-gray-200 text-gray-600 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 transition text-sm"
            >
              Recargar página
            </button>
          </div>
          <p className="text-xs text-gray-300 mt-4">
            Tus datos están seguros en el almacenamiento local del navegador.
          </p>
        </div>
      </div>
    );
  }
}

// ─────────────────────────────────────────────
// ROOT — auth + wallet + perfil + routing
// ─────────────────────────────────────────────
export default function App() {
  // ── Auth state ──
  const [authUser,    setAuthUser]    = useState(undefined); // undefined = cargando
  const [soloMode,    setSoloModeS]   = useState(getSoloMode);

  // ── Wallet state ──
  const [walletId,      setWalletId]      = useState(getLocalWalletId); // null hasta que se selecciona
  const [walletData,    setWalletData]    = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);

  // ── Lista de carteras del usuario (para el selector) ──
  const [userWallets,    setUserWallets]    = useState(null);  // null = no cargado aún
  const [walletsLoading, setWalletsLoading] = useState(false);

  // ── Categorías (Firebase o local) ──
  const [categories,     setCategories]     = useState([]);
  const [externalUpdate, setExternalUpdate] = useState(null);

  // ── Perfil (Firestore + localStorage como caché) ──
  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed?.name || !parsed?.salaryActual || !parsed?.salaryTarget) return null;
      return parsed;
    } catch { return null; }
  });

  // ── Sync toast state ──
  const [syncToast, setSyncToast] = useState(null); // { text, type: 'sync'|'error' }

  // ── Share modal state ──
  const [showShareModal, setShowShareModal] = useState(false);

  // ── Escuchar cambios de auth en Firebase ───────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        // Deslogueado: limpiar todo el estado
        setAuthUser(null);
        setUserWallets(null);
        setWalletId(null);
        setWalletData(null);
        setProfile(null);
        setCategories([]);
        return;
      }

      setAuthUser(user);

      // ── Cargar perfil desde Firestore ────────────────────────────────────
      try {
        const firestoreProfile = await getUserProfile(user.uid);
        if (firestoreProfile) {
          setProfile(firestoreProfile);
          // Actualizar localStorage como caché local
          localStorage.setItem(PROFILE_KEY, JSON.stringify(firestoreProfile));
          // Corregir displayName en Firebase Auth si difiere del perfil guardado
          if (firestoreProfile.name && firestoreProfile.name !== user.displayName) {
            updateProfile(user, { displayName: firestoreProfile.name }).catch(() => {});
          }
        }
      } catch (err) {
        console.warn('[Auth] No se pudo cargar el perfil:', err);
      }

      // ── Cartera: si hay walletId en localStorage (sesión F5) → usarlo ────
      // Si no hay → mostrar selector para que el usuario elija
      if (getLocalWalletId() && !getSoloMode()) {
        setWalletId(getLocalWalletId());
        return; // El selector no es necesario, ya hay cartera activa
      }

      // ── Sin cartera activa → cargar lista de carteras del usuario ─────────
      if (!getSoloMode()) {
        setWalletsLoading(true);
        try {
          const wallets = await getUserWallets(user.uid);
          setUserWallets(wallets);
        } catch (err) {
          console.warn('[Auth] No se pudo cargar carteras:', err);
          setUserWallets([]);
        } finally {
          setWalletsLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  // ── Cargar wallet data + suscribir cambios en tiempo real ─────────────────
  useEffect(() => {
    if (!walletId || soloMode) return;

    let unsubCats, unsubWallet;
    setWalletLoading(true);

    // Listener de la cartera (nombre, miembros)
    unsubWallet = subscribeToWallet(
      walletId,
      (data) => {
        setWalletData(data);
        // Registro retroactivo: si el usuario ya está autenticado, guardar en
        // users/{uid} para que la cartera sea recuperable en otros dispositivos.
        if (authUser?.uid && data?.name) {
          registerWalletForUser(authUser.uid, walletId, data.name).catch(() => {});
        }
      },
      () => {}
    );

    // Listener de categorías (gastos en tiempo real)
    let firstLoad = true;
    unsubCats = subscribeToCategories(
      walletId,
      (data) => {
        setWalletLoading(false);
        if (firstLoad) {
          // Primera carga: setear estado
          setCategories(data.categories ?? []);
          firstLoad = false;
        } else {
          // Actualización de otro usuario: notificar sin sobreescribir edición local
          setExternalUpdate(data);
          if (data.updatedBy !== authUser?.uid) {
            const name = data.updatedByName ?? 'Alguien';
            setSyncToast({ text: `${name} actualizó los gastos`, type: 'sync' });
            setTimeout(() => setSyncToast(null), 3500);
          }
        }
      },
      (err) => {
        console.error('[Firestore]', err);
        setWalletLoading(false);
      }
    );

    return () => {
      unsubCats?.();
      unsubWallet?.();
    };
  }, [walletId, soloMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Cuando llega update externo, aplicarlo a categories ───────────────────
  useEffect(() => {
    if (!externalUpdate) return;
    setCategories(externalUpdate.categories ?? []);
    setExternalUpdate(null);
  }, [externalUpdate]);

  // ── Debounce sync de categories → Firestore ───────────────────────────────
  const syncTimerRef    = useRef(null);
  const lastSyncedRef   = useRef(null);
  const isLocalChange   = useRef(false);

  const syncedSetCategories = useCallback((updater) => {
    isLocalChange.current = true;
    setCategories(updater);
  }, []);

  useEffect(() => {
    if (!walletId || soloMode || !authUser || !isLocalChange.current) return;
    isLocalChange.current = false;
    clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      // evitar escrituras duplicadas
      const key = JSON.stringify(categories);
      if (key === lastSyncedRef.current) return;
      lastSyncedRef.current = key;
      try {
        await saveCategories(walletId, categories, authUser);
      } catch (e) {
        console.error('[Firestore save]', e);
        setSyncToast({ text: 'Error al sincronizar', type: 'error' });
        setTimeout(() => setSyncToast(null), 3000);
      }
    }, 800);
  }, [categories, walletId, soloMode, authUser]);

  // ── Handlers de perfil ─────────────────────────────────────────────────────
  const handleSetup = async (profileData) => {
    // 1. Guardar en localStorage (caché rápido)
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData)); } catch { /* ignore */ }

    // 2. Guardar en Firestore (persistencia cross-device)
    if (authUser) {
      saveUserProfile(authUser.uid, profileData).catch((e) =>
        console.warn('[Firestore] No se pudo guardar el perfil:', e)
      );
    }

    // 3. Sincronizar displayName en Firebase Auth
    if (authUser && profileData.name) {
      try {
        await updateProfile(authUser, { displayName: profileData.name });
        setAuthUser(prev => prev
          ? Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, { displayName: profileData.name })
          : prev
        );
      } catch (e) {
        console.warn('[Auth] No se pudo actualizar displayName:', e);
      }
    }

    setProfile(profileData);
  };

  const handleReset = () => {
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
    setProfile(null);
  };

  // ── Handlers de wallet ─────────────────────────────────────────────────────
  const handleWalletReady = (id) => {
    setLocalWalletId(id);
    setWalletId(id);
    setUserWallets(null); // ocultar selector
  };

  const handleLeaveWallet = () => {
    leaveWallet();
    clearLocalWalletId();
    setWalletId(null);
    setWalletData(null);
    setCategories([]);
  };

  // ── Cerrar sesión completamente → volver al login ──────────────────────────
  const handleSignOut = async () => {
    clearLocalWalletId();
    localStorage.removeItem('gastos_solo_mode');
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    setSoloModeS(false);
    await signOut(auth);
    // onAuthStateChanged limpia authUser, walletId, profile, etc.
  };

  // ── Cambiar de cartera (sin cerrar sesión) ──────────────────────────────────
  // Limpia la cartera activa y muestra el selector
  const handleChangeWallet = async () => {
    clearLocalWalletId();
    setWalletId(null);
    setWalletData(null);
    setCategories([]);
    // Recargar lista de carteras del usuario
    if (authUser) {
      setWalletsLoading(true);
      try {
        const wallets = await getUserWallets(authUser.uid);
        setUserWallets(wallets);
      } catch {
        setUserWallets([]);
      } finally {
        setWalletsLoading(false);
      }
    }
  };

  const handleEnterSolo = () => {
    setSoloModeS(true);
    setSoloMode(true);
  };

  // ── Share: cuando el usuario crea la cartera desde dentro de la app ────────
  const handleShareComplete = (newWalletId, user) => {
    // Si el usuario se logueó durante el modal, actualizamos el state de auth
    if (user && !authUser) setAuthUser(user);
    // Salir de modo solo y activar sync con Firestore
    setSoloModeS(false);
    setSoloMode(false);
    // Activar la cartera (dispara el useEffect de Firestore)
    setWalletId(newWalletId);
    setShowShareModal(false);
  };

  // ── Routing ────────────────────────────────────────────────────────────────

  // 1. Cargando estado de auth
  if (authUser === undefined) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  // 2. No autenticado y no eligió modo solo → AuthPage (Google Sign-In)
  if (!authUser && !soloMode) {
    return (
      <ErrorBoundary>
        <AuthPage onSoloMode={handleEnterSolo} />
      </ErrorBoundary>
    );
  }

  // 3a. Cargando lista de carteras del usuario
  if (authUser && !soloMode && !walletId && walletsLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-600 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Cargando tus carteras…</p>
        </div>
      </div>
    );
  }

  // 3b. Autenticado, sin cartera activa → WalletSelector (lista + crear + unirse)
  if (authUser && !soloMode && !walletId && userWallets !== null) {
    return (
      <ErrorBoundary>
        <WalletSelector
          user={authUser}
          userWallets={userWallets}
          initialCategories={[]}
          onWalletReady={handleWalletReady}
        />
      </ErrorBoundary>
    );
  }

  // 3c. Autenticado, sin cartera y userWallets todavía no cargó → WalletPage (fallback legacy / primer login)
  if (authUser && !soloMode && !walletId) {
    return (
      <ErrorBoundary>
        <WalletPage
          user={authUser}
          initialCategories={[]}
          onWalletReady={handleWalletReady}
          onSoloMode={handleEnterSolo}
        />
      </ErrorBoundary>
    );
  }

  // 4. Cargando datos de Firestore
  if (authUser && walletId && walletLoading && !profile) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-3">🔄</div>
          <p className="text-sm">Cargando cartera…</p>
          <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-400 rounded-full animate-spin mx-auto mt-3" />
        </div>
      </div>
    );
  }

  // 5. Sin perfil → SetupPage
  if (!profile) {
    return (
      <ErrorBoundary>
        <SetupPage onComplete={handleSetup} />
      </ErrorBoundary>
    );
  }

  // 6. Todo listo → App principal
  return (
    <ErrorBoundary>
      {/* Toast de sincronización */}
      {syncToast && (
        <div className={`
          fixed top-4 left-1/2 -translate-x-1/2 z-[100]
          px-4 py-2.5 rounded-xl shadow-lg text-sm font-medium
          flex items-center gap-2 pointer-events-none
          animate-fade-in-down
          ${syncToast.type === 'error'
            ? 'bg-red-900/90 text-red-200 border border-red-700'
            : 'bg-slate-800/90 text-slate-200 border border-slate-600'}
        `}>
          <span>{syncToast.type === 'sync' ? '🔄' : '⚠️'}</span>
          {syncToast.text}
        </div>
      )}

      {/* Modal para compartir cartera existente */}
      {showShareModal && (
        <ShareModal
          currentCategories={categories}
          initialAuthUser={authUser}
          onClose={() => setShowShareModal(false)}
          onShareComplete={handleShareComplete}
        />
      )}

      <GastosApp
        profile={profile}
        onReset={handleReset}
        categories={categories}
        setCategories={syncedSetCategories}
        walletData={walletData}
        authUser={authUser}
        onLeaveWallet={authUser ? handleSignOut : null}
        onChangeWallet={authUser ? handleChangeWallet : null}
        onShareRequest={!walletData ? () => setShowShareModal(true) : null}
      />
    </ErrorBoundary>
  );
}

// ─────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="bg-white/10 rounded-lg px-3 py-2">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`font-bold text-base ${color}`}>{value}</p>
      <p className="text-slate-400 text-xs">{sub}</p>
    </div>
  );
}

function PlanPhase({ phase, title, color, headerColor, textColor, items, totalSaving }) {
  return (
    <div className={`rounded-xl border-2 overflow-hidden shadow-sm ${color}`}>
      <div className={`flex justify-between items-center px-4 py-3 ${headerColor}`}>
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>{phase}</span>
          <p className={`font-semibold text-sm ${textColor}`}>{title}</p>
        </div>
        <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
          -{new Intl.NumberFormat("es-AR").format(totalSaving)}/mes
        </span>
      </div>
      <div className="divide-y divide-gray-100">
        {items.map((item, i) => (
          <div key={i} className="flex justify-between items-start px-4 py-3 bg-white/60">
            <div className="flex-1 pr-4">
              <p className="text-sm font-medium text-gray-700">{item.action}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
            </div>
            <span className="text-sm font-bold text-emerald-600 flex-shrink-0">
              -{new Intl.NumberFormat("es-AR").format(item.saving)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
