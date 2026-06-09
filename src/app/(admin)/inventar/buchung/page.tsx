"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { BarcodeScannerModal } from "@/components/BarcodeScannerModal";
import {
  ArrowLeft,
  ScanBarcode,
  Plus,
  Save,
  Trash2,
  Package,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import toast from "react-hot-toast";

type ScannedItem = {
  key: string;
  productId: string;
  productName: string;
  productItemId?: string;
  serialNumber?: string;
  barcode: string;
  currentStatus: string;
  newStatus: string;
  type: "product_item" | "product";
};

const STATUS_OPTIONS = [
  { value: "verfuegbar", label: "Verfügbar" },
  { value: "vermietet", label: "Vermietet" },
  { value: "reserviert", label: "Reserviert" },
  { value: "defekt", label: "Defekt" },
];

export default function ArtikelbuchungPage() {
  const [code, setCode] = useState("");
  const [items, setItems] = useState<ScannedItem[]>([]);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const lookupItem = useCallback(
    async (rawCode: string) => {
      const trimmed = rawCode.trim().toUpperCase();
      if (!trimmed) return;

      // Check duplicates
      if (items.some((i) => i.barcode === trimmed)) {
        toast.error("Artikel bereits in der Liste");
        return;
      }

      // 1. Try product_items by barcode
      const { data: productItem, error: piError } = await supabase
        .from("product_items")
        .select("*, product:product_id(id, name, status)")
        .eq("barcode", trimmed)
        .maybeSingle();

      if (!piError && productItem) {
        const newItem: ScannedItem = {
          key: `${trimmed}-${Date.now()}`,
          productId: productItem.product_id,
          productName: productItem.product?.name || "Unbekannt",
          productItemId: productItem.id,
          serialNumber: productItem.serial_number || undefined,
          barcode: trimmed,
          currentStatus: productItem.status,
          newStatus: productItem.status,
          type: "product_item",
        };
        setItems((prev) => [...prev, newItem]);
        toast.success(`Artikel gefunden: ${newItem.productName}`);
        return;
      }

      // 2. Try products by barcode
      const { data: productByBarcode, error: pbError } = await supabase
        .from("products")
        .select("id, name, status, barcode")
        .eq("barcode", trimmed)
        .maybeSingle();

      if (!pbError && productByBarcode) {
        const newItem: ScannedItem = {
          key: `${trimmed}-${Date.now()}`,
          productId: productByBarcode.id,
          productName: productByBarcode.name,
          barcode: trimmed,
          currentStatus: productByBarcode.status,
          newStatus: productByBarcode.status,
          type: "product",
        };
        setItems((prev) => [...prev, newItem]);
        toast.success(`Produkt gefunden: ${newItem.productName}`);
        return;
      }

      // 3. Try products by product_id
      const { data: productById, error: pidError } = await supabase
        .from("products")
        .select("id, name, status, product_id")
        .eq("product_id", trimmed)
        .maybeSingle();

      if (!pidError && productById) {
        const newItem: ScannedItem = {
          key: `${trimmed}-${Date.now()}`,
          productId: productById.id,
          productName: productById.name,
          barcode: trimmed,
          currentStatus: productById.status,
          newStatus: productById.status,
          type: "product",
        };
        setItems((prev) => [...prev, newItem]);
        toast.success(`Produkt gefunden: ${newItem.productName}`);
        return;
      }

      toast.error("Artikel nicht gefunden");
    },
    [items, supabase]
  );

  const handleAdd = async () => {
    await lookupItem(code);
    setCode("");
    inputRef.current?.focus();
  };

  const handleScan = async (scannedCode: string) => {
    setShowScanner(false);
    await lookupItem(scannedCode);
    inputRef.current?.focus();
  };

  const updateStatus = (key: string, newStatus: string) => {
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, newStatus } : i))
    );
  };

  const removeItem = (key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  };

  const handleSave = async () => {
    if (items.length === 0) {
      toast.error("Keine Artikel zum Speichern");
      return;
    }

    const changed = items.filter((i) => i.currentStatus !== i.newStatus);
    if (changed.length === 0) {
      toast.error("Keine Statusänderungen vorhanden");
      return;
    }

    setSaving(true);
    let successCount = 0;
    let errorCount = 0;

    for (const item of changed) {
      if (item.type === "product_item" && item.productItemId) {
        const { error } = await supabase
          .from("product_items")
          .update({ status: item.newStatus })
          .eq("id", item.productItemId);
        if (error) {
          console.error(error);
          errorCount++;
        } else {
          successCount++;
        }
      } else {
        const { error } = await supabase
          .from("products")
          .update({ status: item.newStatus })
          .eq("id", item.productId);
        if (error) {
          console.error(error);
          errorCount++;
        } else {
          successCount++;
        }
      }
    }

    setSaving(false);

    if (errorCount === 0) {
      toast.success(`${successCount} Artikel erfolgreich gebucht`);
      setItems([]);
    } else {
      toast.error(
        `${successCount} erfolgreich, ${errorCount} fehlgeschlagen`
      );
      // Update current status to reflect saved ones
      setItems((prev) =>
        prev.map((i) =>
          changed.some((c) => c.key === i.key)
            ? { ...i, currentStatus: i.newStatus }
            : i
        )
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/inventar/"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Artikelbuchung
          </h1>
          <p className="text-gray-600 text-sm">
            Scanne oder suche Artikel und ändere deren Status
          </p>
        </div>
      </div>

      {/* Input + Scanner */}
      <div className="card space-y-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Barcode oder Produkt-ID eingeben..."
            className="input-field flex-1"
            autoFocus
          />
          <button
            onClick={handleAdd}
            disabled={!code.trim()}
            className="btn-secondary px-4"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="btn-primary px-4"
          >
            <ScanBarcode className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-gray-500">
          Tipp: Du kannst auch direkt mit einem Barcode-Scanner scannen — das
          Eingabefeld fokussiert automatisch.
        </p>
      </div>

      {/* Item list */}
      {items.length > 0 && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">
              Erfasste Artikel ({items.length})
            </h2>
            <button
              onClick={() => setItems([])}
              className="text-sm text-red-600 hover:text-red-700"
            >
              Alle löschen
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item) => {
              const hasChanged = item.currentStatus !== item.newStatus;
              return (
                <div
                  key={item.key}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    hasChanged
                      ? "border-blue-300 bg-blue-50/50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="p-2 bg-gray-100 rounded-lg shrink-0">
                    <Package className="w-5 h-5 text-gray-500" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {item.productName}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                      <span className="font-mono">{item.barcode}</span>
                      {item.serialNumber && (
                        <span>· SN: {item.serialNumber}</span>
                      )}
                      {item.type === "product_item" && (
                        <span className="text-blue-600">Einzelartikel</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <select
                      value={item.newStatus}
                      onChange={(e) => updateStatus(item.key, e.target.value)}
                      className="text-sm border border-gray-300 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {hasChanged ? (
                      <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                    ) : (
                      <div className="w-5 h-5 shrink-0" />
                    )}

                    <button
                      onClick={() => removeItem(item.key)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {items.filter((i) => i.currentStatus !== i.newStatus).length}{" "}
              Änderung(en) vorgemerkt
            </div>
            <button
              onClick={handleSave}
              disabled={saving || items.every((i) => i.currentStatus === i.newStatus)}
              className="btn-primary px-6 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Speichern...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Save className="w-4 h-4" />
                  Speichern
                </span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {items.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-12 text-center">
          <ScanBarcode className="w-12 h-12 text-gray-300 mb-3" />
          <h3 className="text-gray-900 font-medium">Keine Artikel erfasst</h3>
          <p className="text-gray-500 text-sm mt-1 max-w-xs">
            Scanne einen Barcode oder gib eine Produkt-ID ein, um Artikel
            hinzuzufügen.
          </p>
        </div>
      )}

      <BarcodeScannerModal
        open={showScanner}
        onScan={handleScan}
        onClose={() => setShowScanner(false)}
      />
    </div>
  );
}
