import React, { useState, useMemo, useCallback } from "react";
import { fmt, pct, fmtShort, fmtDelta, monthLabel, MESES, catFromEntry } from "../../lib/formatters.js";
import { useToast } from "../../hooks/useToast.js";

function loadHistory() {
  try {
    const raw = localStorage.getItem("gastos_historial_v1");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
}

function saveHistory(entries) {
  try { localStorage.setItem("gastos_historial_v1", JSON.stringify(entries)); }
  catch (e) { if (import.meta.env.DEV) console.warn("[saveHistory]", e); }
}

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

  const yTicks = [0, 0.33, 0.66, 1].map(f => maxVal * f);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 200 }}>
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

      {targetY && (
        <>
          <line x1={PAD.l} y1={targetY} x2={W - PAD.r} y2={targetY}
                stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="6,3" />
          <text x={PAD.l + 4} y={targetY - 4} fontSize="8.5" fill="#d97706" fontWeight="bold">TARGET</text>
        </>
      )}

      <path d={areaPath} fill="#0d9488" fillOpacity="0.07" />

      <path d={linePath} fill="none" stroke="#0d9488" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round" />

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

function CompareTab({ categories, target, firestoreHistory }) {
  const toast = useToast();
  const now       = new Date();
  const curYear   = now.getFullYear();
  const curMonth  = now.getMonth();

  const [localHistory, setLocalHistory] = useState(loadHistory);

  // Convertir entradas de Firestore al formato interno si están disponibles
  const firestoreConverted = useMemo(() => {
    if (!firestoreHistory) return null;
    return firestoreHistory.map(entry => {
      const date = new Date(entry.yearMonth + "-01T00:00:00");
      return {
        id:        entry.yearMonth,
        label:     entry.label ?? entry.yearMonth,
        year:      date.getFullYear(),
        month:     date.getMonth(),
        total:     entry.total ?? 0,
        salary:    entry.salary ?? 0,
        target:    entry.target ?? target,
        breakdown: entry.categories
          ? Object.fromEntries(entry.categories.map(c => [c.id, c.total]))
          : {},
      };
    });
  }, [firestoreHistory, target]);

  const history = firestoreConverted ?? localHistory;

  const setHistoryState = useCallback((updater) => {
    if (firestoreConverted !== null) return; // read-only when Firestore is active
    setLocalHistory(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      saveHistory(next);
      return next;
    });
  }, [firestoreConverted]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editId, setEditId]         = useState(null);
  const [formMonth, setFormMonth]   = useState(curMonth === 0 ? 11 : curMonth - 1);
  const [formYear, setFormYear]     = useState(curMonth === 0 ? curYear - 1 : curYear);
  const [formTotal, setFormTotal]   = useState("");
  const [useBreakdown, setUseBreakdown] = useState(false);
  const [breakdownVals, setBreakdownVals] = useState({});

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

  const allMonths = useMemo(() => {
    const combined = [
      ...history.filter(h => !(h.year === curYear && h.month === curMonth)),
      currentEntry,
    ].sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
    return combined.slice(-3);
  }, [history, currentEntry, curYear, curMonth]);

  const prevEntry = allMonths.length >= 2 ? allMonths[allMonths.length - 2] : null;
  const hasHistory = history.length > 0;

  const persistHistory = (entries) => {
    setHistoryState(entries);
    // setHistoryState ya llama saveHistory cuando es localStorage
  };

  const deleteHistoryEntry = (id) => {
    persistHistory(history.filter(h => h.id !== id));
    toast.info('Entrada eliminada del historial');
  };

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
    toast.success('Mes guardado en el historial ✅');
  };

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
    toast.success('Mes guardado ✅');
    closeForm();
  };

  const breakdownSum = Object.values(breakdownVals).reduce((s, v) => s + (v || 0), 0);
  const formTotalNum = parseInt(formTotal, 10) || 0;

  const movers = useMemo(() => {
    if (!prevEntry) return [];
    return currentCats
      .map(c => {
        const prev = catFromEntry(prevEntry, c.id, currentCats, currentTotal);
        const { d, pct: pctVal, up } = fmtDelta(c.total, prev) || { d: 0, pct: 0, up: false };
        return { ...c, prev, d, pct: pctVal, up };
      })
      .sort((a, b) => Math.abs(b.d) - Math.abs(a.d))
      .slice(0, 6);
  }, [prevEntry, currentCats, currentTotal]);

  const barMax = useMemo(() => {
    if (!prevEntry) return currentTotal;
    return Math.max(
      ...currentCats.map(c => c.total),
      ...currentCats.map(c => catFromEntry(prevEntry, c.id, currentCats, currentTotal))
    ) * 1.05;
  }, [prevEntry, currentCats, currentTotal]);

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

      {/* ─ Charts section ─ */}
      {allMonths.length >= 2 && (
        <>
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

          {/* Category comparison */}
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

          {/* Trend line */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-bold text-gray-800 mb-1">📈 Tendencia de Gastos</h3>
            <p className="text-xs text-gray-400 mb-4">
              {allMonths.length < 3
                ? `Mostrando ${allMonths.length} mes/es — agregá más meses para ver la tendencia completa.`
                : "Últimos 3 meses · La línea amarilla es el TARGET."}
            </p>
            <TrendSVG months={allMonths} target={target} />
          </div>

          {/* Top movers */}
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

export default CompareTab;
