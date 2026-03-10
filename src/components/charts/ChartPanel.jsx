import React, { useMemo } from "react";
import {
  PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ReferenceLine,
  LineChart, Line,
  ResponsiveContainer,
} from "recharts";
import { fmt, fmtShort } from "../../lib/formatters.js";

const PIE_COLORS = [
  "#6366f1","#10b981","#f59e0b","#ef4444",
  "#8b5cf6","#06b6d4","#ec4899","#84cc16",
  "#f97316","#a78bfa","#34d399","#fb923c",
];

function CustomPieLabel({ cx, cy, midAngle, outerRadius, percent, name }) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 24;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (percent < 0.04) return null; // no mostrar etiquetas muy pequeñas
  return (
    <text x={x} y={y} fill="#94a3b8" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central" fontSize={11}>
      {`${name.slice(0, 12)} ${Math.round(percent * 100)}%`}
    </text>
  );
}

const fmtAxisShort = (v) => fmtShort(v);

export default function ChartPanel({ categories, history = [], target, salary }) {
  // ── Datos para pie chart ──────────────────────────────────────────────────
  const pieData = useMemo(() => {
    return categories
      .map(cat => ({
        name: cat.name.replace(/^\S+\s/, ""), // quitar emoji
        value: cat.items.reduce((s, i) => s + (Number(i.amount) || 0), 0),
      }))
      .filter(d => d.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [categories]);

  // ── Datos para bar chart (historial últimos 6 meses) ─────────────────────
  const barData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history]
      .slice(0, 6)
      .reverse()
      .map(entry => ({
        mes: entry.label ?? entry.yearMonth ?? "",
        Gastos: entry.total ?? 0,
        Target: entry.target ?? target ?? 0,
      }));
  }, [history, target]);

  // ── Datos para line chart (tendencia de ahorro) ───────────────────────────
  const lineData = useMemo(() => {
    if (!history || history.length === 0) return [];
    return [...history]
      .slice(0, 12)
      .reverse()
      .map(entry => ({
        mes: (entry.label ?? entry.yearMonth ?? "").slice(0, 7),
        Gastos: entry.total ?? 0,
        Sueldo: entry.salary ?? salary ?? 0,
      }));
  }, [history, salary]);

  const totalActual = useMemo(
    () => categories.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (Number(i.amount) || 0), 0), 0),
    [categories]
  );

  return (
    <div className="pb-8 space-y-8">

      {/* ── PIE — distribución de gastos del mes ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="font-bold text-gray-700 dark:text-slate-200 text-base mb-1">
          🥧 Distribución de gastos — {fmt(totalActual)} total
        </h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
          Proporción de cada categoría sobre el gasto mensual actual
        </p>
        {pieData.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-slate-500 py-10 text-sm">
            Cargá gastos en la pestaña "Mis Gastos" para ver el gráfico
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={90}
                dataKey="value"
                labelLine={false}
                label={<CustomPieLabel />}
              >
                {pieData.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [fmt(value), name]}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── BAR — historial de meses ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="font-bold text-gray-700 dark:text-slate-200 text-base mb-1">
          📊 Gastos vs Target — últimos meses
        </h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
          Comparación mensual entre gastos reales y el objetivo
        </p>
        {barData.length === 0 ? (
          <p className="text-center text-gray-400 dark:text-slate-500 py-10 text-sm">
            Guardá al menos un mes en la pestaña "Comparar" para ver el historial
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="mes" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisShort} tick={{ fill: "#94a3b8", fontSize: 11 }} width={60} />
              <Tooltip
                formatter={(value, name) => [fmt(value), name]}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
                )}
              />
              <Bar dataKey="Gastos" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Target" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.6} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── LINE — tendencia de gastos vs sueldo ── */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-5">
        <h3 className="font-bold text-gray-700 dark:text-slate-200 text-base mb-1">
          📈 Tendencia de gastos
        </h3>
        <p className="text-xs text-gray-400 dark:text-slate-500 mb-4">
          Evolución de gastos totales vs sueldo a lo largo del tiempo
        </p>
        {lineData.length < 2 ? (
          <p className="text-center text-gray-400 dark:text-slate-500 py-10 text-sm">
            Necesitás al menos 2 meses guardados para ver la tendencia
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={lineData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="mes" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <YAxis tickFormatter={fmtAxisShort} tick={{ fill: "#94a3b8", fontSize: 11 }} width={60} />
              <Tooltip
                formatter={(value, name) => [fmt(value), name]}
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontSize: 12,
                }}
              />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(value) => (
                  <span style={{ color: "#94a3b8", fontSize: 11 }}>{value}</span>
                )}
              />
              <ReferenceLine y={target} stroke="#f59e0b" strokeDasharray="4 2" label={{ value: "Target", fill: "#f59e0b", fontSize: 11 }} />
              <Line type="monotone" dataKey="Gastos" stroke="#6366f1" strokeWidth={2} dot={{ r: 4, fill: "#6366f1" }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="Sueldo" stroke="#10b981" strokeWidth={2} dot={{ r: 4, fill: "#10b981" }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </section>

    </div>
  );
}
