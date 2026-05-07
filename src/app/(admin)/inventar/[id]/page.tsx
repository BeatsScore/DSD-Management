"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Trash2, Printer } from "lucide-react";
import Barcode from "react-barcode";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: cats }] = await Promise.all([
        supabase.from("products").select("*, category:category_id(*)").eq("id", id).single(),
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
          categoryId: p.category_id,
          status: p.status,
        });
      }
      setCategories(cats || []);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: form.name,
        manufacturer: form.manufacturer,
        manufacture_date: form.manufactureDate || null,
        dimensions: form.dimensions || null,
        description: form.description || null,
        category_id: form.categoryId,
        status: form.status,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Artikel aktualisiert.");
  };

  const handleDelete = async () => {
    if (!confirm("Artikel wirklich löschen?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Artikel geloescht.");
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
    <div className="max-w-2xl">
      <Link
        href="/inventar/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Artikel bearbeiten</h1>
        <div className="flex items-center gap-2">
          <button onClick={printBarcode} className="btn-secondary text-sm py-2 px-3">
            <Printer className="w-4 h-4 mr-1" /> Barcode
          </button>
          <button onClick={handleDelete} className="text-red-600 hover:text-red-700 p-2">
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
        <div>
          <label className="label">Produktname *</label>
          <input
            className="input-field"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Herstellername *</label>
            <input
              className="input-field"
              value={form.manufacturer}
              onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
              required
            />
          </div>
          <div>
            <label className="label">Herstellungsdatum</label>
            <input
              type="date"
              className="input-field"
              value={form.manufactureDate}
              onChange={(e) => setForm({ ...form, manufactureDate: e.target.value })}
            />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Masse</label>
            <input
              className="input-field"
              value={form.dimensions}
              onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Kategorie *</label>
            <select
              className="input-field"
              value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Status</label>
            <select
              className="input-field"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="verfuegbar">Verfuegbar</option>
              <option value="vermietet">Vermietet</option>
              <option value="reserviert">Reserviert</option>
              <option value="defekt">Defekt</option>
            </select>
          </div>
        </div>
        <div>
          <label className="label">Beschreibung</label>
          <textarea
            rows={4}
            className="input-field"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="pt-2">
          <button type="submit" disabled={saving} className="btn-primary w-full">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Änderungen speichern"}
          </button>
        </div>
      </form>
    </div>
  );
}
