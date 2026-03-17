/**
 * bbvaParser.js
 * Parsea resúmenes de tarjeta BBVA Visa/Master en PDF.
 * Extrae transacciones, agrupa peajes repetidos, y auto-categoriza.
 */

// Fecha: DD-Mon-YY (ej: 31-Dic-25, 22-Ene-26)
const TX_DATE = /^\d{2}-[A-Za-z]{3}-\d{2}$/;
// Monto en formato argentino: 1.234.567,89 o 1.234,56 o 1,23
const AMOUNT_RE = /^[\d.]+,\d{2}$/;

const MERCHANT_RULES = [
  { test: /AUOESTE|AUSA\b|AUSOL|CEAMSE/i,      cat: 'Peajes',         icon: '🛣️', group: 'Peajes Autopista' },
  { test: /APPYPF|YPF.*COMBUST/i,               cat: 'Nafta',          icon: '⛽', group: null },
  { test: /NETFLIX/i,                            cat: 'Suscripciones',  icon: '📺', group: null },
  { test: /SPOTIFY/i,                            cat: 'Suscripciones',  icon: '🎵', group: null },
  { test: /RAPPIPRO|RAPPI/i,                     cat: 'Suscripciones',  icon: '📦', group: null },
  { test: /^PERSONAL\s/i,                        cat: 'Celular',        icon: '📱', group: null },
  { test: /SAFEPARKING/i,                        cat: 'Estacionamiento',icon: '🅿️', group: null },
  { test: /ARCOSDORADOS/i,                       cat: 'Comidas',        icon: '🍔', group: null },
  { test: /HECATESECURIT/i,                      cat: 'Seguridad',      icon: '🔒', group: null },
  { test: /DC\s+\w+/i,                           cat: 'Salud',          icon: '🏥', group: null },
  { test: /MERPAGO\*/i,                          cat: 'MercadoPago',    icon: '💳', group: null },
  { test: /UBER|CABIFY|DIDI/i,                   cat: 'Transporte',     icon: '🚕', group: null },
  { test: /PEDIDOSYA|RAPPI/i,                    cat: 'Delivery',       icon: '🛵', group: null },
];

function parseMonto(str) {
  // "162.333,33" → 162333
  return Math.round(parseFloat(str.replace(/\./g, '').replace(',', '.')));
}

function categorizeTx(description) {
  for (const rule of MERCHANT_RULES) {
    if (rule.test.test(description)) {
      return { cat: rule.cat, icon: rule.icon, group: rule.group };
    }
  }
  return { cat: 'Otros', icon: '💡', group: null };
}

function cleanDescription(desc) {
  return desc
    .replace(/^MERPAGO\*/i, '')
    .replace(/\s+C\.\d+\/\d+$/i, '') // Remove "C.02/06" installment suffix
    .trim();
}

function buildLines(items) {
  if (!items.length) return [];
  const byLine = new Map();
  for (const item of items) {
    const y = Math.round(item.transform[5] / 5) * 5;
    if (!byLine.has(y)) byLine.set(y, []);
    byLine.get(y).push({ x: item.transform[4], text: item.str });
  }
  return [...byLine.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([, its]) => its.sort((a, b) => a.x - b.x).map(i => i.text).join(' ').trim())
    .filter(l => l.length > 0);
}

function parseLine(line) {
  // Split the line into tokens
  const tokens = line.trim().split(/\s+/);
  if (tokens.length < 4) return null;

  // First token must be a date
  if (!TX_DATE.test(tokens[0])) return null;

  // Scan from right: last AMOUNT_RE token = pesos (and optionally before that = usd)
  // The token just before the amount(s) = 6-digit coupon number
  let pesosIdx = -1;
  let usdIdx = -1;
  let couponIdx = -1;

  for (let i = tokens.length - 1; i >= 1; i--) {
    if (AMOUNT_RE.test(tokens[i])) {
      if (pesosIdx === -1) {
        pesosIdx = i;
      } else if (usdIdx === -1) {
        usdIdx = i;
        break;
      }
    } else if (/^\d{6}$/.test(tokens[i]) && pesosIdx !== -1 && couponIdx === -1) {
      couponIdx = i;
      break;
    }
  }

  if (pesosIdx === -1) return null;

  const pesos = parseMonto(tokens[pesosIdx]);
  const usd = usdIdx !== -1 ? parseMonto(tokens[usdIdx]) : null;

  // Description = everything between date and coupon (or amount if no coupon)
  const descEnd = couponIdx !== -1 ? couponIdx : (usdIdx !== -1 ? usdIdx : pesosIdx);
  const description = tokens.slice(1, descEnd).join(' ').trim();

  if (!description) return null;

  // Skip header/footer lines
  if (/TOTAL CONSUMOS|SALDO ACTUAL|SU PAGO|INTERESES|PAGO MÍNIMO/i.test(description)) return null;

  return { date: tokens[0], description, pesos, usd };
}

export async function parseBBVAPDF(file) {
  const pdfjsLib = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

  const allLines = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    allLines.push(...buildLines(content.items));
  }

  const rawTxs = [];
  for (const line of allLines) {
    const tx = parseLine(line);
    if (tx) rawTxs.push(tx);
  }

  // Separate ARS and USD transactions
  const arsTxs = [];
  const usdTxs = [];

  for (const tx of rawTxs) {
    // USD transaction: pesos amount is very small (< 500) and usd field exists
    // or description contains "USD" keyword
    const isUSD = (tx.pesos < 500 && tx.usd !== null) || /USD\s*\d/i.test(tx.description);
    if (isUSD) {
      usdTxs.push(tx);
    } else {
      arsTxs.push(tx);
    }
  }

  // Build grouped ARS items
  const grouped = [];
  const groupMap = {};

  for (const tx of arsTxs) {
    const { cat, icon, group } = categorizeTx(tx.description);
    const desc = cleanDescription(tx.description);

    if (group) {
      // Accumulate grouped (e.g., tolls)
      if (!groupMap[group]) {
        groupMap[group] = {
          id: `group_${group.replace(/\s+/g, '_')}`,
          date: tx.date,
          description: group,
          pesos: 0,
          cat,
          icon,
          count: 0,
          selected: true,
          isGroup: true,
        };
        grouped.push(groupMap[group]);
      }
      groupMap[group].pesos += tx.pesos;
      groupMap[group].count += 1;
    } else {
      grouped.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        date: tx.date,
        description: desc,
        pesos: tx.pesos,
        cat,
        icon,
        count: null,
        selected: true,
        isGroup: false,
      });
    }
  }

  // Add count to grouped descriptions
  for (const item of grouped) {
    if (item.isGroup && item.count > 1) {
      item.description = `${item.description} (${item.count} viajes)`;
    }
  }

  // Build USD items (shown separately, amount in USD)
  const usdItems = usdTxs.map(tx => ({
    id: `usd_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    date: tx.date,
    description: cleanDescription(tx.description),
    pesos: tx.usd ?? tx.pesos,
    amountIsUSD: true,
    cat: 'Suscripciones',
    icon: '💱',
    selected: false, // off by default — user decides peso equivalent
    isGroup: false,
  }));

  return { arsTxs: grouped, usdTxs: usdItems, totalFound: rawTxs.length };
}
