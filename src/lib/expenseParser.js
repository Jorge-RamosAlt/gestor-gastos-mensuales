/**
 * expenseParser.js
 * Motor de extracción de gastos desde texto/tablas de documentos financieros.
 *
 * Estrategias (aplicadas en orden de confianza):
 *  1. parseAsStructuredTable — para CSV/Excel con cabeceras reconocibles
 *  2. parseAsBankStatement   — extractos bancarios con fecha + desc + monto
 *  3. parseAsReceipt         — tickets/facturas con ítems y precios
 *  4. parseGeneric           — fallback: cualquier línea con monto detectado
 */

// ── AR Currency ───────────────────────────────────────────────────────────────
/**
 * Normaliza texto de monto en distintos formatos a número JS.
 * Maneja: $1.234.567,89 | 1.234.567,89 | 1234567.89 | 1,234,567.89
 */
export function parseAmount(raw) {
  if (!raw) return NaN;
  const s = String(raw).replace(/\s/g, '').replace(/\$/g, '');

  // AR format: dots=miles, coma=decimal → "1.234.567,89"
  if (/^\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(/\./g, '').replace(',', '.'));
  }
  // AR format without decimal → "1.234.567"
  if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    return parseFloat(s.replace(/\./g, ''));
  }
  // Coma only as decimal → "1234,89"
  if (/^\d+,\d{1,2}$/.test(s)) {
    return parseFloat(s.replace(',', '.'));
  }
  // Standard → "1234.89" or "1234"
  const n = parseFloat(s.replace(/,/g, ''));
  return isFinite(n) ? n : NaN;
}

/** Returns true if amount is reasonable for an expense (> 0 and < 100M ARS) */
function isReasonableAmount(n) {
  return isFinite(n) && n > 0 && n < 100_000_000;
}

/**
 * Regex patterns to detect currency amounts in text.
 * Returns the amount text (without $) and its position.
 */
const AMOUNT_PATTERNS = [
  // $1.234.567,89 or $ 1.234.567,89
  /\$\s*(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?)/g,
  // 1.234.567,89  (AR thousands + decimal)
  /(?<![.\d])(\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?)(?![.\d])/g,
  // 1234,89  (AR decimal only)
  /(?<![.,\d])(\d{4,}),(\d{2})(?![.\d])/g,
  // 1234.89  (standard)
  /(?<![.,\d])(\d{4,}\.\d{2})(?!\d)/g,
];

function findAmountsInText(text) {
  const found = [];
  for (const pattern of AMOUNT_PATTERNS) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(text)) !== null) {
      const raw = m[1] + (m[2] ? `,${m[2]}` : '');
      const n = parseAmount(raw);
      if (isReasonableAmount(n)) {
        found.push({ start: m.index, end: m.index + m[0].length, amount: n, raw: m[0].trim() });
      }
    }
  }
  // Deduplicate overlapping matches (keep largest)
  return found
    .sort((a, b) => a.start - b.start)
    .reduce((acc, cur) => {
      const prev = acc[acc.length - 1];
      if (prev && cur.start < prev.end) {
        if (cur.amount > prev.amount) acc[acc.length - 1] = cur;
        return acc;
      }
      acc.push(cur);
      return acc;
    }, []);
}

// ── Noise filters ─────────────────────────────────────────────────────────────
const NOISE_WORDS = /^(total|subtotal|saldo|balance|iva|impuesto|tax|descuento|discount|fee|cargo fijo|s\/e|n\/a|na|-)$/i;
const DATE_PATTERN = /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/;
const SKIP_LINES   = /^\s*$|^page\s*\d|^página\s*\d|^\*+$|^-+$|^=+$/i;

