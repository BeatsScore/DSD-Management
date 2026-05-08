"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, Plus, X } from "lucide-react";
import { generateOrderNumber } from "@/lib/utils";

export default function NewOrderPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    customerId: "",
    assignedTo: "",
    startDate: "",
    endDate: "",
    notes: "",
  });

  const [selectedProducts, setSelectedProducts] = useState<
    { productId: string; quantity: number; pricePerDay: number }[]
  >([]);

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: p }, { data: s }] = await Promise.all([
        supabase.from("customers").select("*").order("name"),
        supabase.from("products").select("*").eq("status", "verfuegbar").order("name"),
        supabase.from("profiles").select("*").in("role", ["admin", "staff"]).order("full_name"),
      ]);
      setCustomers(c || []);
      setProducts(p || []);
      setStaff(s || []);
    }
    load();
  }, [supabase]);

  const addProduct = (productId: string) => {
    if (selectedProducts.find((sp) => sp.productId === productId)) return;
    setSelectedProducts([...selectedProducts, { productId, quantity: 1, pricePerDay: 0 }]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(selectedProducts.filter((sp) => sp.productId !== productId));
  };

  const updateProduct = (productId: string, field: string, value: number) => {
    setSelectedProducts(
      selectedProducts.map((sp) => (sp.productId === productId ? { ...sp, [field]: value } : sp))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customerId || !form.startDate || !form.endDate) {
      toast.error("Bitte fuellen Sie alle Pflichtfelder aus.");
      return;
    }
    if (new Date(form.startDate) > new Date(form.endDate)) {
      toast.error("Das Startdatum darf nicht nach dem Enddatum liegen.");
      return;
    }

    setLoading(true);
    const orderNumber = generateOrderNumber();

    // Calculate total amount from line items
    const days = Math.max(
      1,
      Math.ceil(
        (new Date(form.endDate).getTime() - new Date(form.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    );
    const totalAmount = selectedProducts.reduce(
      (sum, sp) => sum + (sp.pricePerDay || 0) * sp.quantity * days,
      0
    );

    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: form.customerId,
        assigned_to: form.assignedTo || null,
        start_date: form.startDate,
        end_date: form.endDate,
        status: "offen",
        notes: form.notes || null,
        total_amount: totalAmount > 0 ? totalAmount : null,
      })
      .select()
      .single();

    if (orderError || !order) {
      setLoading(false);
      toast.error("Fehler: " + (orderError?.message || "Unbekannter Fehler"));
      return;
    }

    if (selectedProducts.length > 0) {
      const items = selectedProducts.map((sp) => ({
        order_id: order.id,
        product_id: sp.productId,
        quantity: sp.quantity,
        price_per_day: sp.pricePerDay || null,
      }));
      const { error: itemsError } = await supabase.from("order_items").insert(items);
      if (itemsError) {
        // Best effort: try to clean up the empty order
        await supabase.from("orders").delete().eq("id", order.id);
        setLoading(false);
        toast.error("Fehler beim Hinzufuegen der Artikel: " + itemsError.message);
        return;
      }
    }

    setLoading(false);
    toast.success("Auftrag erstellt.");
    router.push("/auftraege/");
  };

  return (
    <div className="max-w-3xl">
      <Link href="/auftraege/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <h1 className="page-header mb-6">Auftrag erstellen</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card space-y-4">
          <h2 className="section-header">Kunde & Termin</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Kunde *</label>
              <select
                className="input-field"
                value={form.customerId}
                onChange={(e) => setForm({ ...form, customerId: e.target.value })}
                required
              >
                <option value="">Bitte wählen</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Zugewiesen an</label>
              <select
                className="input-field"
                value={form.assignedTo}
                onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              >
                <option value="">Nicht zugewiesen</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name || s.email}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Startdatum *</label>
              <input
                type="date"
                className="input-field"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Enddatum *</label>
              <input
                type="date"
                className="input-field"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="label">Notizen</label>
            <textarea
              rows={3}
              className="input-field"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
        </div>

        <div className="card space-y-4">
          <h2 className="section-header">Produkte</h2>
          <div>
            <label className="label">Produkt hinzufuegen</label>
            <select
              className="input-field"
              onChange={(e) => {
                if (e.target.value) {
                  addProduct(e.target.value);
                  e.target.value = "";
                }
              }}
            >
              <option value="">Bitte wählen</option>
              {products
                .filter((p) => !selectedProducts.find((sp) => sp.productId === p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.manufacturer})
                  </option>
                ))}
            </select>
          </div>

          {selectedProducts.length > 0 && (
            <div className="space-y-2">
              {selectedProducts.map((sp) => {
                const product = products.find((p) => p.id === sp.productId);
                return (
                  <div
                    key={sp.productId}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{product?.name}</div>
                      <div className="text-xs text-gray-500">{product?.manufacturer}</div>
                    </div>
                    <input
                      type="number"
                      min={1}
                      className="w-20 input-field py-1.5 text-sm"
                      value={sp.quantity}
                      onChange={(e) =>
                        updateProduct(sp.productId, "quantity", parseInt(e.target.value) || 1)
                      }
                    />
                    <input
                      type="number"
                      step="0.01"
                      className="w-28 input-field py-1.5 text-sm"
                      placeholder="CHF/Tag"
                      value={sp.pricePerDay || ""}
                      onChange={(e) =>
                        updateProduct(sp.productId, "pricePerDay", parseFloat(e.target.value) || 0)
                      }
                    />
                    <button
                      type="button"
                      onClick={() => removeProduct(sp.productId)}
                      className="p-1.5 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Auftrag speichern"}
        </button>
      </form>
    </div>
  );
}
