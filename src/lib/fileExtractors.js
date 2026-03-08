/**
 * fileExtractors.js
 * Pipeline de extracción de texto desde distintos formatos de archivo.
 *
 * SEGURIDAD: todas las librerías se cargan desde npm (bundleadas por Vite)
 * mediante dynamic import() — lazy loading sin dependencias de CDN externo.
 * Solo los datos de idioma de Tesseract (tessdata) se descargan desde
 * tessdata.projectnaptha.com en tiempo de ejecución; esto es inevitable
 * dado el tamaño de los modelos OCR (~10 MB/idioma).
 */

// ── Supported file types ──────────────────────────────────────────────────────
export const SUPPORTED_EXTENSIONS = [
  'csv', 'tsv',
  'xlsx', 'xls',
  'pdf',
  'docx', 'doc',
  'txt', 'text', 'rtf',
  'png', 'jpg', 'jpeg', 'webp', 'tiff', 'bmp',
];

export function isFileSupported(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  return SUPPORTED_EXTENSIONS.includes(ext);
}

// ── Input validation ──────────────────────────────────────────────────────────
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

export function validateFile(file) {
  if (!file)                          return 'No se seleccionó ningún archivo.';
  if (file.size > MAX_FILE_SIZE_BYTES) return 'El archivo supera el límite de 50 MB.';
  if (!isFileSupported(file))
    return `Formato .${file.name.split('.').pop()} no soportado. ` +
           `Formatos aceptados: ${SUPPORTED_EXTENSIONS.join(', ')}.`;
  return null;
}

// ── Lazy-loaded npm modules (singleton cache) ─────────────────────────────────
// Each getter imports the module only once and caches it — identical to
// the previous CDN approach but without any network dependency for code.

let _pdfjs    = null;
let _ExcelJS  = null;
let _JSZip    = null;
let _Tesseract = null;

async function getPDFJS() {
  if (_pdfjs) return _pdfjs;
  _pdfjs = await import('pdfjs-dist');
  // Set worker from the bundled package — Vite resolves this at build time.
  // No CDN fallback: the CSP (worker-src 'self' blob:) bloquearía cualquier
  // worker externo de todos modos. Si el worker local falla, PDF.js lanzará
  // un error descriptivo que el UI puede mostrar al usuario.
  const { default: workerUrl } = await import(
    'pdfjs-dist/build/pdf.worker.min.mjs?url'
  );
  _pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
  return _pdfjs;
}

async function getExcelJS() {
  if (_ExcelJS) return _ExcelJS;
  const mod = await import('exceljs');
  _ExcelJS = mod.default ?? mod;  // ExcelJS exports a default class namespace
  return _ExcelJS;
}

async function getJSZip() {
  if (_JSZip) return _JSZip;
  const mod = await import('jszip');
  _JSZip = mod.default ?? mod;
  return _JSZip;
}

async function getTesseract() {
  if (_Tesseract) return _Tesseract;
  _Tesseract = await import('tesseract.js');
  return _Tesseract;
}

// ── Main entry point ──────────────────────────────────────────────────────────
/**
 * @param {File}     file
 * @param {Function} onProgress  ({ stage: string, percent: number }) => void
 * @returns {Promise<{ type: 'text'|'table', text?: string, rows?: Array, rawLines?: string[] }>}
 */
export async function extractFromFile(file, onProgress = () => {}) {
  const ext = file.name.split('.').pop().toLowerCase();

  switch (ext) {
    case 'csv':
    case 'tsv':
      return extractCSV(file, onProgress);

    case 'xlsx':
    case 'xls':
      return extractExcel(file, onProgress);

    case 'pdf':
      return extractPDF(file, onProgress);

    case 'docx':
    case 'doc':
      return extractDOCX(file, onProgress);

    case 'txt':
    case 'text':
    case 'rtf':
      return extractPlainText(file, onProgress);

    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'webp':
    case 'tiff':
    case 'bmp':
      return extractImage(file, onProgress);

    default:
      throw new Error(
        `Formato .${ext} no soportado. ` +
        `Formatos aceptados: ${SUPPORTED_EXTENSIONS.join(', ')}.`
      );
  }
}

