import { useState, useMemo, useEffect, useCallback } from "react";

const TARGET = 2500000;
const SALARY_ACTUAL = 4518000;
const SALARY_NUEVO = 2500000;

const fmt = (n) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);

const pct = (part, total) => Math.round((part / total) * 100);

const INITIAL_CATEGORIES = [
  {
    id: "vehiculo_fijo",
    name: "Vehículo (INAMOVIBLE)",
    icon: "🚗",
    locked: true,
    color: "bg-gray-100 border-gray-400",
    headerColor: "bg-gray-200",
    textColor: "text-gray-700",
    items: [
      { id: "alicuota",        name: "Anticipo Alícuota (Plan de Ahorro)",      amount: 341271, locked: true, note: "Cuota pura del plan — Grupo 2997, Orden 12, Cuota 49" },
      { id: "rdc",             name: "Recupero + Actualización Histórica (RDC)", amount: 71179,  locked: true, note: "Recupero Histórico DC ($10.216) + Actualización ($60.963)" },
      { id: "imp_iva",         name: "IVA e Impuestos sobre el Plan",            amount: 25125,  locked: true, note: "IVA ($19.969) + Recup. Imp. Bancarios Ley 25413 ($5.156)" },
      { id: "seguro_auto_sam", name: "Seguro Auto del Mes (SAM)",               amount: 160236, locked: true, note: "Seguro del vehículo incluido en el plan — no negociable" },
      { id: "seguro_vida",     name: "Seguro de Vida (SV)",                     amount: 9707,   locked: true, note: "Seguro de vida incluido en el plan" },
      { id: "gastos_admin",    name: "Gastos Administrativos del Plan",          amount: 34127,  locked: true, note: "Gastos admin. del Círculo de Inversores" },
      { id: "seguro_bbva",     name: "Seguro Adicional (BBVA Seguros)",          amount: 30944,  locked: true, note: "Seguro contratado aparte — no negociable" },
    ],
  },
  {
    id: "servicios_hogar",
    name: "Servicios del Hogar",
    icon: "🏠",
    locked: false,
    color: "bg-blue-50 border-blue-300",
    headerColor: "bg-blue-100",
    textColor: "text-blue-800",
    items: [
      { id: "edenor",    name: "Electricidad (EDENOR)",        amount: 180000, locked: false, alert: true, note: "⚠️ Muy alto — revisar consumo" },
      { id: "naturgy",   name: "Gas (NATURGY)",                amount: 14571,  locked: false },
      { id: "absa",      name: "Agua (ABSA)",                  amount: 16726,  locked: false },
      { id: "tasa_serv", name: "Tasa Servicios Municipales",   amount: 44723,  locked: false },
    ],
  },
  {
    id: "transporte",
    name: "Transporte",
    icon: "⛽",
    locked: false,
    color: "bg-orange-50 border-orange-300",
    headerColor: "bg-orange-100",
    textColor: "text-orange-800",
    items: [
      { id: "combustible", name: "Combustible (~2 cargas/mes)",           amount: 148000, locked: false, note: "2 cargas YPF" },
      { id: "peajes",      name: "Peajes (AUOESTE / AUSOL / AUSA)",       amount: 65000,  locked: false, note: "Uso diario autopistas" },
      { id: "parking",     name: "Estacionamiento (SafeParking)",         amount: 138000, locked: false, alert: true, note: "⚠️ $138k/mes — ¿Hay alternativa más barata?" },
    ],
  },
  {
    id: "comunicaciones",
    name: "Comunicaciones",
    icon: "📱",
    locked: false,
    color: "bg-purple-50 border-purple-300",
    headerColor: "bg-purple-100",
    textColor: "text-purple-800",
    items: [
      { id: "personal_tel", name: "Personal (línea + internet)",                 amount: 125907, locked: false, note: "¿Podés bajar de plan?" },
      { id: "cel_bna",      name: "Cel Nativa BNA (plan viejo)",                 amount: 94401,  locked: false, alert: true, note: "⚠️ ¿Seguís usando esta línea? Cancelar si no" },
      { id: "streamings",   name: "Netflix / Spotify / YouTube / Google One",    amount: 32000,  locked: false, note: "USD ~32/mes — ¿Cuáles usás?" },
      { id: "rappi_pro",    name: "Rappi Pro",                                   amount: 5990,   locked: false, note: "¿Cuánto usás Rappi?" },
    ],
  },
  {
    id: "alimentacion",
    name: "Alimentación",
    icon: "🛒",
    locked: false,
    color: "bg-green-50 border-green-300",
    headerColor: "bg-green-100",
    textColor: "text-green-800",
    items: [
      { id: "almacen",            name: "Almacén / Verdulería (AGRO, 2×/mes)",  amount: 128388, locked: false },
      { id: "carniceria",         name: "Carnicería (Carnes Botta)",             amount: 11900,  locked: false },
      { id: "carniceria_torcuato",name: "Carnicería (Torcuato De Campos)",       amount: 250124, locked: false, alert: true, note: "⚠️ $250k en carnicería — ¿podés reducir la frecuencia o cantidad?" },
      { id: "fastfood",           name: "Fast Food / Delivery (McD + PedidosYa)",amount: 91620,  locked: false, alert: true, note: "⚠️ $91.620/mes en fast food — gran oportunidad de ahorro" },
    ],
  },
  {
    id: "seguridad",
    name: "Seguridad del Hogar",
    icon: "🔒",
    locked: false,
    color: "bg-red-50 border-red-300",
    headerColor: "bg-red-100",
    textColor: "text-red-800",
    items: [
      { id: "hecate", name: "Sistema Hecate (cuota)", amount: 162333, locked: false, note: "Quedan ~4 cuotas — se libera solo" },
    ],
  },
  {
    id: "compras",
    name: "Compras Online / ML",
    icon: "🛍️",
    locked: false,
    color: "bg-yellow-50 border-yellow-300",
    headerColor: "bg-yellow-100",
    textColor: "text-yellow-800",
    items: [
      { id: "mercadolibre", name: "MercadoLibre (cuotas en curso)", amount: 218397, locked: false, alert: true, note: "⚠️ Compras en cuotas anteriores — evitar nuevas compras" },
      { id: "gadnic",       name: "GADNIC electrónica (cuota 1/6)", amount: 71815,  locked: false, note: "5 cuotas restantes — $71.815/mes" },
    ],
  },
  {
    id: "servicios_personales",
    name: "Servicios Personales (Pagos por MercadoPago)",
    icon: "👤",
    locked: false,
    color: "bg-rose-50 border-rose-400",
    headerColor: "bg-rose-100",
    textColor: "text-rose-800",
    items: [
      { id: "orlando",  name: "Otros / Gastos varios",             amount: 312111, locked: false, note: "Gastos varios agrupados" },
      { id: "gregorio", name: "Gregorio Godoy",                    amount: 101106, locked: false, note: "¿Qué servicio?" },
      { id: "paulo",    name: "Paulo Nani (cargado en 2 tarjetas)",amount: 100000, locked: false, note: "2 pagos de $50k" },
      { id: "oliver",   name: "Oliver A. Yepez",                   amount: 85806,  locked: false },
      { id: "horacio",  name: "DC Horacio (profesional)",          amount: 63045,  locked: false },
      { id: "serena",   name: "Serena Luz Lourdes",                amount: 48146,  locked: false },
      { id: "innovate", name: "Innovate Store (tienda)",           amount: 34440,  locked: false },
      { id: "franco",   name: "Franco N. Peralta",                 amount: 32097,  locked: false },
      { id: "hugo",     name: "Hugo G. Zapata (×3 pagos)",         amount: 32931,  locked: false, note: "3 pagos de ~$10.977" },
      { id: "carla",    name: "Carla Florenci",                    amount: 18900,  locked: false },
      { id: "skuarek",  name: "Skuarek Julio I.",                  amount: 14823,  locked: false },
      { id: "jin",      name: "Jin Mei Chen",                      amount: 16155,  locked: false },
      { id: "corina",   name: "Corina Claudia V.",                 amount: 10699,  locked: false },
    ],
  },
  {
    id: "otros",
    name: "Otros / Cuotas Varias",
    icon: "📋",
    locked: false,
    color: "bg-indigo-50 border-indigo-300",
    headerColor: "bg-indigo-100",
    textColor: "text-indigo-800",
    items: [
      { id: "move2025",  name: "MOVE 2025 (deporte/actividad)",     amount: 30000,  locked: false, note: "Cuota 3/6 — comprometido" },
      { id: "lojack",    name: "LoJack (cuota 2/2 — ÚLTIMA)",       amount: 20171,  locked: false, note: "✅ Último mes — se libera" },
      { id: "sas_ai",    name: "SAS Matrix Lead AI (tech)",         amount: 5990,   locked: false },
      { id: "despegar",  name: "Membresía Despegar",                amount: 7576,   locked: false, note: "¿Cuánto la usás?" },
      { id: "icbc_com",  name: "Comisión Paquete ICBC",             amount: 48125,  locked: false, note: "¿Podés negociar o cambiar de banco?" },
    ],
  },
  {
    id: "galicia_cuotas",
    name: "Cuotas Galicia (compras anteriores)",
    icon: "💳",
    locked: false,
    color: "bg-slate-50 border-slate-300",
    headerColor: "bg-slate-100",
    textColor: "text-slate-700",
    items: [
      { id: "galicia_est", name: "Cuotas en curso (Tarjeta Galicia)", amount: 413613, locked: false, note: "Compras anteriores en cuotas — se reducen solas con el tiempo" },
    ],
  },
];

