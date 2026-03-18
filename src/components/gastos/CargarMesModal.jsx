/**
 * CargarMesModal.jsx
 * Wizard para cargar el mes:
 *   Paso 0 — Cierre de mes (guardar historial / limpiar) — solo si hay gastos cargados
 *   Paso 1 — Gastos Fijos (Gastos.xlsx)
 *   Paso 2 — Tarjeta de Crédito (PDF BBVA)
 */
import React, { useState, useRef } from 'react';
import { fmt } from '../../lib/formatters.js';
import { parseGastosExcel } from '../../lib/parsers/excelParser.js';
import { parseBBVAPDF } from '../../lib/parsers/bbvaParser.js';

// ─── Color per category ───────────────────────────────────────────────────────
const CAT_COLORS = {
  'Peajes':          { bg: '#f0fdf4', border: '#86efac', header: '#dcfce7', text: '#166534' },
  'Nafta':           { bg: '#fff7ed', border: '#fdba74', header: '#ffedd5', text: '#9a3412' },
  'Suscripciones':   { bg: '#faf5ff', border: '#d8b4fe', header: '#f3e8ff', text: '#6b21a8' },
  'Celular':         { bg: '#eff6ff', border: '#93c5fd', header: '#dbeafe', text: '#1e40af' },
  'Estacionamiento': { bg: '#f0fdfa', border: '#5eead4', header: '#ccfbf1', text: '#115e59' },
  'Comidas':         { bg: '#fefce8', border: '#fde047', header: '#fef9c3', text: '#854d0e' },
  'Seguridad':       { bg: '#fff1f2', border: '#fda4af', header: '#ffe4e6', text: '#9f1239' },
  'Salud':           { bg: '#ecfdf5', border: '#6ee7b7', header: '#d1fae5', text: '#065f46' },
  'MercadoPago':     { bg: '#eff6ff', border: '#93c5fd', header: '#dbeafe', text: '#1e40af' },
  'Transporte':      { bg: '#f0f9ff', border: '#7dd3fc', header: '#e0f2fe', text: '#0c4a6e' },
  'Delivery':        { bg: '#fff7ed', border: '#fdba74', header: '#ffedd5', text: '#9a3412' },
  'Otros':           { bg: '#f9fafb', border: '#d1d5db', header: '#f3f4f6', text: '#1f2937' },
};

function catColor(cat) {
  return CAT_COLORS[cat] || CAT_COLORS['Otros'];
}