// ── CSV / TSV ─────────────────────────────────────────────────────────────────
async function extractCSV(file, onProgress) {
  onProgress({ stage: 'Leyendo CSV…', percent: 20 });
  const text = await readFileAsText(file);
  onProgress({ stage: 'Analizando estructura…', percent: 60 });

  const sep  = text.includes('\t') ? '\t' : detectSeparator(text);
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  const rows  = lines.map(line => parseCSVLine(line, sep));

  onProgress({ stage: 'Listo', percent: 100 });
  return { type: 'table', rows, rawLines: lines };
}

function detectSeparator(text) {
  const firstLine = text.split(/\r?\n/)[0] || '';
  const counts = { ',': 0, ';': 0, '|': 0 };
  for (const ch of firstLine) { if (counts[ch] !== undefined) counts[ch]++; }
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function parseCSVLine(line, sep) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { cur += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === sep && !inQuotes) {
      result.push(cur.trim()); cur = '';
    } else {
      cur += ch;
    }
  }
  result.push(cur.trim());
  return result;
}

// ── Excel (ExcelJS — sin vulnerabilidades conocidas, MIT) ─────────────────────
async function extractExcel(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();

  // ExcelJS sólo soporta el formato moderno Open XML (.xlsx).
  // .xls es un formato binario OLE2 de 1997; el usuario debe convertirlo.
  if (ext === 'xls') {
    throw new Error(
      'El formato .xls (Excel 97-2003) no está soportado. ' +
      'Abrí el archivo en Excel y guardalo como .xlsx para poder importarlo.'
    );
  }

  onProgress({ stage: 'Cargando módulo Excel…', percent: 15 });
  const ExcelJS = await getExcelJS();

  onProgress({ stage: 'Leyendo archivo…', percent: 40 });
  const arrayBuffer = await file.arrayBuffer();
  const workbook    = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('El archivo Excel no contiene hojas de cálculo.');

  onProgress({ stage: 'Procesando filas…', percent: 70 });
  const rows = [];
  worksheet.eachRow({ includeEmpty: false }, (row) => {
    // row.values es un array 1-indexed (índice 0 = vacío); slice(1) lo normaliza.
    const cells = (row.values ?? []).slice(1).map(cellValueToString);
    rows.push(cells);
  });

  onProgress({ stage: 'Listo', percent: 100 });
  return {
    type: 'table',
    rows:     rows.map(r => r.map(c => c.trim())),
    rawLines: rows.map(r => r.join('\t')),
  };
}

/**
 * Convierte cualquier tipo de valor de celda ExcelJS a string legible.
 * Maneja: strings, números, fechas, richText, fórmulas y errores.
 */
function cellValueToString(value) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString('es-AR');
  if (typeof value === 'object') {
    // Rich text: { richText: [{ text, font }, ...] }
    if (value.richText)           return value.richText.map(rt => rt.text ?? '').join('');
    // Fórmula: { formula, result }
    if (value.result !== undefined) return String(value.result ?? '');
    // Hyperlink: { text, hyperlink }
    if (value.text  !== undefined)  return String(value.text);
    // Error de celda: { error: '#REF!' }
    if (value.error)                return '';
  }
  return String(value);
}

// ── PDF ───────────────────────────────────────────────────────────────────────
async function extractPDF(file, onProgress) {
  onProgress({ stage: 'Cargando módulo PDF…', percent: 10 });
  const pdfjsLib = await getPDFJS();

  onProgress({ stage: 'Leyendo PDF…', percent: 25 });
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc      = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const totalPages = pdfDoc.numPages;
  const allLines   = [];

  for (let p = 1; p <= totalPages; p++) {
    const page    = await pdfDoc.getPage(p);
    const content = await page.getTextContent();
    allLines.push(...buildLinesFromPDFItems(content.items));
    onProgress({
      stage:   `Extrayendo página ${p}/${totalPages}…`,
      percent: 25 + Math.round((p / totalPages) * 60),
    });
  }

  const fullText = allLines.join('\n');

  // If very little text found → PDF is scanned, try OCR on first page
  if (fullText.replace(/\s/g, '').length < 100) {
    onProgress({ stage: 'PDF sin texto — aplicando OCR…', percent: 90 });
    return extractPDFViaOCR(pdfDoc, onProgress);
  }

  onProgress({ stage: 'Listo', percent: 100 });
  return { type: 'text', text: fullText, rawLines: allLines };
}

