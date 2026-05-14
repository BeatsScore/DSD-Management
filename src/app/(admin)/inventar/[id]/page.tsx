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
  Wrench,
  Calendar,
  User,
  Banknote,
  Check,
  Plus,
} from "lucide-react";
import Barcode from "react-barcode";
import { formatDate, formatCurrency, safeParseFloat, safeParseInt, generateBarcode, generateSerialNumber, sortCategoriesHierarchical } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { ManualQrCode } from "@/components/ManualQrCode";

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [product, setProduct] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [productOwners, setProductOwners] = useState<any[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [existingImageUrls, setExistingImageUrls] = useState<string[]>([]);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"catalog" | "internal" | "barcode" | "maintenance">("catalog");
  const [labelFormat, setLabelFormat] = useState<"62mm" | "29mm">("62mm");
  const [isNewManufacturer, setIsNewManufacturer] = useState(false);
  const [newManufacturerName, setNewManufacturerName] = useState("");

  // Maintenance form state
  const [showMaintForm, setShowMaintForm] = useState(false);
  const [maintDate, setMaintDate] = useState("");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [maintNext, setMaintNext] = useState("");
  const [maintStaff, setMaintStaff] = useState("");
  const [savingMaint, setSavingMaint] = useState(false);

  const [form, setForm] = useState<any>({});
  const [owners, setOwners] = useState<{ ownerId: string; quantity: string }[]>([]);
  const [productItems, setProductItems] = useState<{ id?: string; serial_number: string; barcode: string; status: string; notes: string }[]>([]);

  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: cats }, { data: staffList }, { data: logs }, { data: mfrs }, { data: po }, { data: items }] = await Promise.all([
        supabase.from("products").select("*, category:category_id(*)").eq("id", id).single(),
        supabase.from("product_categories").select("*").order("name"),
        supabase.from("profiles").select("*").in("role", ["admin", "staff"]).order("full_name"),
        supabase.from("maintenance_logs").select("*, performed_by_profile:performed_by(full_name)").eq("product_id", id).order("maintenance_date", { ascending: false }),
        supabase.from("manufacturers").select("*").order("name"),
        supabase.from("product_owners").select("*, owner:owner_id(full_name, email)").eq("product_id", id),
        supabase.from("product_items").select("*").eq("product_id", id).order("created_at"),
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
          rentalPricePerDay: p.rental_price_per_day != null ? String(p.rental_price_per_day) : "",
          quantity: p.quantity != null ? String(p.quantity) : "1",
          manualUrl: p.manual_url || "",
          purchaseDate: p.purchase_date || "",
          purchasePrice: p.purchase_price != null ? String(p.purchase_price) : "",
          weight: p.weight != null ? String(p.weight) : "",
          condition: p.condition || "",
        });
        if (p.image_urls && p.image_urls.length > 0) {
          setExistingImageUrls(p.image_urls);
        }
      }
      if (po && po.length > 0) {
        setOwners(po.map((o: any) => ({ ownerId: o.owner_id, quantity: String(o.quantity) })));
        setProductOwners(po);
      }
      if (items && items.length > 0) {
        setProductItems(items.map((it: any) => ({ id: it.id, serial_number: it.serial_number || "", barcode: it.barcode, status: it.status, notes: it.notes || "" })));
      }
      setCategories(cats || []);
      setStaff(staffList || []);
      setManufacturers(mfrs || []);
      setMaintenanceLogs(logs || []);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`"${file.name}" ist kein Bild.`);
        return false;
      }
      if (file.size > 8 * 1024 * 1024) {
        toast.error(`"${file.name}" ist grösser als 8 MB.`);
        return false;
      }
      return true;
    });
    if (validFiles.length === 0) return;

    const newPreviews = validFiles.map((file) => URL.createObjectURL(file));
    setImageFiles((prev) => [...prev, ...validFiles]);
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const uploadNewImages = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${id}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(fileName, file);
      if (error) {
        toast.error("Fehler beim Bild-Upload: " + error.message);
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
      urls.push(publicUrl);
    }
    return urls;
  };

  const uploadManual = async (): Promise<string | null> => {
    if (!manualFile) return null;
    const ext = manualFile.name.split(".").pop() || "pdf";
    const fileName = `manual-${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-manuals")
      .upload(fileName, manualFile, { contentType: manualFile.type });
    if (error) {
      toast.error("Fehler beim Upload der Bedienungsanleitung: " + error.message);
      return null;
    }
    const { data: { publicUrl } } = supabase.storage.from("product-manuals").getPublicUrl(fileName);
    return publicUrl;
  };

  const removeExistingImage = (index: number) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const url = prev[index];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalOwnerQty = owners.reduce((sum, o) => sum + safeParseInt(o.quantity, 0), 0);
    const productQty = safeParseInt(form.quantity, 1);
    if (totalOwnerQty > productQty) {
      toast.error(`Die Summe der Besitzer-Anteile (${totalOwnerQty}) darf nicht grösser als die Gesamtanzahl (${productQty}) sein.`);
      return;
    }

    setSaving(true);

    const newUrls = imageFiles.length > 0 ? await uploadNewImages() : [];
    const allUrls = [...existingImageUrls, ...newUrls];

    let manualUrl = form.manualUrl || null;
    if (manualFile) {
      const uploaded = await uploadManual();
      if (uploaded) manualUrl = uploaded;
    }

    // Handle new manufacturer
    let manufacturerName = form.manufacturer;
    if (isNewManufacturer) {
      if (!newManufacturerName.trim()) {
        setSaving(false);
        toast.error("Bitte geben Sie einen Herstellernamen ein.");
        return;
      }
      const { data: newMfr, error: mfrError } = await supabase
        .from("manufacturers")
        .insert({ name: newManufacturerName.trim() })
        .select()
        .single();
      if (mfrError) {
        setSaving(false);
        toast.error("Fehler beim Erstellen des Herstellers: " + mfrError.message);
        return;
      }
      manufacturerName = newManufacturerName.trim();
      setManufacturers((prev) => [...prev, newMfr].sort((a, b) => a.name.localeCompare(b.name)));
      setIsNewManufacturer(false);
      setNewManufacturerName("");
    }

    const { error } = await supabase.from("products").update({
      name: form.name,
      manufacturer: manufacturerName,
      manufacture_date: form.manufactureDate || null,
      dimensions: form.dimensions || null,
      description: form.description || null,
      category_id: form.categoryId || null,
      status: form.status,
      image_urls: allUrls.length > 0 ? allUrls : null,
      technical_specs: form.technicalSpecs || null,
      rental_price_per_day: safeParseFloat(form.rentalPricePerDay),
      quantity: productQty,
      manual_url: manualUrl,
      purchase_date: form.purchaseDate || null,
      purchase_price: safeParseFloat(form.purchasePrice),
      weight: safeParseFloat(form.weight),
      condition: form.condition || null,
    }).eq("id", id);

    if (error) {
      setSaving(false);
      toast.error("Fehler: " + error.message);
      return;
    }

    // Update product owners: delete existing, insert new
    const validOwners = owners.filter((o) => o.ownerId && safeParseInt(o.quantity, 0) > 0);
    await supabase.from("product_owners").delete().eq("product_id", id);
    if (validOwners.length > 0) {
      const ownerRows = validOwners.map((o) => ({
        product_id: id,
        owner_id: o.ownerId,
        quantity: safeParseInt(o.quantity, 1),
      }));
      await supabase.from("product_owners").insert(ownerRows);
    }

    // Sync product items with quantity
    const currentQty = productItems.length;
    if (productQty > currentQty) {
      const newItems = [];
      for (let i = currentQty; i < productQty; i++) {
        newItems.push({
          product_id: id,
          serial_number: "",
          barcode: generateBarcode(),
          status: "verfuegbar",
          notes: "",
        });
      }
      const { data: inserted, error: insertError } = await supabase.from("product_items").insert(newItems).select();
      if (insertError) {
        toast.error("Fehler beim Erstellen der Produkt-Items: " + insertError.message);
      } else if (inserted) {
        setProductItems((prev) => [...prev, ...inserted.map((it: any) => ({ id: it.id, serial_number: it.serial_number || "", barcode: it.barcode, status: it.status, notes: it.notes || "" }))]);
      }
    } else if (productQty < currentQty) {
      const toDelete = productItems.slice(productQty);
      for (const item of toDelete) {
        if (item.id) {
          await supabase.from("product_items").delete().eq("id", item.id);
        }
      }
      setProductItems((prev) => prev.slice(0, productQty));
    } else {
      for (const item of productItems) {
        if (item.id) {
          await supabase.from("product_items").update({
            serial_number: item.serial_number,
            notes: item.notes,
            status: item.status,
          }).eq("id", item.id);
        }
      }
    }

    setSaving(false);
    toast.success("Artikel aktualisiert.");
    setExistingImageUrls(allUrls);
    setImageFiles([]);
    setImagePreviews([]);
    setManualFile(null);
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

  const getLabelStyles = (format: "62mm" | "29mm") => {
    if (format === "29mm") {
      return {
        pageSize: "90mm 29mm",
        bodyWidth: "90mm",
        bodyHeight: "29mm",
        bodyPadding: "1.5mm 2mm",
        logoHeight: "27mm",
        serialFont: "9px",
        idFont: "9px",
        nameFont: "10px",
        svgMaxWidth: "100%",
        svgHeight: "100%",
      };
    }
    return {
      pageSize: "62mm auto",
      bodyWidth: "62mm",
      bodyHeight: "auto",
      bodyPadding: "3mm",
      logoHeight: "10mm",
      serialFont: "9px",
      idFont: "9px",
      nameFont: "11px",
      svgMaxWidth: "100%",
      svgHeight: "auto",
    };
  };

  const printBarcode = () => {
    const svgEl = document.getElementById("barcode-svg");
    if (!svgEl || !product) return;
    const svgHtml = svgEl.outerHTML;
    const s = getLabelStyles(labelFormat);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode</title>
          <style>
            @page { margin: 0; size: ${s.pageSize}; }
            html, body {
              margin: 0;
              padding: 0;
              width: ${s.bodyWidth};
              height: ${s.bodyHeight};
              overflow: hidden;
              box-sizing: border-box;
              font-family: sans-serif;
            }
            .label {
              display: flex;
              flex-direction: column;
              height: 100%;
              padding: ${s.bodyPadding};
              box-sizing: border-box;
            }
            .top {
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: 2mm;
              height: 50%;
            }
            .text-col {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              justify-content: center;
              gap: 0.5mm;
            }
            .logo {
              height: ${s.logoHeight};
              width: auto;
              object-fit: contain;
            }
            .serial {
              font-size: ${s.serialFont};
              font-weight: 600;
              color: #333;
              line-height: 1.1;
            }
            .product-name {
              font-size: ${s.nameFont};
              color: #333;
              word-break: break-word;
              line-height: 1.1;
            }
            .barcode-wrap {
              height: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
            }
            .barcode-text {
              font-size: 7px;
              color: #333;
              margin-bottom: 0.5mm;
            }
            .barcode-inner {
              width: 100%;
              display: flex;
              justify-content: center;
            }
            .barcode-inner svg {
              width: 100% !important;
              height: auto !important;
              max-width: 100%;
            }
            svg {
              max-width: 100%;
              max-height: 100%;
              width: 100%;
              height: auto;
            }
            svg text {
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="top">
              <img src="${window.location.origin}/logo.png" class="logo" alt="" />
              <div class="text-col">
                <div class="serial">${product.product_id}</div>
                <div class="product-name">${product.name}</div>
              </div>
            </div>
            <div class="barcode-wrap">
              <div class="barcode-text">${product.barcode}</div>
              <div class="barcode-inner">${svgHtml}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const printItemBarcode = (item: any) => {
    const svgEl = document.getElementById(`barcode-svg-${item.id}`);
    if (!svgEl || !product) return;
    const svgHtml = svgEl.outerHTML;
    const s = getLabelStyles(labelFormat);
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Barcode</title>
          <style>
            @page { margin: 0; size: ${s.pageSize}; }
            html, body {
              margin: 0;
              padding: 0;
              width: ${s.bodyWidth};
              height: ${s.bodyHeight};
              overflow: hidden;
              box-sizing: border-box;
              font-family: sans-serif;
            }
            .label {
              display: flex;
              flex-direction: column;
              height: 100%;
              padding: ${s.bodyPadding};
              box-sizing: border-box;
            }
            .top {
              display: flex;
              flex-direction: row;
              align-items: center;
              gap: 2mm;
              height: 50%;
            }
            .text-col {
              display: flex;
              flex-direction: column;
              align-items: flex-start;
              justify-content: center;
              gap: 0.5mm;
            }
            .logo {
              height: ${s.logoHeight};
              width: auto;
              object-fit: contain;
            }
            .serial {
              font-size: ${s.serialFont};
              font-weight: 600;
              color: #333;
              line-height: 1.1;
            }
            .product-name {
              font-size: ${s.nameFont};
              color: #333;
              word-break: break-word;
              line-height: 1.1;
            }
            .barcode-wrap {
              height: 50%;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              width: 100%;
            }
            .barcode-text {
              font-size: 7px;
              color: #333;
              margin-bottom: 0.5mm;
            }
            .barcode-inner {
              width: 100%;
              display: flex;
              justify-content: center;
            }
            .barcode-inner svg {
              width: 100% !important;
              height: auto !important;
              max-width: 100%;
            }
            svg {
              max-width: 100%;
              max-height: 100%;
              width: 100%;
              height: auto;
            }
            svg text {
              display: none;
            }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="top">
              <img src="${window.location.origin}/logo.png" class="logo" alt="" />
              <div class="text-col">
                <div class="serial">${item.serial_number || product.product_id}</div>
                <div class="product-name">${product.name}</div>
              </div>
            </div>
            <div class="barcode-wrap">
              <div class="barcode-text">${item.barcode}</div>
              <div class="barcode-inner">${svgHtml}</div>
            </div>
          </div>
        </body>
      </html>
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
        <button onClick={handleDelete} className="text-red-600 hover:text-red-700 p-2">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab("catalog")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === "catalog" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Katalog
        </button>
        <button
          onClick={() => setActiveTab("internal")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === "internal" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Intern
        </button>
        <button
          onClick={() => setActiveTab("barcode")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === "barcode" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Barcode
        </button>
        <button
          onClick={() => setActiveTab("maintenance")}
          className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors ${activeTab === "maintenance" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
        >
          Wartung
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {activeTab === "catalog" && (
          <div className="card space-y-5">
            <div>
              <label className="label">Produktbilder</label>
              <div className="mt-2 flex flex-wrap gap-3">
                {existingImageUrls.map((url, index) => (
                  <div key={`existing-${index}`} className="relative inline-block">
                    <img src={url} alt={`Bild ${index + 1}`} className="w-32 h-32 object-cover rounded-lg border border-gray-200" loading="lazy" decoding="async" />
                    <button type="button" onClick={() => removeExistingImage(index)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {imagePreviews.map((preview, index) => (
                  <div key={`new-${index}`} className="relative inline-block">
                    <img src={preview} alt={`Neu ${index + 1}`} className="w-32 h-32 object-cover rounded-lg border border-gray-200" loading="lazy" decoding="async" />
                    <button type="button" onClick={() => removeNewImage(index)} className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Hinzufügen</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                </label>
              </div>
            </div>

            <div>
              <label className="label">Produktname *</label>
              <input className="input-field" value={form.name} onChange={(e) => updateForm("name", e.target.value)} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Herstellername</label>
                <select
                  className="input-field"
                  value={isNewManufacturer ? "__new__" : form.manufacturer}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === "__new__") {
                      setIsNewManufacturer(true);
                      updateForm("manufacturer", "");
                    } else {
                      setIsNewManufacturer(false);
                      updateForm("manufacturer", value);
                    }
                  }}
                >
                  <option value="">Bitte wählen</option>
                  {manufacturers.map((m) => (
                    <option key={m.id} value={m.name}>{m.name}</option>
                  ))}
                  <option value="__new__">+ Neuer Hersteller</option>
                </select>
                {isNewManufacturer && (
                  <div className="mt-3">
                    <label className="label">Neuer Hersteller Name *</label>
                    <input
                      className="input-field"
                      placeholder="z. B. Pioneer"
                      value={newManufacturerName}
                      onChange={(e) => setNewManufacturerName(e.target.value)}
                      autoFocus
                    />
                  </div>
                )}
              </div>
              <div><label className="label">Herstellungsdatum</label><input type="date" className="input-field" value={form.manufactureDate} onChange={(e) => updateForm("manufactureDate", e.target.value)} /></div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div><label className="label">Masse</label><input className="input-field" placeholder="z. B. 30 x 40 x 20 cm" value={form.dimensions} onChange={(e) => updateForm("dimensions", e.target.value)} /></div>
              <div><label className="label">Gewicht (kg)</label><input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.weight} onChange={(e) => updateForm("weight", e.target.value)} /></div>
            </div>

            <div>
              <label className="label">Bedienungsanleitung</label>
              <div className="space-y-3">
                <div className="relative">
                  <input type="url" className="input-field pr-10" placeholder="https://..." value={form.manualUrl} onChange={(e) => updateForm("manualUrl", e.target.value)} />
                  {!form.manualUrl && !manualFile && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">Nicht verfügbar</span>}
                </div>

                {manualFile ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                    <FileText className="w-5 h-5 text-gray-400" />
                    <span className="text-sm truncate flex-1">{manualFile.name}</span>
                    <button type="button" onClick={() => setManualFile(null)} className="p-1 text-gray-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                    <FileText className="w-6 h-6 text-gray-400 mb-1" />
                    <span className="text-xs text-gray-500">PDF hochladen</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.type !== "application/pdf") {
                          toast.error("Bitte eine PDF-Datei hochladen.");
                          return;
                        }
                        if (file.size > 20 * 1024 * 1024) {
                          toast.error("PDF darf maximal 20 MB gross sein.");
                          return;
                        }
                        setManualFile(file);
                      }}
                    />
                  </label>
                )}

                {form.manualUrl && (
                  <div className="pt-2">
                    <ManualQrCode url={form.manualUrl} productName={form.name || product.name} size={96} />
                  </div>
                )}
              </div>
            </div>

            <div><label className="label">Technische Daten</label><textarea rows={4} className="input-field" placeholder="Leistung, Anschlüsse, Stromverbrauch, etc." value={form.technicalSpecs} onChange={(e) => updateForm("technicalSpecs", e.target.value)} /></div>
            <div><label className="label">Beschreibung</label><textarea rows={4} className="input-field" value={form.description} onChange={(e) => updateForm("description", e.target.value)} /></div>
          </div>
        )}

        {activeTab === "internal" && (
          <div className="card space-y-5">
            <div className="grid sm:grid-cols-3 gap-4">
              <div><label className="label">Mietpreis pro Tag (CHF)</label><input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.rentalPricePerDay} onChange={(e) => updateForm("rentalPricePerDay", e.target.value)} /></div>
              <div><label className="label">Neupreis (CHF)</label><input type="number" step="0.01" min="0" className="input-field" placeholder="0.00" value={form.purchasePrice} onChange={(e) => updateForm("purchasePrice", e.target.value)} /></div>
              <div><label className="label">Kaufdatum</label><input type="date" className="input-field" value={form.purchaseDate} onChange={(e) => updateForm("purchaseDate", e.target.value)} /></div>
            </div>

            <div className="grid sm:grid-cols-3 gap-4">
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
                <label className="label">Status</label>
                <select className="input-field" value={form.status} onChange={(e) => updateForm("status", e.target.value)}>
                  <option value="verfuegbar">Verfügbar</option>
                  <option value="vermietet">Vermietet</option>
                  <option value="reserviert">Reserviert</option>
                  <option value="defekt">Defekt</option>
                </select>
              </div>
              <div>
                <label className="label">Sichtbarkeit</label>
                <select className="input-field" value={form.status === "inaktiv" ? "false" : "true"} onChange={(e) => updateForm("status", e.target.value === "true" ? "verfuegbar" : "inaktiv")}>
                  <option value="true">Online (im Katalog sichtbar)</option>
                  <option value="false">Offline (nicht im Katalog)</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Anzahl</label>
                <input type="number" min="1" step="1" className="input-field" value={form.quantity} onChange={(e) => updateForm("quantity", e.target.value)} />
              </div>
              <div>
                <label className="label">Kategorie *</label>
                <select className="input-field" value={form.categoryId} onChange={(e) => updateForm("categoryId", e.target.value)} required>
                  <option value="">Bitte wählen</option>
                  {sortCategoriesHierarchical(categories).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.level === 1 ? "\u00A0\u00A0\u2014 " : ""}{cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="label">Besitzer</label>
              <div className="space-y-2">
                {owners.map((o, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <select
                      className="input-field flex-1"
                      value={o.ownerId}
                      onChange={(e) => {
                        const newOwners = [...owners];
                        newOwners[idx].ownerId = e.target.value;
                        setOwners(newOwners);
                      }}
                    >
                      <option value="">Bitte wählen</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      className="input-field w-24"
                      placeholder="Anzahl"
                      value={o.quantity}
                      onChange={(e) => {
                        const newOwners = [...owners];
                        newOwners[idx].quantity = e.target.value;
                        setOwners(newOwners);
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setOwners((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setOwners((prev) => [...prev, { ownerId: "", quantity: "1" }])}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-black bg-gray-100 hover:bg-gray-200 rounded-md px-3 py-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Besitzer hinzufügen
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === "barcode" && (
          <div className="card space-y-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="label text-xs mb-1">Etikettenformat</label>
                <select
                  className="input-field text-sm py-1.5"
                  value={labelFormat}
                  onChange={(e) => setLabelFormat(e.target.value as "62mm" | "29mm")}
                >
                  <option value="62mm">62mm Endlos (62 x variabel)</option>
                  <option value="29mm">29mm Standard (29 x 90mm)</option>
                </select>
              </div>
              <button onClick={printBarcode} className="btn-secondary py-2 px-4 text-sm">
                <Printer className="w-4 h-4 mr-2 inline" /> Haupt-Barcode drucken
              </button>
            </div>
            <div className="flex justify-center py-2 bg-gray-50 rounded-lg">
              <div id="barcode-svg">
                <Barcode value={product.barcode} format="CODE128" width={2} height={80} fontSize={14} margin={0} />
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Produkt-Items ({productItems.length})</h3>
              <div className="space-y-4">
                {productItems.map((item, index) => (
                  <div key={item.id || index} className="border border-gray-200 rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">Item #{index + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${item.status === "verfuegbar" ? "bg-green-100 text-green-700" : item.status === "vermietet" ? "bg-blue-100 text-blue-700" : item.status === "defekt" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="label text-xs">Seriennummer</label>
                        <div className="flex gap-2">
                          <input
                            className="input-field text-sm"
                            value={item.serial_number}
                            onChange={(e) => {
                              const newItems = [...productItems];
                              newItems[index].serial_number = e.target.value;
                              setProductItems(newItems);
                            }}
                            placeholder="Seriennummer"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newItems = [...productItems];
                              newItems[index].serial_number = generateSerialNumber(product.product_id, index + 1);
                              setProductItems(newItems);
                            }}
                            className="btn-secondary text-xs px-2 py-1 whitespace-nowrap"
                            title="Seriennummer generieren"
                          >
                            Generieren
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="label text-xs">Notizen</label>
                        <input
                          className="input-field text-sm"
                          value={item.notes}
                          onChange={(e) => {
                            const newItems = [...productItems];
                            newItems[index].notes = e.target.value;
                            setProductItems(newItems);
                          }}
                          placeholder="Notizen"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-1">Barcode</div>
                        <div className="font-mono text-sm">{item.barcode}</div>
                      </div>
                      <div id={`barcode-svg-${item.id}`}>
                        <Barcode value={item.barcode} format="CODE128" width={1.5} height={60} fontSize={12} margin={0} />
                      </div>
                      <button
                        type="button"
                        onClick={() => printItemBarcode(item)}
                        className="btn-secondary py-2 px-3 text-sm"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                {productItems.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <p className="text-gray-500 text-sm">Keine Produkt-Items vorhanden. Speichern Sie das Produkt, um Items basierend auf der Anzahl zu generieren.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "maintenance" && (
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

        {(activeTab === "catalog" || activeTab === "internal") && (
          <div className="pt-2">
            <button type="submit" disabled={saving} className="btn-primary w-full">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Änderungen speichern"}
            </button>
          </div>
        )}
      </form>

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
