"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, Plus, ImageIcon, X } from "lucide-react";
import { generateBarcode, generateProductId } from "@/lib/utils";

export default function NewProductPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
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

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (productId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${productId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("product-images")
      .upload(fileName, imageFile);
    if (error) {
      toast.error("Fehler beim Bild-Upload: " + error.message);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("product-images").getPublicUrl(fileName);
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

    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    const categoryPrefix = isNewCategory
      ? newCategoryName.substring(0, 3)
      : categories.find((c) => c.id === categoryId)?.name?.substring(0, 3) ||
        "PROD";
    const productIdStr = generateProductId(categoryPrefix, (count || 0) + 1);
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
        owner_id: form.ownerId || null,
      })
      .select()
      .single();

    if (error) {
      setLoading(false);
      toast.error("Fehler: " + error.message);
      return;
    }

    // Upload image if present
    if (imageFile && inserted) {
      const imageUrl = await uploadImage(inserted.id);
      if (imageUrl) {
        await supabase
          .from("products")
          .update({ image_url: imageUrl })
          .eq("id", inserted.id);
      }
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
          <label className="label">Bedienungsanleitung (URL)</label>
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
            {!form.manualUrl && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                Nicht verfügbar
              </span>
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
