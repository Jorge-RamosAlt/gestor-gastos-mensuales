import React, { useState, useMemo, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut, updateProfile } from "firebase/auth";
import { auth } from "./lib/firebase.js";
import {
  getLocalWalletId, clearLocalWalletId, setLocalWalletId,
  getSoloMode, setSoloMode,
  saveCategories,
  subscribeToCategories, subscribeToWallet,
  createWallet,
  getUserWallets, registerWalletForUser,
  saveUserProfile, getUserProfile,
  subscribeToHistorial,
} from "./lib/firestoreService.js";
import { ToastProvider } from "./components/ui/ToastContainer.jsx";
import { useToast } from "./hooks/useToast.js";
import AuthPage       from "./components/auth/AuthPage.jsx";
import WalletPage     from "./components/wallet/WalletPage.jsx";
import WalletSelector from "./components/wallet/WalletSelector.jsx";
import SetupPage from "./components/gastos/SetupPage.jsx";
import ResetModal from "./components/gastos/ResetModal.jsx";
import ShareModal from "./components/gastos/ShareModal.jsx";
import WalletBar from "./components/wallet/WalletBar.jsx";
import GastosTab from "./components/gastos/GastosTab.jsx";
import { AppLoadingSkeleton } from "./components/ui/Skeleton.jsx";
import { exportToCSV, exportToExcel } from "./lib/exportUtils.js";

const CompareTab = lazy(() => import("./components/historial/CompareTab.jsx"));
const ImportTab  = lazy(() => import("./components/importar/ImportTab.jsx"));
const ChartPanel = lazy(() => import("./components/charts/ChartPanel.jsx"));
const PlanTab    = lazy(() => import("./components/gastos/PlanTab.jsx"));

import { fmt, pct, getCurrentMonthLabel } from "./lib/formatters.js";
import { exportToPDF } from "./lib/exportPDF.js";

const PROFILE_KEY   = "gastos_perfil_v1";
const HISTORY_KEY   = "gastos_historial_v1";

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
  catch (e) { if (import.meta.env.DEV) console.warn("[saveHistory]", e); }
}

const INITIAL_CATEGORIES = [];
const RECOMMENDATIONS = [];

function TabFallback() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-400 dark:text-slate-500">
      <div className="text-center space-y-2">
        <div className="animate-spin text-3xl">⚙️</div>
        <p className="text-sm">Cargando...</p>
      </div>
    </div>
  );
}

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

function SummaryCard({ label, value, sub, color, icon, border }) {
  return (
    <div className={`bg-white/10 dark:bg-slate-800 rounded-lg px-3 py-2 border ${border || "border-transparent"}`}>
      {icon && <span className="text-lg mb-1 block">{icon}</span>}
      <p className="text-slate-400 dark:text-slate-500 text-xs">{label}</p>
      <p className={`font-bold text-base ${color}`}>{value}</p>
      <p className="text-slate-400 dark:text-slate-500 text-xs">{sub}</p>
    </div>
  );
}

