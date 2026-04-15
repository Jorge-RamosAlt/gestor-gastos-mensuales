import React, { useState, useRef } from "react";
import { extractFromFile, isFileSupported, SUPPORTED_EXTENSIONS } from "../../lib/fileExtractors.js";
import { parseExpenses } from "../../lib/expenseParser.js";
import { fmt } from "../../lib/formatters.js";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const CONF_LABEL = (c) =>
  c >= 0.8 ? { label: "Alta",  cls: "bg-green-100 text-green-700"  } :
  c >= 0.6 ? { label: "Media", cls: "bg-yellow-100 text-yellow-700" } :
             { label: "Baja",  cls: "bg-orange-100 text-orange-700" };

const FORMAT_CHIPS = [
  { ext: "CSV",  color: "bg-green-100 text-green-700"  },
  { ext: "XLSX", color: "bg-blue-100 text-blue-700"    },
  { ext: "PDF",  color: "bg-red-100 text-red-700"      },
  { ext: "DOCX", color: "bg-indigo-100 text-indigo-700"},
  { ext: "TXT",  color: "bg-gray-100 text-gray-600"    },
  { ext: "PNG",  color: "bg-purple-100 text-purple-700"},
  { ext: "JPG",  color: "bg-pink-100 text-pink-700"    },
];

