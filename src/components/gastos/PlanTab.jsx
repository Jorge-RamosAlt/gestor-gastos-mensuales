import React from "react";
import { fmt, pct } from "../../lib/formatters.js";

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

function PlanTab({ total, TARGET }) {
  const gap = total - TARGET;

  return (
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
  );
}

export default PlanTab;