function cleanDescription(desc) {
  return desc
    .replace(/[$\d.,]+/g, '') // remove numbers/amounts
    .replace(/[|/\\*#@]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[-–:]+|[-–:]+$/g, '')
    .trim();
}

function isValidDescription(desc) {
  return desc.length >= 3 && !DATE_PATTERN.test(desc) && !NOISE_WORDS.test(desc);
}

// ── Unique ID helper ──────────────────────────────────────────────────────────
let _idCounter = 0;
function nextId() {
  return `imp_${Date.now()}_${++_idCounter}`;
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * @param {{ type: 'text'|'table', text?: string, rows?: Array, rawLines?: string[] }} extracted
 * @returns {{ items: Array<ParsedItem>, strategy: string, warning?: string }}
 *
 * ParsedItem: { id, description, amount, date?, confidence: 0-1 }
 */
export function parseExpenses(extracted) {
  let result;

  if (extracted.type === 'table' && extracted.rows?.length) {
    result = parseAsStructuredTable(extracted.rows);
    if (result.items.length > 0) return result;
  }

  const lines = extracted.rawLines
    || extracted.text?.split('\n')
    || [];

  // Try strategies in confidence order
  for (const strategy of [parseAsBankStatement, parseAsReceipt, parseGeneric]) {
    result = strategy(lines);
    if (result.items.length >= 2) return result;
  }

  // If only one item found from generic, return it anyway
  result = parseGeneric(lines);
  return result;
}

// ── Strategy 1: Structured Table (CSV / Excel) ────────────────────────────────
const DESCRIPTION_HEADERS = ['descripcion', 'descripción', 'concepto', 'detalle', 'glosa',
  'description', 'concept', 'detail', 'item', 'servicio'];
const AMOUNT_HEADERS       = ['importe', 'monto', 'debito', 'débito', 'debito', 'cargo',
  'debit', 'amount', 'total', 'valor', 'price', 'precio'];
const DATE_HEADERS         = ['fecha', 'date', 'dia', 'día'];
const EXCLUDE_HEADERS      = ['credito', 'crédito', 'credit', 'saldo', 'balance', 'haber'];

function normalize(s) { return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); }

function parseAsStructuredTable(rows) {
  const items = [];
  if (!rows.length) return { items, strategy: 'table' };

  // Find header row (first row with recognizable column names)
  let headerRow = -1;
  let descCol = -1, amtCol = -1, dateCol = -1;

  for (let i = 0; i < Math.min(5, rows.length); i++) {
    const row = rows[i].map(normalize);
    const descIdx = row.findIndex(c => DESCRIPTION_HEADERS.some(h => c.includes(h)));
    const amtIdx  = row.findIndex(c => AMOUNT_HEADERS.some(h => c.includes(h)) &&
                                        !EXCLUDE_HEADERS.some(h => c.includes(h)));
    if (descIdx !== -1 && amtIdx !== -1) {
      headerRow = i;
      descCol = descIdx;
      amtCol = amtIdx;
      dateCol = row.findIndex(c => DATE_HEADERS.some(h => c.includes(h)));
      break;
    }
  }

  // If no header found, try to infer from data pattern
  if (headerRow === -1) {
    const result = inferTableColumns(rows);
    if (result) { descCol = result.descCol; amtCol = result.amtCol; headerRow = result.headerRow; }
  }

  if (descCol === -1 || amtCol === -1) {
    return { items, strategy: 'table', warning: 'No se encontraron columnas de descripción/monto' };
  }

  const startRow = headerRow + 1;
  for (let i = startRow; i < rows.length; i++) {
    const row = rows[i];
    if (!row[amtCol]) continue;

    const amount = parseAmount(row[amtCol]);
    if (!isReasonableAmount(amount)) continue;

    const rawDesc = row[descCol] || '';
    const desc = cleanDescription(rawDesc);
    if (!desc) continue;

    items.push({
      id: nextId(),
      description: rawDesc.trim() || desc,
      amount,
      date: dateCol !== -1 ? String(row[dateCol] || '').trim() : undefined,
      confidence: 0.9,
    });
  }

  return { items, strategy: 'Tabla estructurada (columnas detectadas)' };
}

function inferTableColumns(rows) {
  // Find first row where most cells can be parsed as amounts
  // and try to match it with a description column
  for (let r = 0; r < Math.min(3, rows.length); r++) {
    const row = rows[r];
    let amtCol = -1, descCol = -1;
    for (let c = 0; c < row.length; c++) {
      const n = parseAmount(row[c]);
      if (isReasonableAmount(n) && amtCol === -1) { amtCol = c; }
      else if (row[c] && row[c].length > 3 && isNaN(parseAmount(row[c])) && descCol === -1) {
        descCol = c;
      }
    }
    if (amtCol !== -1 && descCol !== -1) {
      return { headerRow: r - 1, descCol, amtCol };
    }
  }
  return null;
}

// ── Strategy 2: Bank Statement (line-by-line) ─────────────────────────────────
// Pattern: [DD/MM/YYYY] description [optional_ref] amount [balance]
const DATE_RE   = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/;
const AMOUNT_RE = /\$?\s*(\d{1,3}(?:\.\d{3})*,\d{2}|\d{1,3}(?:\.\d{3})+|\d{4,}(?:,\d{2})?)/g;

function parseAsBankStatement(lines) {
  const items = [];
  let dateCount = 0;

  for (const line of lines) {
    if (SKIP_LINES.test(line)) continue;
    if (!DATE_RE.test(line)) continue;

    dateCount++;
    const dateMatch = DATE_RE.exec(line);
    const date = dateMatch ? dateMatch[1] : undefined;

    // Find all amounts in the line
    const amounts = [];
    AMOUNT_RE.lastIndex = 0;
    let m;
    while ((m = AMOUNT_RE.exec(line)) !== null) {
      const n = parseAmount(m[1]);
      if (isReasonableAmount(n)) amounts.push({ n, pos: m.index });
    }

    if (!amounts.length) continue;

    // In bank statements, the first amount is typically the debit/transaction amount,
    // and the last amount (if different) is the running balance. Take the first.
    const amount = amounts[0].n;

    // Description: text between date and first amount
    let desc = line;
    if (dateMatch) desc = desc.slice(dateMatch.index + dateMatch[0].length);
    if (amounts.length > 0) desc = desc.slice(0, amounts[0].pos - (dateMatch ? dateMatch.index + dateMatch[0].length : 0));
    desc = cleanDescription(desc);

    if (!isValidDescription(desc)) continue;

    items.push({ id: nextId(), description: desc, amount, date, confidence: 0.85 });
  }

  const hasEnoughDates = dateCount >= 2;
  return {
    items,
    strategy: 'Extracto bancario (fecha + descripción + monto)',
    warning: !hasEnoughDates ? 'Pocas fechas detectadas — resultado puede ser impreciso' : undefined,
  };
}

// ── Strategy 3: Receipt / Ticket ──────────────────────────────────────────────
// Pattern: item_name  [qty x price]  amount  (on the same line)
const RECEIPT_LINE_RE = /^(.+?)\s+\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:[.,]\d{2})?)$/;
const TOTAL_SKIP_RE   = /\b(total|subtotal|envio|envío|descuento|iva|impuesto|propina|recargo|saldo)\b/i;

