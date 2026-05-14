"use client";

import { useState, useEffect, useCallback } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  Copy,
  Image,
  Barcode as BarcodeIcon,
  Type,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import toast from "react-hot-toast";
import {
  LabelFormat,
  LabelElement,
  loadLabelFormats,
  saveLabelFormats,
  deleteLabelFormat,
  createNewLabelFormat,
  createLabelElement,
  isDefaultFormat,
} from "@/lib/labelFormats";
import LabelPreview from "./LabelPreview";

interface LabelFormatEditorProps {
  open: boolean;
  onClose: () => void;
  initialFormatId?: string;
  barcodeValue: string;
  productId: string;
  productName: string;
  serialNumber?: string;
  onFormatSaved?: () => void;
}

export default function LabelFormatEditor({
  open,
  onClose,
  initialFormatId,
  barcodeValue,
  productId,
  productName,
  serialNumber,
  onFormatSaved,
}: LabelFormatEditorProps) {
  const [formats, setFormats] = useState<LabelFormat[]>([]);
  const [selectedFormatId, setSelectedFormatId] = useState<string | null>(null);
  const [editingFormat, setEditingFormat] = useState<LabelFormat | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [expandedElements, setExpandedElements] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const loaded = loadLabelFormats();
    setFormats(loaded);
    const id = initialFormatId && loaded.find((f) => f.id === initialFormatId)
      ? initialFormatId
      : loaded[0]?.id || null;
    setSelectedFormatId(id);
    const fmt = loaded.find((f) => f.id === id);
    setEditingFormat(fmt ? { ...fmt } : null);
  }, [open, initialFormatId]);

  const selectFormat = useCallback(
    (id: string) => {
      setSelectedFormatId(id);
      const fmt = formats.find((f) => f.id === id);
      setEditingFormat(fmt ? { ...fmt } : null);
      setSelectedElementId(null);
    },
    [formats]
  );

  const updateFormat = useCallback((updates: Partial<LabelFormat>) => {
    setEditingFormat((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const updateElement = useCallback(
    (elementId: string, updates: Partial<LabelElement>) => {
      setEditingFormat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elements: prev.elements.map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
          ),
        };
      });
    },
    []
  );

  const addElement = useCallback(
    (type: "logo" | "barcode" | "text") => {
      setEditingFormat((prev) => {
        if (!prev) return null;
        const newEl = createLabelElement(type, prev.width, prev.height);
        return { ...prev, elements: [...prev.elements, newEl] };
      });
      setTimeout(() => {
        setEditingFormat((prev) => {
          if (!prev) return null;
          const lastId = prev.elements[prev.elements.length - 1]?.id;
          if (lastId) setSelectedElementId(lastId);
          return prev;
        });
      }, 0);
    },
    []
  );

  const removeElement = useCallback(
    (elementId: string) => {
      setEditingFormat((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          elements: prev.elements.filter((el) => el.id !== elementId),
        };
      });
      if (selectedElementId === elementId) setSelectedElementId(null);
    },
    [selectedElementId]
  );

  const duplicateElement = useCallback(
    (elementId: string) => {
      setEditingFormat((prev) => {
        if (!prev) return null;
        const el = prev.elements.find((e) => e.id === elementId);
        if (!el) return prev;
        const copy: LabelElement = {
          ...el,
          id: Math.random().toString(36).substring(2, 10),
          x: el.x + 5,
          y: el.y + 5,
        };
        const idx = prev.elements.findIndex((e) => e.id === elementId);
        const newElements = [...prev.elements];
        newElements.splice(idx + 1, 0, copy);
        return { ...prev, elements: newElements };
      });
    },
    []
  );

  const handleSave = useCallback(() => {
    if (!editingFormat) return;
    if (!editingFormat.name.trim()) {
      toast.error("Bitte einen Formatnamen eingeben.");
      return;
    }
    const all = loadLabelFormats();
    const idx = all.findIndex((f) => f.id === editingFormat.id);
    if (idx >= 0) {
      all[idx] = editingFormat;
    } else {
      all.push(editingFormat);
    }
    saveLabelFormats(all);
    setFormats(all);
    toast.success("Format gespeichert.");
    onFormatSaved?.();
  }, [editingFormat, onFormatSaved]);

  const handleDeleteFormat = useCallback(() => {
    if (!editingFormat) return;
    if (isDefaultFormat(editingFormat.id)) {
      toast.error("Standard-Formate können nicht gelöscht werden.");
      return;
    }
    deleteLabelFormat(editingFormat.id);
    const all = loadLabelFormats();
    setFormats(all);
    setSelectedFormatId(all[0]?.id || null);
    setEditingFormat(all[0] ? { ...all[0] } : null);
    toast.success("Format gelöscht.");
    onFormatSaved?.();
  }, [editingFormat, onFormatSaved]);

  const handleNewFormat = useCallback(() => {
    const fmt = createNewLabelFormat();
    setFormats((prev) => [...prev, fmt]);
    setSelectedFormatId(fmt.id);
    setEditingFormat({ ...fmt });
    setSelectedElementId(null);
  }, []);

  const handleDuplicateFormat = useCallback(() => {
    if (!editingFormat) return;
    const copy: LabelFormat = {
      ...editingFormat,
      id: Math.random().toString(36).substring(2, 10),
      name: editingFormat.name + " (Kopie)",
      elements: editingFormat.elements.map((el) => ({
        ...el,
        id: Math.random().toString(36).substring(2, 10),
      })),
    };
    setFormats((prev) => [...prev, copy]);
    setSelectedFormatId(copy.id);
    setEditingFormat({ ...copy });
    setSelectedElementId(null);
  }, [editingFormat]);

  const toggleElementExpand = useCallback((id: string) => {
    setExpandedElements((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectedElement = editingFormat?.elements.find(
    (el) => el.id === selectedElementId
  );

  if (!open || !editingFormat) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-lg font-semibold text-gray-900">
            Etikettenformat-Editor
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top bar: Format list + New Format */}
        <div className="flex items-center gap-2 px-5 py-2 border-b border-gray-200 bg-gray-50 shrink-0 overflow-x-auto">
          <button
            onClick={handleNewFormat}
            className="shrink-0 inline-flex items-center gap-1.5 text-sm bg-black text-white hover:bg-gray-800 rounded-lg px-3 py-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Neues Format
          </button>
          <div className="w-px h-6 bg-gray-300 mx-1 shrink-0" />
          {formats.map((fmt) => (
            <button
              key={fmt.id}
              onClick={() => selectFormat(fmt.id)}
              className={`shrink-0 text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
                selectedFormatId === fmt.id
                  ? "bg-white text-gray-900 shadow-sm ring-1 ring-gray-200"
                  : "text-gray-600 hover:bg-gray-200"
              }`}
            >
              <span className="font-medium">{fmt.name}</span>
            </button>
          ))}
        </div>

        {/* Body: horizontal split */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left: Settings + Elements */}
          <div className="w-80 border-r border-gray-200 flex flex-col overflow-hidden bg-white">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Format settings */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Format-Einstellungen
                </h3>
                <div>
                  <label className="label text-xs">Name</label>
                  <input
                    className="input-field text-sm"
                    value={editingFormat.name}
                    onChange={(e) => updateFormat({ name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="label text-xs">Breite (mm)</label>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      className="input-field text-sm"
                      value={editingFormat.width}
                      onChange={(e) =>
                        updateFormat({ width: Number(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Höhe (mm)</label>
                    <input
                      type="number"
                      step="1"
                      min="10"
                      className="input-field text-sm"
                      value={editingFormat.height}
                      onChange={(e) =>
                        updateFormat({ height: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  <div>
                    <label className="label text-xs">Pad. oben</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="input-field text-sm px-1.5"
                      value={editingFormat.padding.top}
                      onChange={(e) =>
                        updateFormat({
                          padding: {
                            ...editingFormat.padding,
                            top: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Pad. unten</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="input-field text-sm px-1.5"
                      value={editingFormat.padding.bottom}
                      onChange={(e) =>
                        updateFormat({
                          padding: {
                            ...editingFormat.padding,
                            bottom: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Pad. links</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="input-field text-sm px-1.5"
                      value={editingFormat.padding.left}
                      onChange={(e) =>
                        updateFormat({
                          padding: {
                            ...editingFormat.padding,
                            left: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Pad. rechts</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="input-field text-sm px-1.5"
                      value={editingFormat.padding.right}
                      onChange={(e) =>
                        updateFormat({
                          padding: {
                            ...editingFormat.padding,
                            right: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Add elements */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Elemente hinzufügen
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => addElement("logo")}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg px-2 py-2 transition-colors"
                  >
                    <Image className="w-3.5 h-3.5" /> Logo
                  </button>
                  <button
                    onClick={() => addElement("barcode")}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg px-2 py-2 transition-colors"
                  >
                    <BarcodeIcon className="w-3.5 h-3.5" /> Barcode
                  </button>
                  <button
                    onClick={() => addElement("text")}
                    className="flex-1 inline-flex items-center justify-center gap-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg px-2 py-2 transition-colors"
                  >
                    <Type className="w-3.5 h-3.5" /> Text
                  </button>
                </div>
              </div>

              {/* Elements list */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-900">
                  Elemente ({editingFormat.elements.length})
                </h3>
                {editingFormat.elements.map((el, idx) => {
                  const isExpanded = expandedElements.has(el.id);
                  const isSelected = selectedElementId === el.id;
                  return (
                    <div
                      key={el.id}
                      className={`border rounded-lg overflow-hidden ${
                        isSelected
                          ? "border-blue-400 bg-blue-50/50"
                          : "border-gray-200"
                      }`}
                    >
                      <button
                        onClick={() => {
                          setSelectedElementId(el.id);
                          toggleElementExpand(el.id);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-50"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span className="text-xs text-gray-400 w-5">
                          #{idx + 1}
                        </span>
                        <span className="text-sm font-medium capitalize">
                          {el.type === "logo"
                            ? "Logo"
                            : el.type === "barcode"
                            ? "Barcode"
                            : "Text"}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">
                          {el.x},{el.y}
                        </span>
                      </button>
                      {isExpanded && (
                        <div className="px-3 pb-3 space-y-2 border-t border-gray-100">
                          {/* Position */}
                          <div className="grid grid-cols-2 gap-2 pt-2">
                            <div>
                              <label className="label text-xs">X (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                className="input-field text-sm"
                                value={el.x}
                                onChange={(e) =>
                                  updateElement(el.id, {
                                    x: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="label text-xs">Y (mm)</label>
                              <input
                                type="number"
                                step="0.5"
                                className="input-field text-sm"
                                value={el.y}
                                onChange={(e) =>
                                  updateElement(el.id, {
                                    y: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="label text-xs">
                                Breite (mm)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="1"
                                className="input-field text-sm"
                                value={el.width}
                                onChange={(e) =>
                                  updateElement(el.id, {
                                    width: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                            <div>
                              <label className="label text-xs">
                                Höhe (mm)
                              </label>
                              <input
                                type="number"
                                step="0.5"
                                min="1"
                                className="input-field text-sm"
                                value={el.height}
                                onChange={(e) =>
                                  updateElement(el.id, {
                                    height: Number(e.target.value),
                                  })
                                }
                              />
                            </div>
                          </div>

                          {/* Text-specific */}
                          {el.type === "text" && (
                            <div className="space-y-2">
                              <div>
                                <label className="label text-xs">Inhalt</label>
                                <select
                                  className="input-field text-sm"
                                  value={el.content || "product_name"}
                                  onChange={(e) =>
                                    updateElement(el.id, {
                                      content: e.target.value as any,
                                    })
                                  }
                                >
                                  <option value="product_id">Produkt-ID</option>
                                  <option value="product_name">
                                    Produktname
                                  </option>
                                  <option value="serial_number">
                                    Seriennummer
                                  </option>
                                  <option value="barcode_text">
                                    Barcode-Text
                                  </option>
                                  <option value="custom">Eigener Text</option>
                                </select>
                              </div>
                              {el.content === "custom" && (
                                <div>
                                  <label className="label text-xs">
                                    Eigener Text
                                  </label>
                                  <input
                                    className="input-field text-sm"
                                    value={el.customText || ""}
                                    onChange={(e) =>
                                      updateElement(el.id, {
                                        customText: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="label text-xs">
                                    Schriftgrösse (px)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    min="6"
                                    className="input-field text-sm"
                                    value={el.fontSize || 12}
                                    onChange={(e) =>
                                      updateElement(el.id, {
                                        fontSize: Number(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                                <div>
                                  <label className="label text-xs">
                                    Ausrichtung
                                  </label>
                                  <select
                                    className="input-field text-sm"
                                    value={el.align || "left"}
                                    onChange={(e) =>
                                      updateElement(el.id, {
                                        align: e.target.value as any,
                                      })
                                    }
                                  >
                                    <option value="left">Links</option>
                                    <option value="center">Zentriert</option>
                                    <option value="right">Rechts</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="label text-xs">
                                  Schriftgewicht
                                </label>
                                <select
                                  className="input-field text-sm"
                                  value={el.fontWeight || "400"}
                                  onChange={(e) =>
                                    updateElement(el.id, {
                                      fontWeight: e.target.value,
                                    })
                                  }
                                >
                                  <option value="400">Normal</option>
                                  <option value="600">Fett</option>
                                  <option value="700">Extra Fett</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {/* Barcode-specific settings */}
                          {el.type === "barcode" && (
                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="label text-xs">Strichbreite (px)</label>
                                  <select
                                    className="input-field text-sm"
                                    value={el.barcodeLineWidth || 2}
                                    onChange={(e) =>
                                      updateElement(el.id, {
                                        barcodeLineWidth: Number(e.target.value),
                                      })
                                    }
                                  >
                                    <option value={1}>1 px (fein)</option>
                                    <option value={2}>2 px (Standard)</option>
                                    <option value={3}>3 px (breit)</option>
                                    <option value={4}>4 px (extra breit)</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="label text-xs">Barcode-Höhe (px)</label>
                                  <input
                                    type="number"
                                    step="10"
                                    min="20"
                                    max="200"
                                    className="input-field text-sm"
                                    value={el.barcodeHeight || 80}
                                    onChange={(e) =>
                                      updateElement(el.id, {
                                        barcodeHeight: Number(e.target.value),
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`display-value-${el.id}`}
                                  checked={el.barcodeDisplayValue ?? false}
                                  onChange={(e) =>
                                    updateElement(el.id, {
                                      barcodeDisplayValue: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                                <label htmlFor={`display-value-${el.id}`} className="text-xs text-gray-700">
                                  Barcode-Text unter den Strichen anzeigen
                                </label>
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  id={`shorten-${el.id}`}
                                  checked={el.barcodeShorten ?? false}
                                  onChange={(e) =>
                                    updateElement(el.id, {
                                      barcodeShorten: e.target.checked,
                                    })
                                  }
                                  className="w-4 h-4 rounded border-gray-300"
                                />
                                <label htmlFor={`shorten-${el.id}`} className="text-xs text-gray-700">
                                  Barcode kürzen (letzte 6 Zeichen — halbe Breite)
                                </label>
                              </div>
                            </div>
                          )}

                          {/* Rotation — for all element types */}
                          <div>
                            <label className="label text-xs">Rotation</label>
                            <div className="flex gap-1">
                              {[0, 45, 90, 180, 270].map((deg) => (
                                <button
                                  key={deg}
                                  onClick={() =>
                                    updateElement(el.id, { rotation: deg })
                                  }
                                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors ${
                                    (el.rotation || 0) === deg
                                      ? "bg-black text-white"
                                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                  }`}
                                >
                                  {deg}°
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => duplicateElement(el.id)}
                              className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-md px-2 py-1 transition-colors"
                            >
                              <Copy className="w-3 h-3" /> Duplizieren
                            </button>
                            <button
                              onClick={() => removeElement(el.id)}
                              className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md px-2 py-1 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" /> Löschen
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Large Preview */}
          <div className="flex-1 flex flex-col bg-gray-100 overflow-hidden">
            <div className="flex-1 flex items-center justify-center overflow-auto p-8">
              <LabelPreview
                format={editingFormat}
                barcodeValue={barcodeValue}
                productId={productId}
                productName={productName}
                serialNumber={serialNumber}
                selectedElementId={selectedElementId}
                onSelectElement={setSelectedElementId}
                onUpdateElement={updateElement}
              />
            </div>
            {/* Selected element quick info */}
            {selectedElement && (
              <div className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-500 flex items-center gap-4 shrink-0">
                <span className="font-medium text-gray-700">
                  {selectedElement.type === "logo"
                    ? "Logo"
                    : selectedElement.type === "barcode"
                    ? "Barcode"
                    : "Text"}
                </span>
                <span>
                  X: {selectedElement.x}mm · Y: {selectedElement.y}mm
                </span>
                <span>
                  {selectedElement.width}mm × {selectedElement.height}mm
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-200 bg-gray-50 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={handleDuplicateFormat}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-3 py-2 transition-colors"
            >
              <Copy className="w-4 h-4" /> Duplizieren
            </button>
            {!isDefaultFormat(editingFormat.id) && (
              <button
                onClick={handleDeleteFormat}
                className="inline-flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 bg-white border border-red-200 hover:bg-red-50 rounded-lg px-3 py-2 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Löschen
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-sm text-gray-600 hover:text-black bg-white border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2 transition-colors"
            >
              Schliessen
            </button>
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 text-sm bg-black text-white hover:bg-gray-800 rounded-lg px-4 py-2 transition-colors"
            >
              <Save className="w-4 h-4" /> Speichern
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
