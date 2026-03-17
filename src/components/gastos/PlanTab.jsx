import React, { useState, useEffect } from "react";
import { fmt, pct } from "../../lib/formatters.js";

const LS_KEY = "plan_ajuste_done_v1";

const PLAN_DATA = [
  {
    phase: "FASE 1",
    title: "Acciones inmediatas (Mes 1)",
    color: "bg-red-50 border-red-300",
    headerColor: "bg-red-100",
    textColor: "text-red-800",
    items: [
      { id: "f1_1", action: "Cancelar plan BNA Viejo (Cel Nativa)",  saving: 94401,  detail: "Llamar al banco esta semana" },
      { id: "f1_2", action: "Reducir streamings a 2 máximo",          saving: 18000,  detail: "Elegir Netflix y Spotify. Cancelar YouTube Premium y Google One" },
      { id: "f1_3", action: "Bajar plan Personal al básico",          saving: 40000,  detail: "Llamar a Personal y pedir downgrade de plan" },
    ],
  },
  {
    phase: "FASE 2",
    title: "Revisar gastos grandes (Mes 1-2)",
    color: "bg-orange-50 border-orange-300",
    headerColor: "bg-orange-100",
    textColor: "text-orange-800",
    items: [
      { id: "f2_1", action: "Reducir carnicería Torcuato De Campos",     saving: 150000, detail: "$250k/mes en carnicería es el mayor gasto de alimentos. Reducir cantidad o frecuencia puede ahorrar $150k fácilmente" },
      { id: "f2_2", action: "Reducir 'Otros / Gastos varios' ($312k)",   saving: 150000, detail: "Identificar qué ítems lo componen y recortar los no esenciales. Meta: bajar de $312k a $160k" },
      { id: "f2_3", action: "Buscar estacionamiento más barato",          saving: 80000,  detail: "SafeParking = $138k/mes. Encontrar alternativa por $50k-$60k" },
      { id: "f2_4", action: "Cortar fast food y delivery a 4 veces/mes", saving: 65000,  detail: "McD + PedidosYa reducido de $91k a $26k = ahorro $65k" },
    ],
  },
  {
    phase: "FASE 3",
    title: "Frenar nuevas compras (Mes 1 en adelante)",
    color: "bg-yellow-50 border-yellow-300",
    headerColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    items: [
      { id: "f3_1", action: "Cero compras nuevas en MercadoLibre", saving: 100000, detail: "Las cuotas actuales ($218k) siguen, pero podés evitar agregar más. Ahorro neto a futuro" },
      { id: "f3_2", action: "Reducir consumo eléctrico (EDENOR)",  saving: 40000,  detail: "Apagar climatización innecesaria. Meta: bajar de $180k a $140k" },
    ],
  },
  {
    phase: "A FUTURO",
    title: "Gastos que se liberan solos",
    color: "bg-green-50 border-green-300",
    headerColor: "bg-green-100",
    textColor: "text-green-700",
    items: [
      { id: "ff_1", action: "Sistema Hecate: quedan ~4 cuotas",       saving: 162333, detail: "En ~4 meses, se liberan $162.333/mes automáticamente" },
      { id: "ff_2", action: "LoJack: esta es la ÚLTIMA cuota",        saving: 20171,  detail: "El mes que viene ya no lo pagás" },
      { id: "ff_3", action: "GADNIC (electrónica): quedan 5 cuotas",  saving: 71815,  detail: "En 5 meses se libera $71.815/mes" },
    ],
  },
];