function GastosApp({ profile, onReset, categories, setCategories, walletData, authUser, onLeaveWallet, onChangeWallet, onShareRequest }) {
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const TARGET        = profile.salaryTarget;
  const SALARY_ACTUAL = profile.salaryActual;
  const SALARY_NUEVO  = profile.salaryTarget;

  const pathToTab = {
    '/': 'gastos',
    '/graficos': 'graficos',
    '/historial': 'comparar',
    '/importar': 'importar',
    '/exportar': 'exportar',
    '/tips': 'recomendaciones',
    '/plan': 'plan',
  };

  const tabToPath = {
    'gastos': '/',
    'graficos': '/graficos',
    'comparar': '/historial',
    'importar': '/importar',
    'exportar': '/exportar',
    'recomendaciones': '/tips',
    'plan': '/plan',
  };

  const activeTab = pathToTab[location.pathname] || 'gastos';
  const [isFullscreen, setIsFullscreen]     = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [darkMode, setDarkMode]             = useState(() => localStorage.getItem('darkMode') === 'true');
  const [firestoreHistory, setFirestoreHistory] = useState(null); // null = no wallet, [] = empty
  const [exportLoading, setExportLoading]   = useState(false);
  const [showAddCat, setShowAddCat]         = useState(false);
  const [newCatName, setNewCatName]         = useState("");

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Suscribir a historial de Firestore si hay cartera colaborativa
  useEffect(() => {
    if (!walletData?.id) { setFirestoreHistory(null); return; }
    const unsub = subscribeToHistorial(
      walletData.id,
      (entries) => setFirestoreHistory(entries),
      (err) => { if (import.meta.env.DEV) console.warn("[GastosApp] historial error", err); }
    );
    return unsub;
  }, [walletData?.id]);

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return;
    const icons  = ["📦","🏠","🚗","🍽️","🛒","💊","🎓","✈️","👕","🐾"];
    const colors = [
      "bg-violet-50 border-violet-300","bg-cyan-50 border-cyan-300",
      "bg-orange-50 border-orange-300","bg-pink-50 border-pink-300",
    ];
    const headers = [
      "bg-violet-100","bg-cyan-100","bg-orange-100","bg-pink-100",
    ];
    const texts = [
      "text-violet-800","text-cyan-800","text-orange-800","text-pink-800",
    ];
    const idx = Math.floor(Math.random() * 4);
    const newCat = {
      id: `cat_${Date.now()}`,
      name: `${icons[Math.floor(Math.random() * icons.length)]} ${name}`,
      icon: icons[Math.floor(Math.random() * icons.length)],
      locked: false,
      color:       colors[idx],
      headerColor: headers[idx],
      textColor:   texts[idx],
      items: [],
    };
    setCategories(prev => [...prev, newCat]);
    setNewCatName("");
    setShowAddCat(false);
  };

  const handleExportCSV = () => {
    const monthLabel_ = getCurrentMonthLabel();
    exportToCSV(categories, profile, monthLabel_);
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const monthLabel_ = getCurrentMonthLabel();
      await exportToExcel(categories, profile, monthLabel_);
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportPDF = () => {
    const monthLabel_ = getCurrentMonthLabel();
    exportToPDF(categories, profile, monthLabel_);
  };

  const handleCloneMonth = (clonedCategories) => {
    const cleaned = clonedCategories.map(cat => ({
      ...cat,
      items: cat.items
        .filter(item => !item.done)           // exclude items marked as done
        .map(item => ({ ...item, done: false })) // reset done flag on carried items
    }));
    setCategories(cleaned);
    const removedCount = clonedCategories.reduce(
      (acc, cat) => acc + cat.items.filter(i => i.done).length, 0
    );
    if (removedCount > 0) {
      toast.success(`✅ Mes copiado — ${removedCount} gasto${removedCount !== 1 ? 's' : ''} resuelto${removedCount !== 1 ? 's' : ''} no copiado${removedCount !== 1 ? 's' : ''}`);
    } else {
      toast.success('Categorías del mes anterior copiadas ✅');
    }
  };

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
    toast.success(`✅ ${items.length} gastos importados en "${newCat.name}"`);
    navigate('/');
  }, [setCategories, toast, navigate]);

  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

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

  const monthLabel_ = getCurrentMonthLabel();

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 font-sans">

        {showResetModal && (
          <ResetModal
            onConfirm={() => { setShowResetModal(false); onReset(); }}
            onCancel={() => setShowResetModal(false)}
          />
        )}


        {/* ─── HEADER ─── */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-900 dark:to-slate-800 text-white px-4 sm:px-6 py-5 shadow-lg">
          <div className="max-w-5xl mx-auto">

            {/* Title row */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold mb-1">
                  📊 Análisis de Gastos — {monthLabel_.charAt(0).toUpperCase() + monthLabel_.slice(1)}
                </h1>
                <p className="text-slate-300 text-xs sm:text-sm">
                  {profile.name} · De {fmt(SALARY_ACTUAL)} → {fmt(SALARY_NUEVO)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-start sm:justify-end">
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  title="Alternar modo oscuro"
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-lg transition border border-white/20"
                >
                  {darkMode ? '☀️' : '🌙'}
                </button>
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
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-lg transition border border-white/20 hidden sm:flex"
                >
                  {isFullscreen ? <><IconCompress /> Salir</> : <><IconExpand /> Pantalla</>}
                </button>
              </div>
            </div>

            {walletData && (
              <WalletBar
                walletData={walletData}
                authUser={authUser}
                onChangeWallet={onChangeWallet}
                onLeave={onLeaveWallet}
              />
            )}

            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-2 md:gap-3 md:grid-cols-4">
              <SummaryCard
                label="Sueldo actual"
                value={fmt(SALARY_ACTUAL)}
                sub="Este mes"
                color="text-emerald-400"
                icon="💰"
                border="border-emerald-500/30"
              />
              <SummaryCard
                label="Sueldo objetivo"
                value={fmt(SALARY_NUEVO)}
                sub="Meta laboral"
                color="text-yellow-300"
                icon="🎯"
                border="border-yellow-500/30"
              />
              <SummaryCard
                label="Gastos totales"
                value={fmt(total)}
                sub={`${pct(total, SALARY_ACTUAL)}% del sueldo`}
                color={total > TARGET ? "text-red-400" : "text-emerald-400"}
                icon="📈"
                border={total > TARGET ? "border-red-500/30" : "border-emerald-500/30"}
              />
              <SummaryCard
                label={gap > 0 ? "Hay que reducir" : "¡Dentro del target!"}
                value={fmt(Math.abs(gap))}
                sub={gap > 0 ? `para llegar a ${fmt(TARGET)}` : "✅ Objetivo cumplido"}
                color={gap > 0 ? "text-red-400" : "text-emerald-400"}
                icon={gap > 0 ? "⚠️" : "✅"}
                border={gap > 0 ? "border-red-500/30" : "border-green-500/30"}
              />
            </div>

            {/* Progress bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1">
                <span>$0</span>
                <span className="text-yellow-300 font-semibold">TARGET: {fmt(TARGET)}</span>
                <span>{fmt(total)}</span>
              </div>
              <div className="relative h-4 bg-slate-600 dark:bg-slate-700 rounded-full overflow-hidden">
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
                <span className="text-slate-400 dark:text-slate-500">Target: {fmt(TARGET)}</span>
              </div>
            </div>

          </div>
        </div>

        {/* ─── TABS ─── */}
        <div className="max-w-5xl mx-auto px-4 mt-4 pb-20 md:pb-0">
          <div className="flex gap-2 border-b border-gray-200 dark:border-slate-700 mb-4 overflow-x-auto">
            {[
              { id: "gastos",          label: "📋 Mis Gastos", path: "/" },
              { id: "graficos",        label: "📊 Gráficos", path: "/graficos" },
              { id: "comparar",        label: "🗓️ Historial", path: "/historial" },
              { id: "importar",        label: "📂 Importar", path: "/importar" },
              { id: "exportar",        label: "⬇️ Exportar", path: "/exportar" },
              { id: "recomendaciones", label: "💡 Tips", path: "/tips" },
              { id: "plan",            label: "🎯 Plan", path: "/plan" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-blue-600 text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-800"
                    : "border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-300"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── Routes ─── */}
          <Suspense fallback={<TabFallback />}>
            <Routes>
              <Route path="/" element={
              <div>
                <GastosTab
                  categories={categories}
                  setCategories={setCategories}
                  total={total}
                  TARGET={TARGET}
                />
                {/* Agregar categoría */}
                <div className="mt-4 pb-8">
                  {showAddCat ? (
                    <div className="flex items-center gap-2 p-3 bg-white dark:bg-slate-800 border-2 border-dashed border-blue-300 dark:border-blue-700 rounded-xl">
                      <input
                        autoFocus
                        className="flex-1 text-sm border border-gray-200 dark:border-slate-600 dark:bg-slate-700 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Nombre de la categoría..."
                        value={newCatName}
                        onChange={e => setNewCatName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === "Enter") handleAddCategory();
                          if (e.key === "Escape") { setShowAddCat(false); setNewCatName(""); }
                        }}
                      />
                      <button
                        onClick={handleAddCategory}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition"
                      >Crear</button>
                      <button
                        onClick={() => { setShowAddCat(false); setNewCatName(""); }}
                        className="text-gray-400 hover:text-gray-600 dark:text-slate-500 dark:hover:text-slate-300 text-lg font-bold px-2"
                      >×</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowAddCat(true)}
                      className="w-full border-2 border-dashed border-gray-300 dark:border-slate-600 text-gray-400 dark:text-slate-500 hover:border-blue-400 hover:text-blue-500 dark:hover:border-blue-500 dark:hover:text-blue-400 rounded-xl py-3 text-sm font-medium transition"
                    >
                      ＋ Agregar categoría
                    </button>
                  )}
                </div>
              </div>
            } />
            <Route path="/graficos" element={
              <ChartPanel
                categories={categories}
                history={firestoreHistory ?? []}
                target={TARGET}
                salary={SALARY_ACTUAL}
              />
            } />
            <Route path="/historial" element={
              <CompareTab
                categories={categories}
                target={TARGET}
                walletId={walletData?.id ?? null}
                firestoreHistory={firestoreHistory}
                onCloneMonth={handleCloneMonth}
              />
            } />
            <Route path="/importar" element={
              <ImportTab
                categories={categories}
                onImport={handleImport}
              />
            } />
            <Route path="/exportar" element={
              <div className="pb-8 space-y-4">
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm p-6">
                  <h3 className="font-bold text-gray-700 dark:text-slate-200 text-base mb-1">⬇️ Exportar gastos del mes</h3>
                  <p className="text-sm text-gray-400 dark:text-slate-500 mb-6">
                    Descargá tus gastos de {getCurrentMonthLabel()} en el formato que prefieras.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      onClick={handleExportCSV}
                      className="flex items-center gap-3 p-4 border-2 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/30 rounded-xl hover:border-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 transition text-left"
                    >
                      <span className="text-3xl">📄</span>
                      <div>
                        <p className="font-bold text-green-700 dark:text-green-400 text-sm">Exportar CSV</p>
                        <p className="text-xs text-green-600 dark:text-green-500">Compatible con Excel, Google Sheets</p>
                      </div>
                    </button>
                    <button
                      onClick={handleExportExcel}
                      disabled={exportLoading}
                      className="flex items-center gap-3 p-4 border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 rounded-xl hover:border-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition text-left disabled:opacity-50"
                    >
                      <span className="text-3xl">📊</span>
                      <div>
                        <p className="font-bold text-blue-700 dark:text-blue-400 text-sm">
                          {exportLoading ? "Generando..." : "Exportar Excel (.xlsx)"}
                        </p>
                        <p className="text-xs text-blue-600 dark:text-blue-500">Con formato, colores y totales</p>
                      </div>
                    </button>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-3 p-4 border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/30 rounded-xl hover:border-purple-400 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition text-left"
                    >
                      <span className="text-3xl">🖨️</span>
                      <div>
                        <p className="font-bold text-purple-700 dark:text-purple-400 text-sm">Exportar PDF / Imprimir</p>
                        <p className="text-xs text-purple-600 dark:text-purple-500">Resumen visual listo para imprimir</p>
                      </div>
                    </button>
                  </div>
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      📌 El archivo incluye: {categories.length} categorías,{" "}
                      {categories.reduce((s, c) => s + c.items.length, 0)} ítems,{" "}
                      total {fmt(total)}
                    </p>
                  </div>
                </div>
              </div>
            } />
            <Route path="/tips" element={
              <div className="pb-8 space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Si aplicás <strong>todas las recomendaciones</strong>, el ahorro potencial es de{" "}
                    <strong>{fmt(totalRec)}</strong>. Tus gastos bajarían a aproximadamente{" "}
                    <strong className={postRecTotal <= TARGET ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>
                      {fmt(postRecTotal)}
                    </strong>{" "}
                    {postRecTotal <= TARGET ? "✅ — ¡dentro del objetivo!" : `— todavía ${fmt(postRecTotal - TARGET)} sobre el target`}.
                  </p>
                </div>
                <p className="text-center text-gray-500 dark:text-slate-400 py-8">No hay recomendaciones configuradas aún</p>
              </div>
            } />
            <Route path="/plan" element={
              <PlanTab total={total} TARGET={TARGET} />
            } />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>

        </div>

        {/* Mobile bottom navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 flex safe-area-inset-bottom">
          {[
            { path: '/', icon: '💸', label: 'Gastos' },
            { path: '/graficos', icon: '📊', label: 'Gráficos' },
            { path: '/historial', icon: '📅', label: 'Historial' },
            { path: '/plan', icon: '🎯', label: 'Plan' },
          ].map(tab => {
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200'
                }`}
              >
                <span className="text-xl leading-none">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (import.meta.env.DEV) console.error('[GastosApp] ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Algo salió mal</h2>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-2">
            Ocurrió un error inesperado en la aplicación.
          </p>
          <p className="text-gray-400 dark:text-slate-500 text-xs mb-6 font-mono bg-gray-50 dark:bg-slate-700 rounded-lg px-3 py-2">
            {this.state.error?.message || 'Error desconocido'}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-slate-700 hover:bg-slate-600 dark:bg-slate-600 dark:hover:bg-slate-500 text-white font-bold px-5 py-2.5 rounded-xl transition text-sm"
            >
              Reintentar
            </button>
            <button
              onClick={() => window.location.reload()}
              className="border-2 border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition text-sm"
            >
              Recargar página
            </button>
          </div>
          <p className="text-xs text-gray-300 dark:text-slate-500 mt-4">
            Tus datos están seguros en el almacenamiento local del navegador.
          </p>
        </div>
      </div>
    );
  }
}

function App() {
  const [authUser,    setAuthUser]    = useState(undefined);
  const [soloMode,    setSoloModeS]   = useState(getSoloMode);
  const [walletId,      setWalletId]      = useState(getLocalWalletId);
  const [walletData,    setWalletData]    = useState(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [userWallets,    setUserWallets]    = useState(null);
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [categories,     setCategories]     = useState([]);
  const [externalUpdate, setExternalUpdate] = useState(null);

  const [profile, setProfile] = useState(() => {
    try {
      const saved = localStorage.getItem(PROFILE_KEY);
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      if (!parsed?.name || !parsed?.salaryActual || !parsed?.salaryTarget) return null;
      return parsed;
    } catch { return null; }
  });

  const [showShareModal, setShowShareModal] = useState(false);
  const appToast = useToast();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAuthUser(null);
        setUserWallets(null);
        setWalletId(null);
        setWalletData(null);
        setProfile(null);
        setCategories([]);
        return;
      }

      setAuthUser(user);

      try {
        const firestoreProfile = await getUserProfile(user.uid);
        if (firestoreProfile) {
          setProfile(firestoreProfile);
          localStorage.setItem(PROFILE_KEY, JSON.stringify(firestoreProfile));
          if (firestoreProfile.name && firestoreProfile.name !== user.displayName) {
            updateProfile(user, { displayName: firestoreProfile.name }).catch(() => {});
          }
        }
      } catch (err) {
        if (import.meta.env.DEV) console.warn('[Auth] No se pudo cargar el perfil:', err);
      }

      if (getLocalWalletId() && !getSoloMode()) {
        setWalletId(getLocalWalletId());
        return;
      }

      if (!getSoloMode()) {
        setWalletsLoading(true);
        try {
          const wallets = await getUserWallets(user.uid);
          setUserWallets(wallets);
        } catch (err) {
          if (import.meta.env.DEV) console.warn('[Auth] No se pudo cargar carteras:', err);
          setUserWallets([]);
        } finally {
          setWalletsLoading(false);
        }
      }
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!walletId || soloMode) return;

    let unsubWallet = null;
    let unsubCats = null;
    setWalletLoading(true);

    unsubWallet = subscribeToWallet(
      walletId,
      (data) => {
        setWalletData(data);
        if (authUser?.uid && data?.name) {
          registerWalletForUser(authUser.uid, walletId, data.name).catch(() => {});
        }
      },
      () => {}
    );

    let firstLoad = true;
    unsubCats = subscribeToCategories(
      walletId,
      (data) => {
        setWalletLoading(false);
        if (firstLoad) {
          setCategories(data.categories ?? []);
          firstLoad = false;
        } else {
          setExternalUpdate(data);
          if (data.updatedBy !== authUser?.uid) {
            const name = data.updatedByName ?? 'Alguien';
            appToast.info(`${name} actualizó los gastos`);
          }
        }
      },
      (err) => {
        if (import.meta.env.DEV) console.error('[Firestore/categories]', err);
        setWalletLoading(false);
      }
    );

    return () => {
      unsubCats?.();
      unsubWallet?.();
    };
  }, [walletId, soloMode]);

  useEffect(() => {
    if (!externalUpdate) return;
    setCategories(externalUpdate.categories ?? []);
    setExternalUpdate(null);
  }, [externalUpdate]);

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
      const key = JSON.stringify(categories);
      if (key === lastSyncedRef.current) return;
      lastSyncedRef.current = key;
      try {
        await saveCategories(walletId, categories, authUser);
      } catch (e) {
        if (import.meta.env.DEV) console.error('[Firestore/save]', e);
        appToast.error('Error al sincronizar');
      }
    }, 800);
  }, [categories, walletId, soloMode, authUser]);

  const handleSetup = async (profileData) => {
    try { localStorage.setItem(PROFILE_KEY, JSON.stringify(profileData)); } catch { /* ignore */ }

    if (authUser) {
      saveUserProfile(authUser.uid, profileData).catch((e) => {
        if (import.meta.env.DEV) console.warn('[Firestore/saveProfile]', e);
      });
    }

    if (authUser && profileData.name) {
      try {
        await updateProfile(authUser, { displayName: profileData.name });
        setAuthUser(prev => prev
          ? Object.assign(Object.create(Object.getPrototypeOf(prev)), prev, { displayName: profileData.name })
          : prev
        );
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[Auth/displayName]', e);
      }
    }

    setProfile(profileData);
  };

  const handleReset = () => {
    try { localStorage.removeItem(PROFILE_KEY); } catch { /* ignore */ }
    setProfile(null);
  };

  const handleWalletReady = (id) => {
    setLocalWalletId(id);
    setWalletId(id);
    setUserWallets(null);
  };

  const handleSignOut = async () => {
    clearLocalWalletId();
    localStorage.removeItem('gastos_solo_mode');
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(HISTORY_KEY);
    setSoloModeS(false);
    await signOut(auth);
  };

  const handleChangeWallet = async () => {
    clearLocalWalletId();
    setWalletId(null);
    setWalletData(null);
    setCategories([]);
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

  const handleShareComplete = (newWalletId, user) => {
    if (user && !authUser) setAuthUser(user);
    setSoloModeS(false);
    setSoloMode(false);
    setWalletId(newWalletId);
    setShowShareModal(false);
  };

  if (authUser === undefined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <AppLoadingSkeleton />
      </div>
    );
  }

  if (!authUser && !soloMode) {
    return (
      <ErrorBoundary>
        <AuthPage onSoloMode={handleEnterSolo} />
      </ErrorBoundary>
    );
  }

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

  if (!profile) {
    return (
      <ErrorBoundary>
        <SetupPage onComplete={handleSetup} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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

function AppWrapper() {
  return (
    <ToastProvider>
      <App />
    </ToastProvider>
  );
}

export default AppWrapper;