const RECOMMENDATIONS = [
  { priority: "🔴 URGENTE",    title: "Reducir el gasto en carnicería (Torcuato De Campos)", saving: 150000, detail: "$250.124/mes en carnicería es una de las cifras más altas del presupuesto alimentario. Reducir la cantidad o frecuencia de pedidos podría ahorrar $150.000/mes sin eliminar el gasto.", category: "alimentacion" },
  { priority: "🔴 URGENTE",    title: "Revisar y reducir 'Otros / Gastos varios' ($312k)",   saving: 150000, detail: "$312.111/mes en gastos varios es mucho. Identificar qué ítems lo componen y cuáles podés recortar puede ahorrar $150.000 o más.", category: "servicios_personales" },
  { priority: "🔴 URGENTE",    title: "Cancelar el plan BNA Viejo (Cel Nativa)",              saving: 94401,  detail: "Aparece como 'plan viejo' — si ya no la usás activamente, cancelarla ahorra $94.401/mes sin impacto en tu vida diaria.", category: "comunicaciones" },
  { priority: "🟠 IMPORTANTE", title: "Reducir estacionamiento SafeParking",                  saving: 80000,  detail: "$138.000/mes en estacionamiento es mucho. ¿Podés buscar alternativas más baratas, negociar el precio, o cambiar de lugar?", category: "transporte" },
  { priority: "🟠 IMPORTANTE", title: "Eliminar fast food y delivery de apps",                saving: 65000,  detail: "$91.620/mes en McDonald's y PedidosYa. Reducirlo a ocasional (máx. 3-4 veces al mes) puede ahorrar ~$65.000.", category: "alimentacion" },
  { priority: "🟠 IMPORTANTE", title: "Frenar nuevas compras en MercadoLibre",               saving: 100000, detail: "Tenés $218.397 en cuotas activas de ML. Las cuotas comprometidas seguirán, pero podés evitar nuevas compras. Ahorro posible: $100.000.", category: "compras" },
  { priority: "🟡 REVISABLE",  title: "Revisar y reducir streamings",                        saving: 18000,  detail: "Netflix, Spotify, YouTube Premium y Google One = ~$32.000/mes. Elegí 1-2 favoritos y cancelá los demás. Ahorro estimado: $18.000/mes.", category: "comunicaciones" },
  { priority: "🟡 REVISABLE",  title: "Bajar plan de Personal",                              saving: 40000,  detail: "$125.907 en Personal es caro. Revisá si usás todos los gigas y minutos incluidos. Un plan más básico podría bajar $40.000/mes.", category: "comunicaciones" },
  { priority: "🟡 REVISABLE",  title: "Reducir consumo eléctrico",                           saving: 50000,  detail: "$180.000/mes en EDENOR es muy alto. Revisá electrodomésticos en uso (calefacción eléctrica, AC, etc). Meta realista: bajar a $130.000.", category: "servicios_hogar" },
  { priority: "🟡 REVISABLE",  title: "Negociar comisión ICBC o cambiar banco",              saving: 40000,  detail: "$48.125/mes en comisión de paquete ICBC. Llamá para negociar o evaluá si conviene mantener la tarjeta.", category: "otros" },
  { priority: "🟢 A FUTURO",   title: "Sistema Hecate termina en ~4 meses",                 saving: 162333, detail: "La cuota del sistema de seguridad se libera sola en aprox. 4 meses. Eso significa $162.333 menos por mes automáticamente.", category: "seguridad" },
  { priority: "🟢 A FUTURO",   title: "LoJack ya terminó (última cuota este mes)",           saving: 20171,  detail: "Esta es la última cuota del LoJack. Desde el mes que viene ya no tenés ese gasto.", category: "otros" },
];