function PlanPhase({ phase, title, color, headerColor, textColor, items, doneIds, onToggle }) {
  const pendingItems = items.filter(i => !doneIds.has(i.id));
  const doneItems    = items.filter(i =>  doneIds.has(i.id));
  const totalSaving  = pendingItems.reduce((s, i) => s + i.saving, 0);
  const allDone      = pendingItems.length === 0;

  if (allDone && doneItems.length > 0) {
    return (
      <div className="rounded-xl border-2 border-green-300 bg-green-50 overflow-hidden shadow-sm">
        <div className="flex justify-between items-center px-4 py-3 bg-green-100">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-green-700">{phase} ✅</span>
            <p className="font-semibold text-sm text-green-700">{title}</p>
          </div>
          <span className="text-sm font-bold text-green-700 bg-green-200 px-3 py-1 rounded-full">¡Completada!</span>
        </div>
        <div className="px-4 py-3">
          {doneItems.map(item => (
            <div key={item.id} className="flex items-center gap-2 py-1 opacity-50">
              <input type="checkbox" checked readOnly className="rounded accent-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-500 line-through">{item.action}</span>
              <span className="ml-auto text-xs text-green-600 font-semibold">-{fmt(item.saving)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl border-2 overflow-hidden shadow-sm ${color}`}>
      <div className={`flex justify-between items-center px-4 py-3 ${headerColor}`}>
        <div>
          <span className={`text-xs font-bold uppercase tracking-wider ${textColor}`}>{phase}</span>
          <p className={`font-semibold text-sm ${textColor}`}>{title}</p>
        </div>
        {totalSaving > 0 && (
          <span className="text-sm font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
            -{fmt(totalSaving)}/mes
          </span>
        )}
      </div>

      <div className="divide-y divide-gray-100">
        {/* Pending items */}
        {pendingItems.map(item => (
          <label
            key={item.id}
            className="flex items-start gap-3 px-4 py-3 bg-white/60 hover:bg-white/90 transition cursor-pointer group"
          >
            <input
              type="checkbox"
              checked={false}
              onChange={() => onToggle(item.id)}
              className="mt-0.5 rounded accent-green-500 flex-shrink-0 w-4 h-4 cursor-pointer"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{item.action}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.detail}</p>
            </div>
            <span className="text-sm font-bold text-emerald-600 flex-shrink-0 mt-0.5">
              -{fmt(item.saving)}
            </span>
          </label>
        ))}

        {/* Done items (crossed out, collapsible) */}
        {doneItems.length > 0 && (
          <div className="bg-gray-50/80">
            {doneItems.map(item => (
              <label
                key={item.id}
                className="flex items-start gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-100/50 transition"
              >
                <input
                  type="checkbox"
                  checked
                  onChange={() => onToggle(item.id)}
                  className="mt-0.5 rounded accent-green-500 flex-shrink-0 w-4 h-4 cursor-pointer"
                />
                <div className="flex-1 min-w-0 opacity-50">
                  <p className="text-sm text-gray-500 line-through">{item.action}</p>
                </div>
                <span className="text-xs text-gray-400 flex-shrink-0 line-through opacity-50">
                  -{fmt(item.saving)}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PlanTab({ total, TARGET }) {
  const gap = total - TARGET;

  const [doneIds, setDoneIds] = useState(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch { return new Set(); }
  });

  useEffect(() => {
    try { localStorage.setItem(LS_KEY, JSON.stringify([...doneIds])); }
    catch { /* ignore */ }
  }, [doneIds]);

  const toggleDone = (id) => {
    setDoneIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Savings per phase considering only pending items
  const phaseSavings = PLAN_DATA.map(phase =>
    phase.items.filter(i => !doneIds.has(i.id)).reduce((s, i) => s + i.saving, 0)
  );
  const totalDoneSaving = PLAN_DATA.flatMap(p => p.items)
    .filter(i => doneIds.has(i.id))
    .reduce((s, i) => s + i.saving, 0);
  const allItemCount  = PLAN_DATA.flatMap(p => p.items).length;
  const doneItemCount = doneIds.size;

  // Projection rows
  const projRows = [
    { label: "Gasto actual",                                 value: total },
    { label: "− Fase 1 (acciones inmediatas)",               value: total - phaseSavings[0] },
    { label: "− Fase 2 (pagos grandes + parking + delivery)",value: total - phaseSavings[0] - phaseSavings[1] },
    { label: "− Fase 3 (compras + electricidad)",            value: total - phaseSavings[0] - phaseSavings[1] - phaseSavings[2] },
    { label: "− A futuro (cuotas que terminan)",             value: total - phaseSavings[0] - phaseSavings[1] - phaseSavings[2] - phaseSavings[3] },
    { label: "🎯 TARGET",                                    value: TARGET },
  ];

  return (
    <div className="pb-8 space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-xl p-5">
        <h2 className="text-lg font-bold mb-1">🎯 Tu Plan de Ajuste: de {fmt(total)} a {fmt(TARGET)}</h2>
        <p className="text-slate-300 text-sm">
          Necesitás reducir {fmt(gap)} ({pct(gap, total)}% de tus gastos actuales). Acá está el plan paso a paso.
        </p>
        {doneItemCount > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                style={{ width: `${(doneItemCount / allItemCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-emerald-300 font-semibold whitespace-nowrap">
              {doneItemCount}/{allItemCount} · Ahorraste {fmt(totalDoneSaving)}/mes
            </span>
          </div>
        )}
      </div>

      {/* Tip */}
      <p className="text-xs text-gray-400 text-center">
        ✅ Tildá cada acción cuando la completás — se actualizan las proyecciones automáticamente
      </p>

      {/* Phases */}
      {PLAN_DATA.map((phase, i) => (
        <PlanPhase
          key={phase.phase}
          {...phase}
          doneIds={doneIds}
          onToggle={toggleDone}
        />
      ))}

      {/* Projection */}
      <div className="bg-slate-800 text-white rounded-xl p-5">
        <h3 className="font-bold text-lg mb-3">📈 Proyección de ahorro total</h3>
        <div className="space-y-2">
          {projRows.map((row, i) => {
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

      {/* Key insight */}
      <div className="bg-amber-50 border-2 border-amber-400 rounded-xl p-4">
        <h3 className="font-bold text-amber-800 mb-2">🥩 Dato clave: Alimentación = $482k/mes</h3>
        <p className="text-sm text-amber-700">
          La carnicería Torcuato De Campos ($250k) + Carnes Botta ($12k) + almacén ($128k) + fast food ($92k)
          suman <strong>$482.032 solo en alimentación</strong> — el 12.5% del total.
          Es una categoría con margen real de reducción sin afectar la calidad de vida.
        </p>
      </div>
    </div>
  );
}

export default PlanTab;