function ImportTab({ categories: _categories, onImport }) {
  const [step, setStep]             = useState("idle");
  const [file, setFile]             = useState(null);
  const [progress, setProgress]     = useState({ stage: "", percent: 0 });
  const [previewItems, setPreviewItems] = useState([]);
  const [parserMeta, setParserMeta] = useState({});
  const [errorMsg, setErrorMsg]     = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [editingId, setEditingId]   = useState(null);
  const [editField, setEditField]   = useState(null);
  const [editValue, setEditValue]   = useState("");

  const fileInputRef = useRef(null);

  const validateFile = (f) => {
    if (!f) return "No se seleccionó ningún archivo.";
    if (f.size > MAX_FILE_SIZE) return `El archivo supera el límite de 50 MB.`;
    if (!isFileSupported(f))
      return `Formato .${f.name.split(".").pop()} no soportado. Formatos aceptados: ${SUPPORTED_EXTENSIONS.join(", ")}.`;
    return null;
  };

  const getSpecificErrorMessage = (error) => {
    const message = error.message || "";

    // File too large
    if (message.includes("50 MB")) {
      return "El archivo es muy grande (máximo 50 MB). Intentá dividirlo en partes más pequeñas.";
    }

    // Unsupported format
    if (message.includes("no soportado")) {
      return "Formato no soportado. Los formatos válidos son: PDF, Excel (.xlsx/.xls), CSV, Word (.docx), e imágenes.";
    }

    // PDF without text / scanned PDF OCR failure
    if (message.includes("PDF sin texto") || message.includes("OCR")) {
      return "No se pudo leer la imagen. Asegurate de que el texto sea legible y la imagen tenga buena resolución.";
    }

    // Unable to read file
    if (message.includes("No se pudo leer el archivo")) {
      return "No se pudo leer el archivo. Verificá que sea un archivo válido y que no esté dañado.";
    }

    // Excel format issues (.xls)
    if (message.includes(".xls")) {
      return "El formato .xls (Excel 97-2003) no está soportado. Abrí el archivo en Excel y guardalo como .xlsx para poder importarlo.";
    }

    // Invalid DOCX
    if (message.includes("DOCX inválido")) {
      return "El archivo DOCX está dañado o no es válido. Intentá abrirlo en Word y guardarlo de nuevo.";
    }

    // Keep original message as fallback
    return message;
  };

  const processFile = async (f) => {
    const err = validateFile(f);
    if (err) { setErrorMsg(err); setStep("error"); return; }

    setFile(f);
    setStep("processing");
    setProgress({ stage: "Iniciando…", percent: 5 });
    setErrorMsg("");

    try {
      const extracted = await extractFromFile(f, setProgress);
      setProgress({ stage: "Detectando gastos…", percent: 95 });

      const parsed = parseExpenses(extracted);
      if (!parsed.items.length) {
        setErrorMsg("No se encontraron gastos en el archivo. Probá con otro formato o revisá que el documento contenga montos.");
        setStep("error");
        return;
      }

      setParserMeta({ strategy: parsed.strategy, warning: parsed.warning });
      setPreviewItems(
        parsed.items.map(item => ({
          ...item,
          selected: true,
          assignedCatId: "nueva",
        }))
      );
      setProgress({ stage: "Listo", percent: 100 });
      setStep("preview");
    } catch (e) {
      const specificMsg = getSpecificErrorMessage(e);
      setErrorMsg(specificMsg);
      setStep("error");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) processFile(f);
  };

  const startEdit = (id, field, value) => {
    setEditingId(id); setEditField(field); setEditValue(String(value));
  };
  const commitEdit = () => {
    setPreviewItems(prev => prev.map(item => {
      if (item.id !== editingId) return item;
      if (editField === "amount") {
        const n = parseInt(editValue.replace(/\D/g, ""), 10);
        return isNaN(n) ? item : { ...item, amount: n };
      }
      if (editField === "description") {
        return editValue.trim() ? { ...item, description: editValue.trim() } : item;
      }
      return item;
    }));
    setEditingId(null); setEditField(null);
  };

  const selectedItems  = previewItems.filter(i => i.selected);
  const selectedTotal  = selectedItems.reduce((s, i) => s + i.amount, 0);
  const toggleItem     = (id) => setPreviewItems(prev => prev.map(i => i.id === id ? { ...i, selected: !i.selected } : i));
  const toggleAll      = () => {
    const allSel = previewItems.every(i => i.selected);
    setPreviewItems(prev => prev.map(i => ({ ...i, selected: !allSel })));
  };

  const confirmImport = () => {
    if (!selectedItems.length) return;
    onImport(selectedItems, file.name);
    setStep("idle");
    setPreviewItems([]);
    setFile(null);
  };

  const resetToIdle = () => {
    setStep("idle"); setFile(null); setPreviewItems([]); setErrorMsg(""); setProgress({ stage: "", percent: 0 });
  };

  return (
    <div className="pb-8 space-y-4">

      {/* ── HEADER ── */}
      <div className="bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl p-5">
        <h2 className="text-lg font-bold mb-1">📂 Importar Gastos desde Archivo</h2>
        <p className="text-teal-200 text-sm">
          Subí un extracto bancario, factura, planilla o imagen — el sistema detecta los montos automáticamente.
        </p>
      </div>

      {/* ── IDLE: Drop zone ── */}
      {step === "idle" && (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all
            ${isDragging ? "border-teal-500 bg-teal-50 scale-[1.01]" : "border-gray-300 bg-white hover:border-teal-400 hover:bg-teal-50/40"}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={SUPPORTED_EXTENSIONS.map(e => `.${e}`).join(",")}
            onChange={(e) => { if (e.target.files[0]) processFile(e.target.files[0]); e.target.value = ""; }}
          />
          <div className="text-5xl mb-3">{isDragging ? "📂" : "📁"}</div>
          <p className="font-bold text-gray-700 text-base mb-1">
            {isDragging ? "Soltá el archivo aquí" : "Arrastrá un archivo o hacé clic para seleccionar"}
          </p>
          <p className="text-gray-400 text-sm mb-4">Máx. 50 MB</p>
          <div className="flex flex-wrap justify-center gap-2">
            {FORMAT_CHIPS.map(({ ext, color }) => (
              <span key={ext} className={`text-xs font-bold px-2.5 py-1 rounded-full ${color}`}>{ext}</span>
            ))}
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-gray-100 text-gray-500">+más</span>
          </div>
        </div>
      )}

      {/* ── PROCESSING ── */}
      {step === "processing" && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center">
          <div className="text-4xl mb-3 animate-bounce">⚙️</div>
          <p className="font-bold text-gray-700 mb-1">{file?.name}</p>
          <p className="text-gray-400 text-sm mb-5">{progress.stage}</p>
          <div className="relative h-3 bg-gray-100 rounded-full overflow-hidden mx-auto max-w-xs">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-300"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <p className="text-teal-600 text-sm font-medium mt-2">{progress.percent}%</p>
        </div>
      )}

      {/* ── ERROR ── */}
      {step === "error" && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-3">❌</div>
          <p className="font-bold text-red-700 mb-1">No se pudo procesar el archivo</p>
          <p className="text-red-600 text-sm mb-4">{errorMsg}</p>
          <button
            onClick={resetToIdle}
            className="bg-red-100 hover:bg-red-200 text-red-700 font-bold px-5 py-2 rounded-xl text-sm transition"
          >
            Intentar con otro archivo
          </button>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {step === "preview" && (
        <div className="space-y-3">

          {/* File info + strategy */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="text-sm font-semibold text-teal-800">📄 {file?.name}</p>
              <p className="text-xs text-teal-600">Estrategia: {parserMeta.strategy}</p>
              {parserMeta.warning && (
                <p className="text-xs text-amber-600 mt-0.5">⚠️ {parserMeta.warning}</p>
              )}
            </div>
            <button onClick={resetToIdle} className="text-xs text-teal-600 hover:text-teal-800 underline flex-shrink-0">
              Cambiar archivo
            </button>
          </div>

          {/* Selection summary */}
          <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-gray-600">
              <span className="font-bold text-gray-800">{selectedItems.length}</span> de{" "}
              <span className="font-bold">{previewItems.length}</span> ítems seleccionados
              {" · "}Total: <span className="font-bold text-teal-700">{fmt(selectedTotal)}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={toggleAll}
                className="text-xs font-medium text-gray-500 hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg"
              >
                {previewItems.every(i => i.selected) ? "Deseleccionar todo" : "Seleccionar todo"}
              </button>
            </div>
          </div>

          {/* Preview table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-2 text-left w-8">
                      <input
                        type="checkbox"
                        checked={previewItems.every(i => i.selected)}
                        onChange={toggleAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 py-2 text-left text-gray-600 font-semibold">Descripción</th>
                    <th className="px-3 py-2 text-right text-gray-600 font-semibold">Monto</th>
                    <th className="px-3 py-2 text-center text-gray-600 font-semibold w-20">Confianza</th>
                    <th className="px-3 py-2 text-center text-gray-600 font-semibold w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewItems.map((item) => {
                    const conf = CONF_LABEL(item.confidence);
                    return (
                      <tr
                        key={item.id}
                        className={`transition ${item.selected ? "bg-white" : "bg-gray-50 opacity-50"}`}
                      >
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={item.selected} onChange={() => toggleItem(item.id)} className="rounded" />
                        </td>

                        <td className="px-3 py-2 max-w-xs">
                          {editingId === item.id && editField === "description" ? (
                            <input
                              autoFocus
                              className="w-full border rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={commitEdit}
                              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") { setEditingId(null); } }}
                            />
                          ) : (
                            <div>
                              <button
                                className="text-left text-gray-700 hover:text-teal-700 hover:underline truncate max-w-[240px] block"
                                onClick={() => startEdit(item.id, "description", item.description)}
                                title="Clic para editar"
                              >
                                {item.description}
                              </button>
                              {item.date && <p className="text-xs text-gray-400">{item.date}</p>}
                            </div>
                          )}
                        </td>

                        <td className="px-3 py-2 text-right">
                          {editingId === item.id && editField === "amount" ? (
                            <input
                              autoFocus
                              className="w-28 border rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-teal-400"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value.replace(/\D/g, ""))}
                              onBlur={commitEdit}
                              onKeyDown={(e) => { if (e.key === "Enter") commitEdit(); if (e.key === "Escape") setEditingId(null); }}
                            />
                          ) : (
                            <button
                              className="font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-0.5 rounded-lg transition border border-blue-200 text-xs"
                              onClick={() => startEdit(item.id, "amount", item.amount)}
                              title="Clic para editar"
                            >
                              {fmt(item.amount)}
                            </button>
                          )}
                        </td>

                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${conf.cls}`}>{conf.label}</span>
                        </td>

                        <td className="px-3 py-2 text-center">
                          <button
                            onClick={() => setPreviewItems(prev => prev.filter(i => i.id !== item.id))}
                            className="text-gray-300 hover:text-red-500 transition text-base leading-none"
                            title="Eliminar fila"
                          >×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            💡 Hacé clic en la descripción o el monto para editar antes de importar.
          </p>

          <div className="flex gap-3">
            <button
              onClick={resetToIdle}
              className="flex-1 border-2 border-gray-200 text-gray-600 font-semibold py-3 rounded-xl hover:bg-gray-50 transition text-sm"
            >
              Cancelar
            </button>
            <button
              onClick={confirmImport}
              disabled={!selectedItems.length}
              className={`flex-1 font-bold py-3 rounded-xl transition text-sm shadow
                ${selectedItems.length
                  ? "bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-500 hover:to-teal-400 text-white"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed"}`}
            >
              Importar {selectedItems.length > 0 ? `${selectedItems.length} gastos →` : ""}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportTab;