function buildLinesFromPDFItems(items) {
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

async function extractPDFViaOCR(pdfDoc, onProgress) {
  const page     = await pdfDoc.getPage(1);
  const viewport = page.getViewport({ scale: 2.0 });
  const canvas   = document.createElement('canvas');
  canvas.width   = viewport.width;
  canvas.height  = viewport.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  return new Promise((resolve, reject) => {
    canvas.toBlob(async blob => {
      try { resolve(await extractImage(blob, onProgress)); }
      catch (e) { reject(e); }
    }, 'image/png');
  });
}

// ── DOCX / DOC ────────────────────────────────────────────────────────────────
async function extractDOCX(file, onProgress) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'doc') {
    // .doc is legacy binary OLE — extract printable text as best-effort
    onProgress({ stage: 'Formato .doc: extrayendo texto básico…', percent: 40 });
    const text = await readFileAsText(file, 'latin1');
    const cleaned = text
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    onProgress({ stage: 'Listo', percent: 100 });
    return { type: 'text', text: cleaned, rawLines: cleaned.split('\n') };
  }

  onProgress({ stage: 'Cargando módulo DOCX…', percent: 15 });
  const JSZip = await getJSZip();

  onProgress({ stage: 'Descomprimiendo DOCX…', percent: 35 });
  const arrayBuffer = await file.arrayBuffer();
  const zip         = await JSZip.loadAsync(arrayBuffer);
  const docXmlFile  = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('Archivo DOCX inválido o dañado.');

  onProgress({ stage: 'Extrayendo texto…', percent: 65 });
  const docXml = await docXmlFile.async('string');
  const text   = xmlToText(docXml);

  onProgress({ stage: 'Listo', percent: 100 });
  return { type: 'text', text, rawLines: text.split('\n').filter(l => l.trim()) };
}

function xmlToText(xml) {
  return xml
    .replace(/<w:p[ />]/g, '\n')
    .replace(/<w:tr[ />]/g, '\n')
    .replace(/<w:tc[ />]/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .split('\n')
    .map(l => l.replace(/\s+/g, ' ').trim())
    .filter(l => l)
    .join('\n');
}

// ── Plain Text ─────────────────────────────────────────────────────────────────
async function extractPlainText(file, onProgress) {
  onProgress({ stage: 'Leyendo archivo de texto…', percent: 50 });
  const text = await readFileAsText(file);
  onProgress({ stage: 'Listo', percent: 100 });
  return { type: 'text', text, rawLines: text.split(/\r?\n/) };
}

// ── Image OCR ──────────────────────────────────────────────────────────────────
async function extractImage(file, onProgress) {
  onProgress({ stage: 'Cargando motor OCR… (puede tardar unos segundos)', percent: 10 });

  const { createWorker } = await getTesseract();

  const worker = await createWorker(['spa', 'eng'], 1, {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        onProgress({
          stage:   'OCR en progreso…',
          percent: 20 + Math.round(m.progress * 70),
        });
      }
    },
  });

  const url    = file instanceof Blob ? URL.createObjectURL(file) : file;
  const result = await worker.recognize(url);
  await worker.terminate();
  if (file instanceof Blob && typeof url === 'string') URL.revokeObjectURL(url);

  const text = result.data.text;
  onProgress({ stage: 'Listo', percent: 100 });
  return { type: 'text', text, rawLines: text.split('\n') };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function readFileAsText(file, encoding = 'utf-8') {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result);
    reader.onerror = ()  => reject(new Error('No se pudo leer el archivo.'));
    reader.readAsText(file, encoding);
  });
}