function parseAsReceipt(lines) {
  const items = [];
  let totalSeen = false;

  for (const line of lines) {
    if (SKIP_LINES.test(line) || TOTAL_SKIP_RE.test(line)) {
      if (/\btotal\b/i.test(line)) totalSeen = true;
      continue;
    }
    if (totalSeen) continue; // Stop after TOTAL line

    const m = RECEIPT_LINE_RE.exec(line.trim());
    if (!m) continue;

    const amount = parseAmount(m[2]);
    if (!isReasonableAmount(amount)) continue;

    const desc = cleanDescription(m[1]);
    if (!isValidDescription(desc)) continue;

    items.push({ id: nextId(), description: desc, amount, confidence: 0.75 });
  }

  return { items, strategy: 'Ticket / Factura (ítems con precios)' };
}

// ── Strategy 4: Generic fallback ──────────────────────────────────────────────
function parseGeneric(lines) {
  const items = [];

  for (const line of lines) {
    if (SKIP_LINES.test(line)) continue;

    const amounts = findAmountsInText(line);
    if (!amounts.length) continue;

    // Take the largest non-balance amount (usually last meaningful amount on line)
    const amount = amounts.reduce((best, cur) => cur.amount > best.amount ? cur : best, amounts[0]);

    // Description: everything before the amount
    const rawDesc = line.slice(0, amount.start).trim() || line.slice(amount.end).trim() || line;
    const desc = cleanDescription(rawDesc);

    if (!isValidDescription(desc)) {
      // Use the whole line cleaned if no good description
      const fullClean = cleanDescription(line);
      if (!isValidDescription(fullClean)) continue;
      items.push({ id: nextId(), description: fullClean, amount: amount.amount, confidence: 0.5 });
      continue;
    }

    items.push({ id: nextId(), description: desc, amount: amount.amount, confidence: 0.6 });
  }

  // Deduplicate by similar (description, amount) pairs
  const seen = new Set();
  return {
    items: items.filter(item => {
      const key = `${item.description.toLowerCase()}|${item.amount}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
    strategy: 'Genérico (detección de montos)',
    warning: 'Revisá los ítems encontrados — la precisión puede variar',
  };
}
