import { fmt, pct } from '../../lib/formatters';

export default function SummaryHeader({
  salaryActual,
  salaryTarget,
  total,
  target,
  monthLabel,
  userName
}) {
  const gap = total - target;

  return (
    <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-5 shadow-lg">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              📊 Análisis de Gastos — {monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)}
            </h1>
            <p className="text-slate-300 text-sm">
              {userName} · De {fmt(salaryActual)} → {fmt(salaryTarget)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard label="Sueldo actual"  value={fmt(salaryActual)} sub="Este mes"          color="text-emerald-400" />
          <SummaryCard label="Sueldo objetivo" value={fmt(salaryTarget)}  sub="Meta laboral"      color="text-yellow-300" />
          <SummaryCard
            label="Gastos totales"
            value={fmt(total)}
            sub={`${pct(total, salaryActual)}% del sueldo`}
            color={total > target ? "text-red-400" : "text-emerald-400"}
          />
          <SummaryCard
            label={gap > 0 ? "Hay que reducir" : "¡Dentro del target!"}
            value={fmt(Math.abs(gap))}
            sub={gap > 0 ? `para llegar a ${fmt(target)}` : "✅ Objetivo cumplido"}
            color={gap > 0 ? "text-red-400" : "text-emerald-400"}
          />
        </div>

        <ProgressBar total={total} target={target} />
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }) {
  return (
    <div className="bg-white/10 rounded-lg px-3 py-2">
      <p className="text-slate-400 text-xs">{label}</p>
      <p className={`font-bold text-base ${color}`}>{value}</p>
      <p className="text-slate-400 text-xs">{sub}</p>
    </div>
  );
}

function ProgressBar({ total, target }) {
  const gap = total - target;
  return (
    <div className="mt-4">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>$0</span>
        <span className="text-yellow-300 font-semibold">TARGET: {fmt(target)}</span>
        <span>{fmt(total)}</span>
      </div>
      <div className="relative h-4 bg-slate-600 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${total > target ? "bg-red-500" : "bg-emerald-500"}`}
          style={{ width: `${Math.min(100, (total / (total * 1.1)) * 100)}%` }}
        />
        <div
          className="absolute top-0 h-full w-0.5 bg-yellow-400"
          style={{ left: `${(target / (total * 1.1)) * 100}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className={total > target ? "text-red-400" : "text-emerald-400"}>
          {total > target
            ? `⬆ Excedés el target en ${fmt(gap)} (${pct(gap, target)}% más)`
            : "✅ Dentro del objetivo"}
        </span>
        <span className="text-slate-400">Target: {fmt(target)}</span>
      </div>
    </div>
  );
}