// ─── Small helpers ─────────────────────────────────────────────────────────────
function DropZone({ onFile, accept, label, sublabel, icon }) {
  const ref = useRef(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      onDragOver={e => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onClick={() => ref.current?.click()}
      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
        ${dragging ? 'border-blue-500 bg-blue-50 scale-[1.01]' : 'border-gray-300 bg-gray-50 hover:border-blue-400 hover:bg-blue-50/40'}`}
    >
      <input ref={ref} type="file" className="hidden" accept={accept}
        onChange={e => { if (e.target.files[0]) onFile(e.target.files[0]); e.target.value = ''; }} />
      <div className="text-4xl mb-2">{dragging ? '📂' : icon}</div>
      <p className="font-semibold text-gray-700 text-sm mb-1">{dragging ? 'Soltá el archivo' : label}</p>
      <p className="text-gray-400 text-xs">{sublabel}</p>
    </div>
  );
}

function AmountCell({ amount, onChange }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(amount));

  if (editing) {
    return (
      <input
        autoFocus
        className="w-28 border rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-400"
        value={val}
        onChange={e => setVal(e.target.value.replace(/\D/g, ''))}
        onBlur={() => { setEditing(false); const n = parseInt(val, 10); if (!isNaN(n)) onChange(n); }}
        onKeyDown={e => {
          if (e.key === 'Enter') { setEditing(false); const n = parseInt(val, 10); if (!isNaN(n)) onChange(n); }
          if (e.key === 'Escape') setEditing(false);
        }}
      />
    );
  }
  return (
    <button
      className="text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg transition border border-blue-200"
      onClick={() => { setVal(String(amount)); setEditing(true); }}
      title="Clic para editar"
    >{fmt(amount)}</button>
  );
}

// ─── Step 0: Cierre de mes ────────────────────────────────────────────────────
function StepPrecheck({ currentMonthLabel, onSaveAndClean, onSaveOnly, onSkip }) {
  return (
    <div className="p-6 space-y-5">
      <div className="text-center">
        <div className="text-5xl mb-3">📅</div>
        <h3 className="font-bold text-gray-800 text-lg mb-1">
          Antes de cargar el nuevo mes…
        </h3>
        <p className="text-gray-500 text-sm leading-relaxed">
          Tenés gastos de <strong className="text-gray-700">{currentMonthLabel}</strong> cargados.
          <br />¿Qué hacemos con ellos?
        </p>
      </div>

      <div className="space-y-3">
        {/* Option A: save + clean */}
        <button
          onClick={onSaveAndClean}
          className="w-full flex items-center gap-4 p-4 border-2 border-emerald-200 bg-emerald-50 hover:border-emerald-400 hover:bg-emerald-100 rounded-xl transition text-left group"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform">💾</span>
          <div className="flex-1">
            <p className="font-bold text-emerald-700 text-sm">
              Guardar {currentMonthLabel} y empezar limpio
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              Se archiva en el historial y se borran los gastos actuales — flujo normal de cierre de mes
            </p>
          </div>
          <span className="text-emerald-400 text-lg">→</span>
        </button>

        {/* Option B: save only */}
        <button
          onClick={onSaveOnly}
          className="w-full flex items-center gap-4 p-4 border-2 border-blue-200 bg-blue-50 hover:border-blue-400 hover:bg-blue-100 rounded-xl transition text-left group"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform">📋</span>
          <div className="flex-1">
            <p className="font-bold text-blue-700 text-sm">
              Solo guardar en el historial
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Se archiva pero los gastos actuales se mantienen — útil para agregar más gastos al mes
            </p>
          </div>
          <span className="text-blue-400 text-lg">→</span>
        </button>

        {/* Option C: skip */}
        <button
          onClick={onSkip}
          className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100 rounded-xl transition text-left group"
        >
          <span className="text-3xl group-hover:scale-110 transition-transform">⏭️</span>
          <div className="flex-1">
            <p className="font-bold text-gray-600 text-sm">
              Continuar sin guardar
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Los nuevos gastos se agregan encima de los actuales
            </p>
          </div>
          <span className="text-gray-300 text-lg">→</span>
        </button>
      </div>
    </div>
  );
}

// ─── Step 1: Gastos Fijos ──────────────────────────────────────────────────────
function StepExcel({ onDone }) {
  const [status, setStatus] = useState('idle'); // idle | loading | done | error
  const [items, setItems] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');

  const handleFile = async (file) => {
    if (!file.name.match(/\.xlsx$/i)) {
      setErrorMsg('El archivo debe ser .xlsx');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const result = await parseGastosExcel(file);
      setItems(result);
      setStatus('done');
    } catch (e) {
      setErrorMsg(e.message || 'Error al leer el archivo.');
      setStatus('error');
    }
  };

  const toggle = (key) => setItems(prev => prev.map(i => i.key === key ? { ...i, selected: !i.selected } : i));
  const updateAmount = (key, amount) => setItems(prev => prev.map(i => i.key === key ? { ...i, amount } : i));
  const selectedItems = items.filter(i => i.selected);
  const total = selectedItems.reduce((s, i) => s + i.amount, 0);

  if (status === 'idle') {
    return (
      <DropZone
        onFile={handleFile}
        accept=".xlsx"
        icon="📊"
        label="Subí el archivo Gastos.xlsx"
        sublabel="Se extraen automáticamente los 7 gastos fijos del último mes"
      />
    );
  }

  if (status === 'loading') {
    return (
      <div className="text-center py-10">
        <div className="text-4xl animate-spin mb-3">⚙️</div>
        <p className="text-gray-500 text-sm">Leyendo Excel…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">❌</div>
        <p className="text-red-600 text-sm mb-3">{errorMsg}</p>
        <button onClick={() => setStatus('idle')} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex items-center justify-between">
        <p className="text-sm text-green-700 font-medium">
          ✅ {selectedItems.length} ítems seleccionados · Total: <strong>{fmt(total)}</strong>
        </p>
        <button onClick={() => setStatus('idle')} className="text-xs text-green-600 underline">
          Cambiar archivo
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-3 py-2 w-8"></th>
              <th className="px-3 py-2 text-left text-gray-600 font-semibold">Gasto</th>
              <th className="px-3 py-2 text-center text-gray-600 font-semibold">Último mes</th>
              <th className="px-3 py-2 text-right text-gray-600 font-semibold">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.key} className={`transition ${item.selected ? 'bg-white' : 'bg-gray-50 opacity-50'}`}>
                <td className="px-3 py-2">
                  <input type="checkbox" checked={item.selected} onChange={() => toggle(item.key)}
                    className="rounded accent-blue-500" />
                </td>
                <td className="px-3 py-2">
                  <span className="mr-1.5">{item.icon}</span>
                  <span className="font-medium text-gray-700">{item.label}</span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.colLabel}</span>
                </td>
                <td className="px-3 py-2 text-right">
                  <AmountCell amount={item.amount} onChange={v => updateAmount(item.key, v)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-center">
        💡 Hacé clic en el monto para actualizarlo si cambió este mes.
      </p>

      <button
        onClick={() => onDone(selectedItems)}
        disabled={!selectedItems.length}
        className={`w-full font-bold py-3 rounded-xl transition text-sm ${
          selectedItems.length
            ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {selectedItems.length ? `Agregar ${selectedItems.length} gastos fijos →` : 'Seleccioná al menos un ítem'}
      </button>
    </div>
  );
}

// ─── Step 2: Tarjeta (PDF) ────────────────────────────────────────────────────
function StepPDF({ onDone }) {
  const [status, setStatus] = useState('idle');
  const [arsTxs, setArsTxs] = useState([]);
  const [usdTxs, setUsdTxs] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [showUSD, setShowUSD] = useState(false);

  const handleFile = async (file) => {
    if (!file.name.match(/\.pdf$/i)) {
      setErrorMsg('El archivo debe ser un PDF.');
      setStatus('error');
      return;
    }
    setStatus('loading');
    try {
      const result = await parseBBVAPDF(file);
      setArsTxs(result.arsTxs);
      setUsdTxs(result.usdTxs);
      setStatus('done');
    } catch (e) {
      setErrorMsg(e.message || 'Error al procesar el PDF.');
      setStatus('error');
    }
  };

  const toggleArs = (id) => setArsTxs(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const updateArsAmount = (id, pesos) => setArsTxs(prev => prev.map(i => i.id === id ? { ...i, pesos } : i));
  const toggleUsd = (id) => setUsdTxs(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const updateUsdAmount = (id, pesos) => setUsdTxs(prev => prev.map(i => i.id === id ? { ...i, pesos } : i));

  const selectedArs = arsTxs.filter(i => i.selected);
  const selectedUsd = usdTxs.filter(i => i.selected);
  const totalArs = selectedArs.reduce((s, i) => s + i.pesos, 0);

  const byCategory = {};
  for (const tx of arsTxs) {
    if (!byCategory[tx.cat]) byCategory[tx.cat] = [];
    byCategory[tx.cat].push(tx);
  }

  if (status === 'idle') {
    return (
      <DropZone
        onFile={handleFile}
        accept=".pdf"
        icon="💳"
        label="Subí el resumen de tarjeta (PDF)"
        sublabel="BBVA Visa / Master — se agrupan peajes y se auto-categorizan los gastos"
      />
    );
  }

  if (status === 'loading') {
    return (
      <div className="text-center py-10">
        <div className="text-4xl animate-spin mb-3">⚙️</div>
        <p className="text-gray-500 text-sm">Analizando PDF…</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="text-center py-6">
        <div className="text-3xl mb-2">❌</div>
        <p className="text-red-600 text-sm mb-3">{errorMsg}</p>
        <button onClick={() => setStatus('idle')} className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-lg">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-2 flex items-center justify-between">
        <p className="text-sm text-green-700 font-medium">
          ✅ {selectedArs.length} ítems · Total en $: <strong>{fmt(totalArs)}</strong>
          {usdTxs.length > 0 && <span className="ml-2 text-green-600"> · {usdTxs.length} en USD</span>}
        </p>
        <button onClick={() => setStatus('idle')} className="text-xs text-green-600 underline">
          Cambiar PDF
        </button>
      </div>

      {Object.entries(byCategory).map(([cat, txs]) => {
        const color = catColor(cat);
        const catTotal = txs.filter(t => t.selected).reduce((s, t) => s + t.pesos, 0);
        return (
          <div key={cat} className="rounded-xl border-2 overflow-hidden"
            style={{ borderColor: color.border }}>
            <div className="px-3 py-2 flex items-center justify-between"
              style={{ backgroundColor: color.header }}>
              <span className="font-semibold text-sm" style={{ color: color.text }}>
                {txs[0]?.icon} {cat}
              </span>
              <span className="text-xs font-bold" style={{ color: color.text }}>{fmt(catTotal)}</span>
            </div>
            <div className="divide-y divide-gray-100" style={{ backgroundColor: color.bg }}>
              {txs.map(tx => (
                <div key={tx.id} className={`flex items-center gap-2 px-3 py-2 ${tx.selected ? '' : 'opacity-50'}`}>
                  <input type="checkbox" checked={tx.selected} onChange={() => toggleArs(tx.id)}
                    className="rounded accent-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{tx.description}</p>
                    <p className="text-xs text-gray-400">{tx.date}</p>
                  </div>
                  <AmountCell amount={tx.pesos} onChange={v => updateArsAmount(tx.id, v)} />
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {usdTxs.length > 0 && (
        <div className="rounded-xl border-2 border-amber-200 overflow-hidden">
          <button
            className="w-full px-3 py-2 flex items-center justify-between bg-amber-50 hover:bg-amber-100 transition"
            onClick={() => setShowUSD(!showUSD)}
          >
            <span className="font-semibold text-sm text-amber-700">💱 Gastos en USD ({usdTxs.length})</span>
            <span className="text-xs text-amber-600">{showUSD ? '▲ Ocultar' : '▼ Ver — monto en $ a completar'}</span>
          </button>
          {showUSD && (
            <div className="divide-y divide-amber-100 bg-amber-50/50">
              {usdTxs.map(tx => (
                <div key={tx.id} className={`flex items-center gap-2 px-3 py-2 ${tx.selected ? '' : 'opacity-50'}`}>
                  <input type="checkbox" checked={tx.selected} onChange={() => toggleUsd(tx.id)}
                    className="rounded accent-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{tx.description}</p>
                    <p className="text-xs text-amber-600">{tx.date} · USD {tx.pesos}</p>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <AmountCell amount={tx.pesos} onChange={v => updateUsdAmount(tx.id, v)} />
                    <span className="text-xs text-amber-500">ingresá monto en $</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-gray-400 text-center">
        💡 Hacé clic en cualquier monto para editarlo. Los gastos en USD necesitan el equivalente en pesos.
      </p>

      <button
        onClick={() => onDone({ arsTxs: selectedArs, usdTxs: selectedUsd })}
        disabled={!selectedArs.length && !selectedUsd.length}
        className={`w-full font-bold py-3 rounded-xl transition text-sm ${
          selectedArs.length || selectedUsd.length
            ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white'
            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
        }`}
      >
        {(selectedArs.length + selectedUsd.length) > 0
          ? `Agregar ${selectedArs.length + selectedUsd.length} transacciones →`
          : 'Seleccioná al menos una transacción'}
      </button>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
export default function CargarMesModal({
  onClose,
  onImport,
  onSaveCurrentMonth,
  onClearCategories,
  currentMonthLabel,
  hasExistingData,
}) {
  // 'precheck' only if there's data to archive; otherwise go straight to 'tabs'
  const [step, setStep]           = useState(hasExistingData ? 'precheck' : 'tabs');
  const [savedLabel, setSavedLabel] = useState(null);
  const [activeTab, setActiveTab] = useState('excel');
  const [doneExcel, setDoneExcel] = useState(false);
  const [donePDF, setDonePDF]     = useState(false);

  // ── Precheck handlers ──────────────────────────────────────────────────────
  const handleSaveAndClean = () => {
    onSaveCurrentMonth?.();
    onClearCategories?.();
    setSavedLabel(currentMonthLabel);
    setStep('tabs');
  };

  const handleSaveOnly = () => {
    onSaveCurrentMonth?.();
    setSavedLabel(currentMonthLabel);
    setStep('tabs');
  };

  const handleSkip = () => {
    setStep('tabs');
  };

  // ── Import handlers ────────────────────────────────────────────────────────
  const handleExcelDone = (items) => {
    const cat = {
      id: `gastos_fijos_${Date.now()}`,
      name: '📋 Gastos Fijos',
      icon: '📋',
      locked: false,
      color: 'bg-blue-50 border-blue-300',
      items: items.map(i => ({
        id: `fixed_${i.key}_${Date.now()}`,
        name: `${i.icon} ${i.label}`,
        amount: i.amount,
        locked: false,
        recurring: true,
      })),
    };
    onImport([cat]);
    setDoneExcel(true);
    setActiveTab('pdf');
  };

  const handlePDFDone = ({ arsTxs, usdTxs }) => {
    const catMap = {};

    for (const tx of arsTxs) {
      if (!catMap[tx.cat]) {
        const color = catColor(tx.cat);
        catMap[tx.cat] = {
          id: `pdf_${tx.cat}_${Date.now()}`,
          name: `${tx.icon} ${tx.cat}`,
          icon: tx.icon,
          locked: false,
          color: 'bg-gray-50 border-gray-300',
          _colorHex: color,
          items: [],
        };
      }
      catMap[tx.cat].items.push({
        id: tx.id,
        name: tx.description,
        amount: tx.pesos,
        locked: false,
        note: tx.date,
      });
    }

    for (const tx of usdTxs) {
      if (!catMap['Suscripciones USD']) {
        catMap['Suscripciones USD'] = {
          id: `pdf_subs_usd_${Date.now()}`,
          name: '💱 Suscripciones USD',
          icon: '💱',
          locked: false,
          color: 'bg-amber-50 border-amber-300',
          items: [],
        };
      }
      catMap['Suscripciones USD'].items.push({
        id: tx.id,
        name: tx.description,
        amount: tx.pesos,
        locked: false,
        note: `${tx.date} · USD`,
      });
    }

    onImport(Object.values(catMap));
    setDonePDF(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-4">

        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4 rounded-t-2xl flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">🗓️ Cargar Mes</h2>
            <p className="text-slate-300 text-xs mt-0.5">
              {step === 'precheck'
                ? `Cierre de ${currentMonthLabel}`
                : 'Importá tus gastos fijos y resumen de tarjeta'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-white text-2xl leading-none px-2">×</button>
        </div>

        {/* ── Precheck step ── */}
        {step === 'precheck' && (
          <StepPrecheck
            currentMonthLabel={currentMonthLabel}
            onSaveAndClean={handleSaveAndClean}
            onSaveOnly={handleSaveOnly}
            onSkip={handleSkip}
          />
        )}

        {/* ── Normal tabs ── */}
        {step === 'tabs' && (
          <>
            {/* Saved confirmation banner */}
            {savedLabel && (
              <div className="mx-5 mt-4 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center gap-2">
                <span className="text-emerald-500">✅</span>
                <p className="text-sm text-emerald-700 font-medium">
                  <strong>{savedLabel}</strong> guardado en el historial
                </p>
              </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-gray-200 mt-2">
              <button
                onClick={() => setActiveTab('excel')}
                className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
                  activeTab === 'excel'
                    ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Gastos Fijos {doneExcel && <span className="ml-1 text-green-500">✓</span>}
              </button>
              <button
                onClick={() => setActiveTab('pdf')}
                className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${
                  activeTab === 'pdf'
                    ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                💳 Tarjeta de Crédito {donePDF && <span className="ml-1 text-green-500">✓</span>}
              </button>
            </div>

            {/* Tab content */}
            <div className="p-5">
              {activeTab === 'excel' && (
                doneExcel
                  ? <div className="text-center py-8">
                      <div className="text-4xl mb-2">✅</div>
                      <p className="font-semibold text-gray-700">¡Gastos fijos importados!</p>
                      <p className="text-gray-400 text-sm mt-1">Podés continuar con la tarjeta o cerrar.</p>
                      <button onClick={() => setActiveTab('pdf')}
                        className="mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm transition">
                        Continuar con tarjeta →
                      </button>
                    </div>
                  : <StepExcel onDone={handleExcelDone} />
              )}
              {activeTab === 'pdf' && (
                donePDF
                  ? <div className="text-center py-8">
                      <div className="text-4xl mb-2">✅</div>
                      <p className="font-semibold text-gray-700">¡Tarjeta importada!</p>
                      <p className="text-gray-400 text-sm mt-1">Todos los gastos fueron agregados a la app.</p>
                      <button onClick={onClose}
                        className="mt-4 bg-slate-700 hover:bg-slate-600 text-white font-bold px-5 py-2 rounded-xl text-sm transition">
                        Cerrar
                      </button>
                    </div>
                  : <StepPDF onDone={handlePDFDone} />
              )}
            </div>

            {/* Footer */}
            {(doneExcel || donePDF) && !(doneExcel && donePDF) && (
              <div className="px-5 pb-4">
                <button onClick={onClose}
                  className="w-full border-2 border-gray-200 text-gray-500 font-medium py-2 rounded-xl hover:bg-gray-50 transition text-sm">
                  Cerrar sin continuar
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
