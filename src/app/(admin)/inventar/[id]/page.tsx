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
  Wrench,
  Calendar,
  User,
  Banknote,
  Check,
} from "lucide-react";
import Barcode from "react-barcode";
import { formatDate, getStatusColor, getStatusLabel, formatCurrency, safeParseFloat, safeParseInt } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"details" | "maintenance">("details");

  // Maintenance form state
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintDate, setMaintDate] = useState("");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [maintNext, setMaintNext] = useState("");
  const [maintStaff, setMaintStaff] = useState("");
  const [savingMaint, setSavingMaint] = useState(false);

  const [form, setForm] = useState<any>({});

  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: cats }, { data: staffList }, { data: logs }] = await Promise.all([
        supabase.from("products").select("*, category:category_id(*)").eq("id", id).single(),
        supabase.from("product_categories").select("*").order("name"),
        supabase.from("profiles").select("*").in("role", ["admin", "staff"]).order("full_name"),
        supabase.from("maintenance_logs").select("*, performed_by_profile:performed_by(full_name)").eq("product_id", id).order("maintenance_date", { ascending: false }),
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
          ownerId: p.owner_id || "",
        });
        if (p.image_url) {
          setImagePreview(p.image_url);
        }
      }
      setCategories(cats || []);
      setStaff(staffList || []);
      setMaintenanceLogs(logs || []);
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
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    const url = URL.createObjectURL(file);
    setImageFile(file);
    setImagePreview(url);
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return imagePreview;
    const ext = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(fileName, imageFile, { upsert: true });
    if (error) {
      toast.error("Fehler beim Bild-Upload: " + error.message);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
    return publicUrl;
  };

  const removeImage = () => {
    if (imagePreview?.startsWith("blob:")) {
      URL.revokeObjectURL(imagePreview);
    }
    setImageFile(null);
    setImagePreview(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    let imageUrl = imagePreview;
    if (imageUrl?.startsWith("blob:")) {
      imageUrl = product?.image_url || null;
    }
    if (imageFile) {
      const uploaded = await uploadImage();
      if (uploaded) imageUrl = uploaded;
    } else if (!imagePreview && product?.image_url) {
      imageUrl = null;
    }

    const { error } = await supabase.from("products").update({
      name: form.name,
      manufacturer: form.manufacturer,
      manufacture_date: form.manufactureDate || null,
      dimensions: form.dimensions || null,
      description: form.description || null,
      category_id: form.categoryId || null,
      status: form.status,
      image_url: imageUrl,
      technical_specs: form.technicalSpecs || null,
      rental_price_per_day: safeParseFloat(form.rentalPricePerDay),
      quantity: safeParseInt(form.quantity, 1),
      manual_url: form.manualUrl || null,
      purchase_date: form.purchaseDate || null,
      purchase_price: safeParseFloat(form.purchasePrice),
      weight: safeParseFloat(form.weight),
      condition: form.condition || null,
      owner_id: form.ownerId || null,
    }).eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Artikel aktualisiert.");
    setImageFile(null);
  };

  const handleDelete = async () => {
    if (!(await confirm("Artikel löschen?", "Dieser Artikel wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.", { confirmLabel: "Löschen", cancelLabel: "Abbrechen", variant: "danger" }))) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Artikel gelöscht.");
    router.push("/inventar/");
  };

  const deleteMaintenanceLog = async (logId: string) => {
    if (!(await confirm("Eintrag löschen?", "Dieser Wartungseintrag wird entfernt.", { confirmLabel: "Löschen", cancelLabel: "Abbrechen", variant: "danger" }))) return;
    const { error } = await supabase.from("maintenance_logs").delete().eq("id", logId);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    setMaintenanceLogs((prev) => prev.filter((l) => l.id !== logId));
    toast.success("Eintrag entfernt.");
  };

  const saveMaintenance = async () => {
    if (!maintDate || !maintDesc.trim()) {
      toast.error("Bitte Datum und Beschreibung eingeben.");
      return;
    }
    setSavingMaint(true);
    const { error } = await supabase.from("maintenance_logs").insert({
      product_id: id,
      maintenance_date: maintDate,
      description: maintDesc.trim(),
      cost: safeParseFloat(maintCost),
      next_service_date: maintNext || null,
      performed_by: maintStaff || null,
    });
    setSavingMaint(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Wartungseintrag gespeichert.");
    setShowMaintForm(false);
    setMaintDate("");
    setMaintDesc("");
    setMaintCost("");
    setMaintNext("");
    setMaintStaff("");
    // Refresh logs
    const { data: logs } = await supabase.from("maintenance_logs").select("*, performed_by_profile:performed_by(full_name)").eq("product_id", id).order("maintenance_date", { ascending: false });
    setMaintenanceLogs(logs || []);
  };

  const printBarcode = () => {
    const svgEl = document.getElementById("barcode-svg");
    if (!svgEl || !product) return;
    const svgHtml = svgEl.outerHTML;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Barcode</title></head>
      <body style="display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-family:sans-serif;">
        <div style="text-align:center;">
          <div style="font-size:12px;margin-bottom:8px;font-weight:600;">${product.product_id}</div>
          <div>${svgHtml}</div>
          <div style="font-size:14px;margin-top:8px;">${product.name}</div>
        </div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const updateForm = useCallback((key: string, value: any) => {
    setForm((prev: any) => ({ ...prev, [key]: value }));
  }, []);

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
      <Link href="/inventar/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
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

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("details")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === "details" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Details
        </button>
        <button
          onClick={() => setActiveTab("maintenance")}
          className={`flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors ${activeTab === "maintenance" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Wartungshistorie
        </button>
      </div>

      {activeTab === "details" ? (
        <>
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
                <Barcode value={product.barcode} format="CODE128" width={2} height={80} fontSize={14} margin={0} />
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="card space-y-5">
            <div>
              <label className="label">Produktbild</label>
              <div className="mt-2">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Vorschau" className="w-48 h-48 object-cover rounded-lg border border-gray-200" loading="lazy" decoding="async" />
                    <button type="button" onClick={removeImage} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                    <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Bild hochladen</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                  </label>
                )}
              </div>
            </div>

            <div>
              <label className="label">Produktname *</label>
              <input className="input-field" value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Herstellername</label><input className="input-field" value={form.manufacturer} onChange={(e) => updateForm("manufacturer", e.target.value)} /></div>
              <div><label className="label">Herstellungsdatum</label><input type="date" className="input-field" value={form.manufactureDate} onChange={(e) => updateForm("manufactureDate", e.target.value)} /></div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Masse</label><input className="input-field" placeholder="z. B. 30 x 40 x 20 cm" value={form.dimensions} onChange={(e) => updateForm("dimensions", e.target.value)} /></div>
              <div>
                <label className="label">Kategorie *</label>
                <select className="input-field" value={form.categoryId} onChange={(e) => updateForm("categoryId", e.target.value)} required>
                  <option value="">Bitte wählen</option>
                  {categories.map((cat) => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="label">Mietpreis pro Tag (CHF)</label><input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.rentalPricePerDay} onChange={(e) => updateForm("rentalPricePerDay", e.target.value)} /></div>
              <div><label className="label">Anzahl</label><input type="number" min="1" step="1" className="input-field" value={form.quantity} onChange={(e) => updateForm("quantity", e.target.value)} /></div>
              <div>
                <label className="label">Status</label>
                <select className="input-field" value={form.status} onChange={(e) => updateForm("status", e.target.value)}>
                  <option value="verfuegbar">Verfügbar</option>
                  <option value="vermietet">Vermietet</option>
                  <option value="reserviert">Reserviert</option>
                  <option value="defekt">Defekt</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="label">Kaufdatum</label><input type="date" className="input-field" value={form.purchaseDate} onChange={(e) => updateForm("purchaseDate", e.target.value)} /></div>
              <div><label className="label">Neupreis (CHF)</label><input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.purchasePrice} onChange={(e) => updateForm("purchasePrice", e.target.value)} /></div>
              <div><label className="label">Gewicht (kg)</label><input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.weight} onChange={(e) => updateForm("weight", e.target.value)} /></div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Zustand</label>
                <select className="input-field" value={form.condition} onChange={(e) => updateForm("condition", e.target.value)}>
                  <option value="">Bitte wählen</option>
                  <option value="neu">Neu</option>
                  <option value="gut">Gut</option>
                  <option value="gebraucht">Gebraucht</option>
                  <option value="defekt">Defekt</option>
                </select>
              </div>
              <div>
                <label className="label">Besitzer</label>
                <select className="input-field" value={form.ownerId} onChange={(e) => updateForm("ownerId", e.target.value)}>
                  <option value="">Bitte wählen</option>
                  {staff.map((s) => (<option key={s.id} value={s.id}>{s.full_name || s.email}</option>))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Bedienungsanleitung (URL)</label>
              <div className="relative">
                <input type="url" className="input-field pr-10" placeholder="https://..." value={form.manualUrl} onChange={(e) => updateForm("manualUrl", e.target.value)} />
                {!form.manualUrl && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Nicht verfügbar</span>}
              </div>
            </div>

            <div><label className="label">Technische Daten</label><textarea rows={4} className="input-field" placeholder="Leistung, Anschlüsse, Stromverbrauch, etc." value={form.technicalSpecs} onChange={(e) => updateForm("technicalSpecs", e.target.value)} /></div>
            <div><label className="label">Beschreibung</label><textarea rows={4} className="input-field" value={form.description} onChange={(e) => updateForm("description", e.target.value)} /></div>

            <div className="pt-2">
              <button type="submit" disabled={saving} className="btn-primary w-full">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Änderungen speichern"}
              </button>
            </div>
          </form>
        </>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="section-header">Wartungshistorie</h2>
            <button onClick={() => setShowMaintForm(!showMaintForm)} className="btn-secondary text-sm py-2 px-3">
              <Wrench className="w-4 h-4 mr-1" /> {showMaintForm ? "Abbrechen" : "Neuer Eintrag"}
            </button>
          </div>

          {showMaintForm && (
            <div className="card space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Wartungsdatum *</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="date" value={maintDate} onChange={(e) => setMaintDate(e.target.value)} className="input-field pl-9 w-full" />
                  </div>
                </div>
                <div>
                  <label className="label">Nächster Service</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="date" value={maintNext} onChange={(e) => setMaintNext(e.target.value)} className="input-field pl-9 w-full" />
                  </div>
                </div>
              </div>
              <div>
                <label className="label">Beschreibung *</label>
                <textarea rows={3} value={maintDesc} onChange={(e) => setMaintDesc(e.target.value)} placeholder="Was wurde gemacht?" className="input-field w-full" />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">Kosten (CHF)</label>
                  <div className="relative">
                    <Banknote className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input type="number" step="0.01" min="0" value={maintCost} onChange={(e) => setMaintCost(e.target.value)} className="input-field pl-9 w-full" />
                  </div>
                </div>
                <div>
                  <label className="label">Durchgeführt von</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select value={maintStaff} onChange={(e) => setMaintStaff(e.target.value)} className="input-field pl-9 w-full">
                      <option value="">Bitte wählen</option>
                      {staff.map((s) => (<option key={s.id} value={s.id}>{s.full_name || s.email}</option>))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowMaintForm(false)} className="flex-1 btn-secondary py-2.5">Abbrechen</button>
                <button onClick={saveMaintenance} disabled={savingMaint} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
                  {savingMaint ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Speichern
                </button>
              </div>
            </div>
          )}

          {maintenanceLogs.length > 0 ? (
            <div className="space-y-3">
              {maintenanceLogs.map((log) => (
                <div key={log.id} className="card flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="font-medium">{formatDate(log.maintenance_date)}</span>
                      {log.next_service_date && (
                        <span className="text-xs text-gray-500">(Nächster: {formatDate(log.next_service_date)})</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700">{log.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      {log.cost != null && <span>Kosten: {formatCurrency(log.cost)}</span>}
                      {log.performed_by_profile && <span>Durch: {log.performed_by_profile.full_name}</span>}
                    </div>
                  </div>
                  <button onClick={() => deleteMaintenanceLog(log.id)} className="p-2 text-gray-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 bg-gray-50 rounded-xl">
              <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">Keine Wartungseinträge vorhanden.</p>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        open={state.open}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}
