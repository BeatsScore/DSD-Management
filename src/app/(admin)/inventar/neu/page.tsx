"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, Plus } from "lucide-react";
import { generateBarcode, generateProductId } from "@/lib/utils";

export default function NewProductPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    manufacturer: "",
    manufactureDate: "",
    dimensions: "",
    description: "",
    categoryId: "",
  });

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase
        .from("product_categories")
        .select("*")
        .order("name");
      setCategories(data || []);
    }
    loadCategories();
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
        toast.error("Fehler beim Erstellen der Kategorie: " + (catError?.message || "Unbekannter Fehler"));
        return;
      }
      categoryId = newCat.id;
    } else {
      if (!form.categoryId) {
        toast.error("Bitte wählen Sie eine Kategorie aus.");
        return;
      }
    }

    if (!form.name || !form.manufacturer) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    setLoading(true);

    const { count } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });

    const categoryPrefix =
      isNewCategory
        ? newCategoryName.substring(0, 3)
        : categories.find((c) => c.id === categoryId)?.name?.substring(0, 3) ||
          "PROD";
    const productId = generateProductId(categoryPrefix, (count || 0) + 1);
    const barcode = generateBarcode();

    const { error } = await supabase.from("products").insert({
      product_id: productId,
      name: form.name,
      manufacturer: form.manufacturer,
      manufacture_date: form.manufactureDate || null,
      dimensions: form.dimensions || null,
      description: form.description || null,
      category_id: categoryId,
      status: "verfuegbar",
      barcode,
    });

    setLoading(false);

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }

    toast.success("Artikel erfolgreich erstellt.");
    router.push("/inventar/");
  };

  return (
    <div className="max-w-2xl">
      <Link
        href="/inventar/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <h1 className="page-header mb-6">Artikel erstellen</h1>

      <form onSubmit={handleSubmit} className="card space-y-5">
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
              onChange={(e) =>
                setForm({ ...form, manufacturer: e.target.value })
              }
              required
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
              onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
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
          <button type="submit" disabled={loading} className="btn-primary w-full">
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