// ── Fullscreen icon components ──
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

export default function GastosApp() {
  const [categories, setCategories]       = useState(INITIAL_CATEGORIES);
  const [editingId, setEditingId]         = useState(null);
  const [editValue, setEditValue]         = useState("");
  const [activeTab, setActiveTab]         = useState("gastos");
  const [openCategories, setOpenCategories] = useState(
    Object.fromEntries(INITIAL_CATEGORIES.map((c) => [c.id, true]))
  );
  const [isFullscreen, setIsFullscreen]   = useState(false);

  // ── Fullscreen toggle ──
  const toggleFullscreen = useCallback(() => {
    try {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen();
      } else {
        document.exitFullscreen();
      }
    } catch (e) {
      // ignore if browser blocks it
    }
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
        sum += item.amount;
      }
    }
    return sum;
  }, [categories]);

  const gap         = total - TARGET;
  const totalRec    = RECOMMENDATIONS.reduce((s, r) => s + r.saving, 0);
  const postRecTotal = total - totalRec;
  const catTotal    = (cat) => cat.items.reduce((s, i) => s + i.amount, 0);

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

  return (
    <div className="min-h-screen bg-gray-50 font-sans">

      {/* ─── HEADER ─── */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-5 shadow-lg">
        <div className="max-w-5xl mx-auto">

          {/* Title row */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold mb-1">📊 Análisis de Gastos — Marzo 2026</h1>
              <p className="text-slate-300 text-sm">Jorge Ramos · Transición laboral · De $4.518.000 → $2.500.000</p>
            </div>
            <button
              onClick={toggleFullscreen}
              title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
              className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-3 py-2 rounded-lg transition border border-white/20 flex-shrink-0 ml-4"
            >
              {isFullscreen ? <><IconCompress /> Salir</> : <><IconExpand /> Pantalla completa</>}
            </button>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryCard label="Sueldo actual"  value={fmt(SALARY_ACTUAL)} sub="Este mes"          color="text-emerald-400" />
            <SummaryCard label="Sueldo nuevo"   value={fmt(SALARY_NUEVO)}  sub="Objetivo laboral"  color="text-yellow-300" />
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
                  { label: "Gasto actual (Marzo 2026)",          value: total,         color: "text-red-600" },
                  { label: "− Ahorro potencial total",           value: -totalRec,     color: "text-emerald-600" },
                  { label: "Gasto proyectado (aplicando todo)",  value: postRecTotal,  color: postRecTotal <= TARGET ? "text-green-700" : "text-orange-600" },
                  { label: "🎯 Target mensual",                  value: TARGET,        color: "text-blue-600" },
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
              <h2 className="text-lg font-bold mb-1">🎯 Tu Plan de Ajuste: de $3.868.440 a $2.500.000</h2>
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
                { action: "Sistema Hecate: quedan ~4 cuotas",    saving: 162333, detail: "En ~4 meses, se liberan $162.333/mes automáticamente" },
                { action: "LoJack: esta es la ÚLTIMA cuota",     saving: 20171,  detail: "El mes que viene ya no lo pagás" },
                { action: "GADNIC (electrónica): quedan 5 cuotas", saving: 71815, detail: "En 5 meses se libera $71.815/mes" },
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