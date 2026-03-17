/**
 * excelParser.js
 * Parsea Gastos.xlsx y extrae los 7 gastos fijos del último mes disponible.
 */

const FIXED_EXPENSES = [
  { key: 'edenor',  patterns: ['EDENOR'],                       icon: '⚡', label: 'Edenor' },
  { key: 'naturgy', patterns: ['NATURGY'],                      icon: '🔥', label: 'Naturgy' },
  { key: 'patente', patterns: ['PATENTE'],                      icon: '📋', label: 'Patente' },
  { key: 'agua',    patterns: ['AGUA ABSA', 'AGUA'],            icon: '💧', label: 'Agua ABSA' },
  { key: 'peugeot', patterns: ['CUOTA PEUGEOT', 'PEUGEOT'],    icon: '🚗', label: 'Cuota Peugeot' },
  { key: 'tasa',    patterns: ['TASA POR SERV', 'TASA'],       icon: '🏛️', label: 'Tasa Serv. Gral' },
  { key: 'celu',    patterns: ['CELU NATIVA', 'NATIVA BNA', 'NATIVA BNA VIEJA'], icon: '📱', label: 'Celu Nativa BNA' },
];

function cellToNumber(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return value > 0 ? Math.round(value) : null;
  const str = String(value).trim();
  if (str === '' || str === '-' || str === '0') return null;
  // Argentine format: "1.234.567,89" → remove dots, replace comma with dot
  const cleaned = str.replace(/[$\s]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return !isNaN(num) && num > 0 ? Math.round(num) : null;
}

export async function parseGastosExcel(file) {
  const mod = await import('exceljs');
  const ExcelJS = mod.default ?? mod;

  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.getWorksheet('Mensual');
  if (!sheet) throw new Error('No se encontró la hoja "Mensual" en el archivo.');

  // Read header row to get column labels
  const headerRow = sheet.getRow(1);
  const colLabels = {};
  headerRow.eachCell({ includeEmpty: false }, (cell, colNum) => {
    if (cell.value) colLabels[colNum] = String(cell.value).trim();
  });

  const results = [];

  sheet.eachRow((row, rowNum) => {
    if (rowNum === 1) return; // skip header
    const firstCell = row.getCell(1);
    if (!firstCell.value) return;

    const cellStr = String(firstCell.value).toUpperCase().trim();
    const expense = FIXED_EXPENSES.find(e =>
      e.patterns.some(p => cellStr.includes(p.toUpperCase()))
    );
    if (!expense) return;
    if (results.find(r => r.key === expense.key)) return; // already found

    // Find last non-null numeric value scanning right to left
    let lastAmount = 0;
    let lastColLabel = '';
    let lastColNum = 0;

    row.eachCell({ includeEmpty: false }, (cell, colNum) => {
      if (colNum === 1) return;
      const num = cellToNumber(cell.value);
      if (num !== null && colNum > lastColNum) {
        lastAmount = num;
        lastColLabel = colLabels[colNum] || `Col ${colNum}`;
        lastColNum = colNum;
      }
    });

    results.push({
      key: expense.key,
      label: expense.label,
      icon: expense.icon,
      amount: lastAmount,
      colLabel: lastColLabel,
      selected: lastAmount > 0,
    });
  });

  // Ensure all 7 items appear even if not found
  for (const expense of FIXED_EXPENSES) {
    if (!results.find(r => r.key === expense.key)) {
      results.push({
        key: expense.key,
        label: expense.label,
        icon: expense.icon,
        amount: 0,
        colLabel: '—',
        selected: false,
      });
    }
  }

  return results;
}
