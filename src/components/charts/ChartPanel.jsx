import React, { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, Sector,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ReferenceLine,
  LineChart, Line,
  ResponsiveContainer,
} from "recharts";
import { fmt, fmtShort } from "../../lib/formatters.js";

const PIE_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#ec4899","#84cc16",
  "#f97316","#a78bfa","#34d399","#fb923c",
  "#38bdf8","#f472b6","#4ade80","#facc15",
];

const TOOLTIP_STYLE = {
  backgroundColor: "#0f172a",
  border: "1px solid #1e293b",
  borderRadius: "12px",
  color: "#e2e8f0",
  fontSize: 13,
  padding: "10px 14px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
};

// Active slice highlight shape
function ActiveSlice(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector cx={cx} cy={cy} innerRadius={innerRadius - 4} outerRadius={outerRadius + 10}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.95} />
      <Sector cx={cx} cy={cy} innerRadius={outerRadius + 12} outerRadius={outerRadius + 16}
        startAngle={startAngle} endAngle={endAngle} fill={fill} opacity={0.4} />
    </g>
  );
}

const fmtAxisShort = (v) => fmtShort(v);

export default function ChartPanel({ categories, history = [], target, salary }) {
  const [activeSlice, setActiveSlice] = useState(null);

  const pieData = useMemo(() => {
    return categories
      .map(cat => ({
        name: cat.name.replace(/^\S+\s/, ""),
        value: cat.items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories]);

  const totalActual = useMemo(
    () => categories.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (Number(i.amount) || 0), 0), 0),
    [categories]
  );

  const barData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history].slice(0, 6).reverse().map(entry => ({
      mes: entry.label ?? entry.yearMonth ?? "",
      Gastos: entry.total ?? 0,
      Target: entry.target ?? target ?? 0,
    }));
  }, [history, target]);

  const lineData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history].slice(0, 12).reverse().map(entry => ({
      mes: (entry.label ?? entry.yearMonth ?? "").slice(0, 7),
      Gastos: entry.total ?? 0,
      Sueldo: entry.salary ?? salary ?? 0,
    }));
  }, [history, salary]);

  const budgetData = useMemo(() => {
    return categories
      .filter(c => c.budget > 0)
      .map(c => ({
        name: c.name.replace(/^\S+\s/, "").slice(0, 14),
        Gastado: c.items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
        Presupuesto: c.budget,
      }));
  }, [categories]);

  // Center label content
  const centerLabel = activeSlice !== null && pieData[activeSlice]
    ? {
        name: pieData[activeSlice].name,
        value: fmtShort(pieData[activeSlice].value),
        pct: totalActual > 0
          ? Math.round((pieData[activeSlice].value / totalActual) * 100)
          : 0,
        color: PIE_COLORS[activeSlice % PIE_COLORS.length],
      }
    : { name: "TOTAL", value: fmtShort(totalActual), pct: null, color: "#f1f5f9" };

  return (
    <div className="pb-8 space-y-6">

      {/* ── DONUT — distribución de gastos ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 dark:from-slate-800 dark:to-slate-700 px-5 py-4">
          <h3 className="font-bold text-white text-base">🥧 Distribución de gastos</h3>
          <p className="text-slate-300 text-xs mt-0.5">
            {fmt(totalActual)} total — pasá el cursor sobre cada sector para ver el detalle
          </p>
        </div>

        {pieData.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-4xl mb-3">📊</div>
            <p className="text-gray-400 dark:text-slate-500 text-sm">
              Cargá gastos en "Mis Gastos" para ver el gráfico
            </p>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex flex-col md:flex-row gap-4 items-center">

              {/* Donut + center label overlay */}
              <div className="w-full md:w-auto flex-shrink-0 flex justify-center">
                <div className="relative" style={{ width: 260, height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%" cy="50%"
                        innerRadius={72} outerRadius={105}
                        dataKey="value"
                        paddingAngle={2}
                        activeIndex={activeSlice !== null ? activeSlice : undefined}
                        activeShape={<ActiveSlice />}
                        onMouseEnter={(_, index) => setActiveSlice(index)}
                        onMouseLeave={() => setActiveSlice(null)}
                      >
                        {pieData.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                            stroke="transparent"
                            opacity={activeSlice === null || activeSlice === i ? 1 : 0.4}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value, name) => [fmt(value), name]}
                        contentStyle={TOOLTIP_STYLE}
                        itemStyle={{ color: "#e2e8f0", fontSize: 13 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  {/* Center overlay */}
                  <div
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"
                    style={{ top: 0, left: 0 }}
                  >
                    <span
                      className="text-xs font-semibold tracking-widest uppercase mb-1"
                      style={{ color: "#94a3b8" }}
                    >
                      {centerLabel.name.slice(0, 12)}
                    </span>
                    <span
                      className="text-xl font-bold"
                      style={{ color: centerLabel.color }}
                    >
                      {centerLabel.value}
                    </span>
                    {centerLabel.pct !== null && (
                      <span className="text-xs font-semibold mt-0.5" style={{ color: "#10b981" }}>
                        {centerLabel.pct}% del total
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Legend list */}
              <div className="flex-1 w-full space-y-2">
                {pieData.slice(0, 10).map((item, i) => {
                  const pct = totalActual > 0 ? Math.round((item.value / totalActual) * 100) : 0;
                  const color = PIE_COLORS[i % PIE_COLORS.length];
                  const isActive = activeSlice === i;
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 cursor-default transition-all"
                      style={{ opacity: activeSlice !== null && !isActive ? 0.45 : 1 }}
                      onMouseEnter={() => setActiveSlice(i)}
                      onMouseLeave={() => setActiveSlice(null)}
                    >
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span
                        className="text-sm flex-1 truncate transition-all"
                        style={{
                          color: isActive ? color : undefined,
                          fontWeight: isActive ? 600 : 400,
                        }}
                      >
                        <span className="text-gray-700 dark:text-slate-300">{item.name}</span>
                      </span>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-14 h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 dark:text-slate-500 w-6 text-right tabular-nums">{pct}%</span>
                        <span className="text-sm font-semibold w-24 text-right tabular-nums" style={{ color }}>
                          {fmt(item.value)}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {pieData.length > 10 && (
                  <p className="text-xs text-gray-400 dark:text-slate-500 pl-5">
                    + {pieData.length - 10} categorías más
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* ── BAR — historial ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-600 dark:from-indigo-900 dark:to-indigo-800 px-5 py-4">
          <h3 className="font-bold text-white text-base">📊 Gastos vs Target</h3>
          <p className="text-indigo-200 text-xs mt-0.5">Comparación mensual — últimos 6 meses</p>
        </div>
        <div className="p-5">
          {barData.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">🗓️</div>
              <p className="text-gray-400 dark:text-slate-500 text-sm">
                Guardá al menos un mes en "Historial" para ver la comparación
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} margin={{ top: 8, right: 10, left: 0, bottom: 5 }} barGap={4}>
                <XAxis dataKey="mes" tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: "#334155" }} tickLine={false} />
                <YAxis tickFormatter={fmtAxisShort} tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false} tickLine={false} width={62} />
                <Tooltip formatter={(value, name) => [fmt(value), name]}
                  contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "#e2e8f0", fontSize: 13 }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>{value}</span>
                  )} />
                <Bar dataKey="Gastos" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={48} />
                <Bar dataKey="Target" fill="#10b981" radius={[5, 5, 0, 0]} maxBarSize={48} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── LINE — tendencia ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 dark:from-emerald-900 dark:to-emerald-800 px-5 py-4">
          <h3 className="font-bold text-white text-base">📈 Tendencia de gastos</h3>
          <p className="text-emerald-200 text-xs mt-0.5">Evolución de gastos vs sueldo en el tiempo</p>
        </div>
        <div className="p-5">
          {lineData.length < 2 ? (
            <div className="py-12 text-center">
              <div className="text-4xl mb-3">📉</div>
              <p className="text-gray-400 dark:text-slate-500 text-sm">
                Necesitás al menos 2 meses guardados para ver la tendencia
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={lineData} margin={{ top: 8, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="mes" tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                  axisLine={{ stroke: "#334155" }} tickLine={false} />
                <YAxis tickFormatter={fmtAxisShort} tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={false} tickLine={false} width={62} />
                <Tooltip formatter={(value, name) => [fmt(value), name]}
                  contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "#e2e8f0", fontSize: 13 }}
                  cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>{value}</span>
                  )} />
                <ReferenceLine y={target} stroke="#f59e0b" strokeDasharray="5 3" strokeWidth={1.5}
                  label={{ value: "Target", fill: "#f59e0b", fontSize: 11, fontWeight: 600 }} />
                <Line type="monotone" dataKey="Gastos" stroke="#6366f1" strokeWidth={2.5}
                  dot={{ r: 5, fill: "#6366f1", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7, strokeWidth: 0 }} />
                <Line type="monotone" dataKey="Sueldo" stroke="#10b981" strokeWidth={2.5}
                  dot={{ r: 5, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }}
                  activeDot={{ r: 7, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── BAR — categorías vs presupuesto ── */}
      {budgetData.length > 0 && (
        <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-600 to-amber-500 dark:from-amber-900 dark:to-amber-800 px-5 py-4">
            <h3 className="font-bold text-white text-base">💰 Categorías vs Presupuesto</h3>
            <p className="text-amber-100 text-xs mt-0.5">Gastos reales vs presupuestos asignados</p>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={Math.max(200, budgetData.length * 48)}>
              <BarChart data={budgetData} layout="vertical" margin={{ top: 5, right: 10, left: 120, bottom: 5 }} barGap={3}>
                <XAxis type="number" tickFormatter={fmtAxisShort} tick={{ fill: "#94a3b8", fontSize: 11 }}
                  axisLine={{ stroke: "#334155" }} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#94a3b8", fontSize: 12, fontWeight: 500 }}
                  axisLine={false} tickLine={false} />
                <Tooltip formatter={(value, name) => [fmt(value), name]}
                  contentStyle={TOOLTIP_STYLE} itemStyle={{ color: "#e2e8f0", fontSize: 13 }}
                  cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Legend iconType="circle" iconSize={8}
                  formatter={(value) => (
                    <span style={{ color: "#94a3b8", fontSize: 12, fontWeight: 500 }}>{value}</span>
                  )} />
                <Bar dataKey="Gastado" fill="#ef4444" radius={[0, 5, 5, 0]} maxBarSize={20} />
                <Bar dataKey="Presupuesto" fill="#10b981" radius={[0, 5, 5, 0]} maxBarSize={20} opacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

    </div>
  );
}
