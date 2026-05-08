"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  X,
  ImageIcon,
  Search,
  Check,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import { safeParseFloat } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface SelectedProduct {
  id: string;
  name: string;
  product_id: string;
  quantity: number;
  isExisting: boolean;
}

export default function EditSetPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [active, setActive] = useState(true);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selected, setSelected] = useState<SelectedProduct[]>([]);

  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const [{ data: setData }, { data: productData }] = await Promise.all([
        supabase
          .from("product_sets")
          .select("*, items:set_items(*, product:product_id(id, name, product_id))")
          .eq("id", id)
          .single(),
        supabase.from("products").select("id, name, product_id").order("name", { ascending: true }),
      ]);

      setProducts(productData || []);

      if (setData) {
        setName(setData.name);
        setDescription(setData.description || "");
        setPrice(setData.rental_price_per_day ? String(setData.rental_price_per_day) : "");
        setActive(setData.active);
        setImagePreview(setData.image_url);
        setSelected(
          (setData.items || []).map((item: any) => ({
            id: item.product_id,
            name: item.product?.name || "",
            product_id: item.product?.product_id || "",
            quantity: item.quantity,
            isExisting: true,
            dbId: item.id,
          }))
        );
      }
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

  const toggleProduct = (product: any) => {
    setSelected((prev) => {
      const exists = prev.find((p) => p.id === product.id);
      if (exists) return prev.filter((p) => p.id !== product.id);
      return [...prev, { id: product.id, name: product.name, product_id: product.product_id, quantity: 1, isExisting: false }];
    });
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty < 1) qty = 1;
    setSelected((prev) =>
      prev.map((p) => (p.id === id ? { ...p, quantity: qty } : p))
    );
  };

  const uploadImage = async (setId: string): Promise<string | null> => {
    if (!imageFile) return null;
    const ext = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${setId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("set-images")
      .upload(fileName, imageFile);
    if (error) {
      toast.error("Fehler beim Bild-Upload: " + error.message);
      return null;
    }
    const { data } = supabase.storage.from("set-images").getPublicUrl(fileName);
    return data.publicUrl;
  };

  const handleDelete = async () => {
    if (!(await confirm("Set löschen?", "Dieses Set wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.", { confirmLabel: "Löschen", cancelLabel: "Abbrechen", variant: "danger" }))) return;
    const { error } = await supabase.from("product_sets").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Set gelöscht.");
    router.push("/inventar/sets/");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Bitte geben Sie einen Namen ein.");
      return;
    }
    if (selected.length === 0) {
      toast.error("Bitte wählen Sie mindestens einen Artikel aus.");
      return;
    }

    setSaving(true);

    let imageUrl = imagePreview;
    if (imageFile) {
      const uploaded = await uploadImage(id);
      if (uploaded) imageUrl = uploaded;
    }

    const { error } = await supabase
      .from("product_sets")
      .update({
        name: name.trim(),
        description: description.trim() || null,
        rental_price_per_day: safeParseFloat(price),
        image_url: imageUrl,
        active,
      })
      .eq("id", id);

    if (error) {
      setSaving(false);
      toast.error("Fehler: " + error.message);
      return;
    }

    // Delete existing items and recreate
    await supabase.from("set_items").delete().eq("set_id", id);
    const items = selected.map((p) => ({
      set_id: id,
      product_id: p.id,
      quantity: p.quantity,
    }));
    const { error: itemsError } = await supabase.from("set_items").insert(items);

    setSaving(false);

    if (itemsError) {
      toast.error("Fehler beim Aktualisieren der Artikel: " + itemsError.message);
      return;
    }

    toast.success("Set erfolgreich aktualisiert.");
    router.push("/inventar/sets/");
  };

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.product_id.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link
        href="/inventar/sets/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Set bearbeiten</h1>
        <button
          onClick={handleDelete}
          className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50"
          title="Löschen"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Image */}
        <div>
          <label className="label">Set-Bild</label>
          <div className="mt-2">
            {imagePreview ? (
              <div className="relative inline-block">
                <img
                  src={imagePreview}
                  alt="Vorschau"
                  className="w-48 h-48 object-cover rounded-lg border border-gray-200"
                  loading="lazy"
                  decoding="async"
                />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
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
          <label className="label">Name *</label>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Mietpreis pro Tag (CHF)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-field"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <div className="flex items-center">
            <label className="flex items-center gap-2 cursor-pointer mt-6">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
              />
              <span className="text-sm text-gray-700">Aktiv</span>
            </label>
          </div>
        </div>

        <div>
          <label className="label">Beschreibung</label>
          <textarea
            rows={3}
            className="input-field"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Product selection */}
        <div className="border-t border-gray-100 pt-5">
          <label className="label mb-3">Artikel im Set *</label>

          {/* Selected items */}
          {selected.length > 0 && (
            <div className="mb-4 space-y-2">
              <div className="text-xs text-gray-500">
                {selected.length} Artikel ausgewählt
              </div>
              {selected.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-2 bg-blue-50 border border-blue-100 rounded-lg"
                >
                  <span className="flex-1 text-sm">{p.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">Anzahl:</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-sm"
                      value={p.quantity}
                      onChange={(e) =>
                        updateQuantity(p.id, parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleProduct({ id: p.id })}
                    className="p-1 text-gray-400 hover:text-red-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search products */}
          <div className="flex items-center gap-3 mb-3">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Artikel suchen..."
              className="flex-1 text-sm outline-none bg-transparent"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Product list */}
          <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((product) => {
                const isSelected = selected.some((p) => p.id === product.id);
                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => toggleProduct(product)}
                    className={`flex items-center gap-3 w-full px-4 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-blue-600 border-blue-600"
                          : "border-gray-300"
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <span className="text-sm">{product.name}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {product.product_id}
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                Keine Artikel gefunden.
              </div>
            )}
          </div>
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
