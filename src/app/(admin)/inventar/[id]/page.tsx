"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  Printer,
  Upload,
  X,
  FileText,
  ImageIcon,
} from "lucide-react";
import Barcode from "react-barcode";
import { formatDate, getStatusColor, getStatusLabel, formatCurrency } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: cats }] = await Promise.all([
        supabase
          .from("products")
          .select("*, category:category_id(*)")
          .eq("id", id)
          .single(),
        supabase.from("product_categories").select("*").order("name"),
      ]);
      if (p) {
        setProduct(p);
        setForm({
          name: p.name,
          manufacturer: p.manufacturer,
          manufactureDate: p.manufacture_date || "",
          dimensions: p.dimensions || "",
          description: p.description || "",
          categoryId: p.category_id || "",
          status: p.status,
          technicalSpecs: p.technical_specs || "",
          rentalPricePerDay: p.rental_price_per_day ?? "",
          quantity: p.quantity ?? 1,
          manualUrl: p.manual_url || "",
          purchaseDate: p.purchase_date || "",
          purchasePrice: p.purchase_price ?? "",
          weight: p.weight ?? "",
          condition: p.condition || "",
        });
        if (p.image_url) {
          setImagePreview(p.image_url);
        }
      }
      setCategories(cats || []);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte laden Sie ein Bild hoch.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5 MB gross sein.");
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imagePreview;
    const ext = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile, { upsert: true });
    if (error) {
      toast.error("Fehler beim Bild-Upload: " + error.message);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return publicUrl;
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let imageUrl = imagePreview;
    if (imageFile) {
      const uploaded = await uploadImage();
      if (uploaded) imageUrl = uploaded;
    } else if (!imagePreview && product?.image_url) {
      imageUrl = null;
    }

    const { error } = await supabase
      .from("products")
      .update({
        name: form.name,
        manufacturer: form.manufacturer,
        manufacture_date: form.manufactureDate || null,
        dimensions: form.dimensions || null,
        description: form.description || null,
        category_id: form.categoryId || null,
        status: form.status,
        image_url: imageUrl,
        technical_specs: form.technicalSpecs || null,
        rental_price_per_day: form.rentalPricePerDay
          ? parseFloat(form.rentalPricePerDay)
          : null,
        quantity: parseInt(form.quantity) || 1,
        manual_url: form.manualUrl || null,
        purchase_date: form.purchaseDate || null,
        purchase_price: form.purchasePrice
          ? parseFloat(form.purchasePrice)
          : null,
        weight: form.weight ? parseFloat(form.weight) : null,
        condition: form.condition || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Artikel aktualisiert.");
    setImageFile(null);
  };

  const handleDelete = async () => {
    if (!confirm("Artikel wirklich löschen?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Artikel gelöscht.");
    router.push("/inventar/");
  };

  const printBarcode = () => {
    const svgEl = document.getElementById("barcode-svg");
    if (!svgEl || !product) return;
    const svgHtml = svgEl.outerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Barcode</title></head>
        <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
          <div style="text-align:center;">
            <div style="font-size:12px;margin-bottom:8px;font-weight:600;">${product.product_id}</div>
            <div>${svgHtml}</div>
            <div style="font-size:14px;margin-top:8px;">${product.name}</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const updateForm = useCallback(
    (key: string, value: any) => {
      setForm((prev: any) => ({ ...prev, [key]: value }));
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Artikel nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/inventar/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Artikel bearbeiten</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={printBarcode}
            className="btn-secondary text-sm py-2 px-3"
          >
            <Printer className="w-4 h-4 mr-1" /> Barcode
          </button>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 p-2"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-4">
          <div className="text-xs text-gray-500">Produkt-ID</div>
          <div className="font-mono text-sm">{product.product_id}</div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-xs text-gray-500">Barcode</div>
          <div className="font-mono text-sm">{product.barcode}</div>
        </div>
        <div className="mt-4 flex justify-center">
          <div id="barcode-svg">
            <Barcode
              value={product.barcode}
              format="CODE128"
              width={2}
              height={80}
              fontSize={14}
              margin={0}
            />
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="card space-y-5">
        {/* Image upload */}
        <div>
          <label className="label">Produktbild</label>
          <div className="mt-2">
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Vorschau"
                  className="w-48 h-48 object-cover rounded-lg border border-gray-200"
                />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500">Bild hochladen</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            )}
          </div>
        </div>

        <div>
          <label className="label">Produktname *</label>
          <input
            className="input-field"
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Herstellername *</label>
            <input
              className="input-field"
              value={form.manufacturer}
              onChange={(e) => updateForm("manufacturer", e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Herstellungsdatum</label>
            <input
              type="date"
              className="input-field"
              value={form.manufactureDate}
              onChange={(e) => updateForm("manufactureDate", e.target.value)}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Masse</label>
            <input
              className="input-field"
              placeholder="z. B. 30 x 40 x 20 cm"
              value={form.dimensions}
              onChange={(e) => updateForm("dimensions", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Kategorie *</label>
            <select
              className="input-field"
              value={form.categoryId}
              onChange={(e) => updateForm("categoryId", e.target.value)}
              required
            >
              <option value="">Bitte wählen</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Mietpreis pro Tag (CHF)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              placeholder="0.00"
              value={form.rentalPricePerDay}
              onChange={(e) => updateForm("rentalPricePerDay", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Anzahl</label>
            <input
              type="number"
              min="1"
              step="1"
              className="input-field"
              value={form.quantity}
              onChange={(e) => updateForm("quantity", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) => updateForm("status", e.target.value)}
            >
              <option value="verfuegbar">Verfügbar</option>
              <option value="vermietet">Vermietet</option>
              <option value="reserviert">Reserviert</option>
              <option value="defekt">Defekt</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div>
            <label className="label">Kaufdatum</label>
            <input
              type="date"
              className="input-field"
              value={form.purchaseDate}
              onChange={(e) => updateForm("purchaseDate", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Neupreis (CHF)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              placeholder="0.00"
              value={form.purchasePrice}
              onChange={(e) => updateForm("purchasePrice", e.target.value)}
            />
          </div>
          <div>
            <label className="label">Gewicht (kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              placeholder="0.00"
              value={form.weight}
              onChange={(e) => updateForm("weight", e.target.value)}
            />
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Zustand</label>
            <select
              className="input-field"
              value={form.condition}
              onChange={(e) => updateForm("condition", e.target.value)}
            >
              <option value="">Bitte wählen</option>
              <option value="neu">Neu</option>
              <option value="gut">Gut</option>
              <option value="gebraucht">Gebraucht</option>
              <option value="defekt">Defekt</option>
            </select>
          </div>
          <div>
            <label className="label">Bedienungsanleitung (URL)</label>
            <div className="relative">
              <input
                type="url"
                className="input-field pr-10"
                placeholder="https://..."
                value={form.manualUrl}
                onChange={(e) => updateForm("manualUrl", e.target.value)}
              />
              {!form.manualUrl && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Nicht verfügbar
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <label className="label">Technische Daten</label>
          <textarea
            rows={4}
            className="input-field"
            placeholder="Leistung, Anschlüsse, Stromverbrauch, etc."
            value={form.technicalSpecs}
            onChange={(e) => updateForm("technicalSpecs", e.target.value)}
          />
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea
            rows={4}
            className="input-field"
            value={form.description}
            onChange={(e) => updateForm("description", e.target.value)}
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Änderungen speichern"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
