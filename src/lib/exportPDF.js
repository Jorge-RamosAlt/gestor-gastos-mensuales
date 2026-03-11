/**
 * exportPDF.js — genera un resumen PDF del mes usando el Canvas API del browser
 * No requiere librerías externas (usa window.print con estilos inline)
 */
export function exportToPDF(categories, profile, monthLabel) {
  const total = categories.reduce((s, c) => s + c.items.reduce((ss, i) => ss + (Number(i.amount)||0), 0), 0);

  const fmt = (n) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(n);

  const rows = categories.map(cat => {
    const catTotal = cat.items.reduce((s, i) => s + (Number(i.amount)||0), 0);
    const pct = total > 0 ? Math.round((catTotal / total) * 100) : 0;
    const color = cat.budget > 0 && catTotal > cat.budget ? '#ef4444' : '#1e293b';
    return `
      <tr>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0">${cat.name}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:${color};font-weight:600">${fmt(catTotal)}</td>
        <td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b">${pct}%</td>
        ${cat.budget > 0 ? `<td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;text-align:right;color:#64748b">${fmt(cat.budget)}</td>` : '<td></td>'}
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Gastos ${monthLabel}</title>
  <style>
    body { font-family: system-ui, sans-serif; color: #1e293b; padding: 32px; max-width: 800px; margin: 0 auto; }
    h1 { font-size: 24px; margin-bottom: 4px; }
    .sub { color: #64748b; font-size: 14px; margin-bottom: 24px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e293b; color: white; padding: 8px 12px; text-align: left; }
    .total-row td { font-weight: 700; font-size: 15px; background: #f8fafc; }
    .kpi { display: flex; gap: 16px; margin-bottom: 24px; }
    .kpi-card { flex: 1; background: #f1f5f9; border-radius: 8px; padding: 12px 16px; }
    .kpi-label { font-size: 11px; color: #64748b; }
    .kpi-value { font-size: 18px; font-weight: 700; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>📊 Análisis de Gastos — ${monthLabel}</h1>
  <p class="sub">${profile.name} · Generado el ${new Date().toLocaleDateString('es-AR')}</p>
  <div class="kpi">
    <div class="kpi-card"><div class="kpi-label">Sueldo actual</div><div class="kpi-value">${fmt(profile.salaryActual)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Target</div><div class="kpi-value">${fmt(profile.salaryTarget)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total gastos</div><div class="kpi-value" style="color:${total > profile.salaryTarget ? '#ef4444' : '#10b981'}">${fmt(total)}</div></div>
    <div class="kpi-card"><div class="kpi-label">${total > profile.salaryTarget ? 'Exceso' : 'Margen'}</div><div class="kpi-value">${fmt(Math.abs(total - profile.salaryTarget))}</div></div>
  </div>
  <table>
    <thead><tr><th>Categoría</th><th style="text-align:right">Monto</th><th style="text-align:right">%</th><th style="text-align:right">Presupuesto</th></tr></thead>
    <tbody>${rows}</tbody>
    <tfoot><tr class="total-row"><td style="padding:8px 12px">TOTAL</td><td style="padding:8px 12px;text-align:right">${fmt(total)}</td><td style="padding:8px 12px;text-align:right">100%</td><td></td></tr></tfoot>
  </table>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); }, 500);
}
