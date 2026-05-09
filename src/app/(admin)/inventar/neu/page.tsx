"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, Plus, ImageIcon, X, FileText } from "lucide-react";
import { generateBarcode, generateProductId, safeParseFloat, safeParseInt } from "@/lib/utils";

export default function NewProductPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [manualFile, setManualFile] = useState<File | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    manufacturer: "",
    manufactureDate: "",
    dimensions: "",
    description: "",
    categoryId: "",
    technicalSpecs: "",
    rentalPricePerDay: "",
    quantity: "1",
    manualUrl: "",
    purchaseDate: "",
    purchasePrice: "",
    weight: "",
    condition: "",
    ownerId: "",
  });

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: staffList }] = await Promise.all([
        supabase.from("product_categories").select("*").order("name"),
        supabase.from("profiles").select("*").in("role", ["admin", "staff"]).order("full_name"),
      ]);
      setCategories(cats || []);
      setStaff(staffList || []);
    }
    load();
  }, [supabase]);

  const handleCategoryChange = (value: string) => {
    if (value === "__new__") {
      setIsNewCategory(true);
      setForm({ ...form, categoryId: "" });
    } else {
      setIsNewCategory(false);
      setForm({ ...form, categoryId: value });
    }
  };

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

  const removeImage = (index: number) => {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => {
      const url = prev[index];
      if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const uploadImages = async (productId: string): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of imageFiles) {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${productId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
      const { error } = await supabase.storage
        .from("product-images")
        .upload(fileName, file);
      if (error) {
        toast.error("Fehler beim Bild-Upload: " + error.message);
        continue;
      }
      const { data: { publicUrl } } = supabase.storage.from("product-images").getPublicUrl(fileName);
      urls.push(publicUrl);
    }
    return urls;
  };

  const uploadManual = async (productId: string): Promise<string | null> => {
    if (!manualFile) return null;
    const ext = manualFile.name.split(".").pop() || "pdf";
    const fileName = `manual-${productId}-${Date.now()}.${ext}`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let categoryId = form.categoryId;

    if (isNewCategory) {
      if (!newCategoryName.trim()) {
        toast.error("Bitte geben Sie einen Kategorienamen ein.");
        return;
      }
      setLoading(true);
      const { data: newCat, error: catError } = await supabase
        .from("product_categories")
        .insert({ name: newCategoryName.trim() })
        .select()
        .single();

      if (catError || !newCat) {
        setLoading(false);
        toast.error(
          "Fehler beim Erstellen der Kategorie: " +
            (catError?.message || "Unbekannter Fehler")
        );
        return;
      }
      categoryId = newCat.id;
    } else {
      if (!form.categoryId) {
        toast.error("Bitte wählen Sie eine Kategorie aus.");
        return;
      }
    }

    if (!form.name) {
      toast.error("Bitte geben Sie einen Produktnamen ein.");
      return;
    }

    setLoading(true);

    // Use timestamp to avoid race conditions with count-based IDs
    const categoryPrefix = isNewCategory
      ? newCategoryName.substring(0, 3)
      : categories.find((c) => c.id === categoryId)?.name?.substring(0, 3) ||
        "PROD";
    const productIdStr = generateProductId(categoryPrefix, Date.now() % 100000);
    const barcode = generateBarcode();

    const { data: inserted, error } = await supabase
      .from("products")
      .insert({
        product_id: productIdStr,
        name: form.name,
        manufacturer: form.manufacturer,
        manufacture_date: form.manufactureDate || null,
        dimensions: form.dimensions || null,
        description: form.description || null,
        category_id: categoryId,
        status: "verfuegbar",
        barcode,
        technical_specs: form.technicalSpecs || null,
        rental_price_per_day: safeParseFloat(form.rentalPricePerDay),
        quantity: safeParseInt(form.quantity, 1),
        manual_url: form.manualUrl || null,
        purchase_date: form.purchaseDate || null,
        purchase_price: safeParseFloat(form.purchasePrice),
        weight: safeParseFloat(form.weight),
        condition: form.condition || null,
        owner_id: form.ownerId || null,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      toast.error("Fehler: " + error.message);
      return;
    }

    // Upload images if present
    let updateData: any = {};
    if (imageFiles.length > 0 && inserted) {
      const imageUrls = await uploadImages(inserted.id);
      if (imageUrls.length > 0) updateData.image_urls = imageUrls;
    }
    // Upload manual PDF if present
    if (manualFile && inserted) {
      const manualUrl = await uploadManual(inserted.id);
      if (manualUrl) updateData.manual_url = manualUrl;
    }
    if (Object.keys(updateData).length > 0 && inserted) {
      await supabase.from("products").update(updateData).eq("id", inserted.id);
    }

    setLoading(false);
    toast.success("Artikel erfolgreich erstellt.");
    router.push("/inventar/");
  };

  return (
    <div className="max-w-3xl">
      <Link
        href="/inventar/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <h1 className="page-header mb-6">Artikel erstellen</h1>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Image upload */}
        <div>
          <label className="label">Produktbilder</label>
          <div className="mt-2 flex flex-wrap gap-3">
            {imagePreviews.map((preview, index) => (
              <div key={index} className="relative inline-block">
                <img
                  src={preview}
                  alt={`Vorschau ${index + 1}`}
                  className="w-32 h-32 object-cover rounded-lg border border-gray-200"
                  loading="lazy"
                  decoding="async"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
            <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
              <Plus className="w-6 h-6 text-gray-400 mb-1" />
              <span className="text-xs text-gray-500">Hinzufügen</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>
        </div>

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
            <label className="label">Herstellername</label>
            <input
              className="input-field"
              value={form.manufacturer}
              onChange={(e) =>
                setForm({ ...form, manufacturer: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Herstellungsdatum</label>
            <input
              type="date"
              className="input-field"
              value={form.manufactureDate}
              onChange={(e) =>
                setForm({ ...form, manufactureDate: e.target.value })
              }
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
              onChange={(e) =>
                setForm({ ...form, dimensions: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Kategorie *</label>
            <select
              className="input-field"
              value={isNewCategory ? "__new__" : form.categoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              required
            >
              <option value="">Bitte wählen</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
              <option value="__new__">+ Neue Kategorie</option>
            </select>

            {isNewCategory && (
              <div className="mt-3">
                <label className="label">Neue Kategorie Name *</label>
                <div className="flex gap-2">
                  <input
                    className="input-field"
                    placeholder="z. B. Moving Heads"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            )}
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
              onChange={(e) =>
                setForm({ ...form, rentalPricePerDay: e.target.value })
              }
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
              onChange={(e) =>
                setForm({ ...form, quantity: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Zustand</label>
            <select
              className="input-field"
              value={form.condition}
              onChange={(e) =>
                setForm({ ...form, condition: e.target.value })
              }
            >
              <option value="">Bitte wählen</option>
              <option value="neu">Neu</option>
              <option value="gut">Gut</option>
              <option value="gebraucht">Gebraucht</option>
              <option value="defekt">Defekt</option>
            </select>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Besitzer</label>
            <select
              className="input-field"
              value={form.ownerId}
              onChange={(e) =>
                setForm({ ...form, ownerId: e.target.value })
              }
            >
              <option value="">Bitte wählen</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name || s.email}
                </option>
              ))}
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
              onChange={(e) =>
                setForm({ ...form, purchaseDate: e.target.value })
              }
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
              onChange={(e) =>
                setForm({ ...form, purchasePrice: e.target.value })
              }
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
              onChange={(e) =>
                setForm({ ...form, weight: e.target.value })
              }
            />
          </div>
        </div>

        <div>
          <label className="label">Bedienungsanleitung</label>
          <div className="space-y-3">
            {/* URL input */}
            <div className="relative">
              <input
                type="url"
                className="input-field pr-28"
                placeholder="https://..."
                value={form.manualUrl}
                onChange={(e) =>
                  setForm({ ...form, manualUrl: e.target.value })
                }
              />
              {!form.manualUrl && !manualFile && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                  Nicht verfügbar
                </span>
              )}
            </div>

            {/* PDF Upload */}
            {manualFile ? (
              <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <FileText className="w-5 h-5 text-gray-400" />
                <span className="text-sm truncate flex-1">{manualFile.name}</span>
                <button
                  type="button"
                  onClick={() => setManualFile(null)}
                  className="p-1 text-gray-400 hover:text-red-600"
                >
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
          </div>
        </div>

        <div>
          <label className="label">Technische Daten</label>
          <textarea
            rows={4}
            className="input-field"
            placeholder="Leistung, Anschlüsse, Stromverbrauch, etc."
            value={form.technicalSpecs}
            onChange={(e) =>
              setForm({ ...form, technicalSpecs: e.target.value })
            }
          />
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea
            rows={4}
            className="input-field"
            value={form.description}
            onChange={(e) =>
              setForm({ ...form, description: e.target.value })
            }
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Artikel speichern"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
