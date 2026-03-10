/**
 * exportUtils.js — exportación de datos a Excel (.xlsx) y CSV
 *
 * Usa exceljs (ya en package.json) para Excel.
 * Para CSV usa solo strings nativos, sin dependencias extra.
 */

// ── CSV ───────────────────────────────────────────────────────────────────────
export function exportToCSV(categories, profile, monthLabel) {
  const rows = [
    ["Categoría", "Ítem", "Monto (ARS)", "Porcentaje"],
  ];

  const total = categories.reduce(
    (s, c) => s + c.items.reduce((ss, i) => ss + (Number(i.amount) || 0), 0),
    0
  );

  for (const cat of categories) {
    const catTotal = cat.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    for (const item of cat.items) {
      rows.push([
        cat.name.replace(/^\S+\s/, ""),   // sin emoji
        item.name,
        String(Number(item.amount) || 0),
        total > 0 ? `${Math.round(((Number(item.amount) || 0) / total) * 100)}%` : "0%",
      ]);
    }
    rows.push([`SUBTOTAL ${cat.name}`, "", String(catTotal), total > 0 ? `${Math.round((catTotal / total) * 100)}%` : "0%"]);
    rows.push(["", "", "", ""]);
  }

  rows.push(["TOTAL GASTOS", "", String(total), "100%"]);
  rows.push(["Sueldo actual", "", String(profile.salaryActual), ""]);
  rows.push(["Target", "", String(profile.salaryTarget), ""]);

  const csv = rows
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `gastos_${monthLabel.replace(/\s/g, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Excel (.xlsx) con ExcelJS ─────────────────────────────────────────────────
export async function exportToExcel(categories, profile, monthLabel) {
  // Importación dinámica para no penalizar el bundle inicial
  const ExcelJS = (await import("exceljs")).default;

  const wb = new ExcelJS.Workbook();
  wb.creator = "Gestor Gastos Familiares";
  wb.created = new Date();

  const ws = wb.addWorksheet("Gastos " + monthLabel);

  // ── Título ──
  ws.mergeCells("A1:D1");
  const titleCell = ws.getCell("A1");
  titleCell.value = `Gastos Mensuales — ${monthLabel}`;
  titleCell.font  = { bold: true, size: 14, color: { argb: "FFFFFFFF" } };
  titleCell.fill  = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  titleCell.alignment = { horizontal: "center" };
  ws.getRow(1).height = 28;

  // ── Fila vacía ──
  ws.addRow([]);

  // ── Info de perfil ──
  ws.addRow(["Nombre", profile.name, "", ""]);
  ws.addRow(["Sueldo actual", profile.salaryActual, "", ""]);
  ws.addRow(["Target (sueldo objetivo)", profile.salaryTarget, "", ""]);
  ws.addRow([]);

  // ── Headers de tabla ──
  const headerRow = ws.addRow(["Categoría", "Ítem / Gasto", "Monto (ARS)", "% del Total"]);
  headerRow.eachCell(cell => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF334155" } };
    cell.alignment = { horizontal: "center" };
  });

  const total = categories.reduce(
    (s, c) => s + c.items.reduce((ss, i) => ss + (Number(i.amount) || 0), 0),
    0
  );

  // ── Paleta de colores de filas de categoría ──
  const CAT_COLORS = [
    "FFE0E7FF","FFD1FAE5","FFFEF3C7","FFFEE2E2",
    "FFEDE9FE","FFE0F2FE","FFFCE7F3","FFF0FDF4",
  ];

  let colorIdx = 0;
  for (const cat of categories) {
    const catTotal = cat.items.reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const catColor = CAT_COLORS[colorIdx % CAT_COLORS.length];
    colorIdx++;

    // Fila de categoría
    const catRow = ws.addRow([
      cat.name,
      "",
      catTotal,
      total > 0 ? catTotal / total : 0,
    ]);
    catRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: catColor } };
      cell.font = { bold: true };
    });
    catRow.getCell(3).numFmt = "#,##0";
    catRow.getCell(4).numFmt = "0%";

    // Filas de ítems
    for (const item of cat.items) {
      const itemRow = ws.addRow([
        "",
        item.name + (item.note ? ` (${item.note})` : ""),
        Number(item.amount) || 0,
        total > 0 ? (Number(item.amount) || 0) / total : 0,
      ]);
      itemRow.getCell(3).numFmt = "#,##0";
      itemRow.getCell(4).numFmt = "0%";
    }
  }

  // ── Fila de totales ──
  ws.addRow([]);
  const totalRow = ws.addRow(["TOTAL", "", total, 1]);
  totalRow.eachCell({ includeEmpty: true }, (cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  });
  totalRow.getCell(3).numFmt = "#,##0";
  totalRow.getCell(4).numFmt = "0%";

  // ── Anchos de columna ──
  ws.getColumn(1).width = 30;
  ws.getColumn(2).width = 40;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 12;

  // ── Descarga ──
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement("a");
  a.href    = url;
  a.download = `gastos_${monthLabel.replace(/\s/g, "_")}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
