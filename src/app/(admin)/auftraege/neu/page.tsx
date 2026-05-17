"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft, Plus, X, UserPlus, Search } from "lucide-react";
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
    dayRates: 1,
    discountType: "" as "prozentual" | "absolut" | "",
    discountAmount: "",
    discountReason: "",
  });

  const [selectedProducts, setSelectedProducts] = useState<
    { productId: string; quantity: number; pricePerDay: number }[]
  >([]);
  const [productSearch, setProductSearch] = useState("");

  // New customer modal state
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [savingCustomer, setSavingCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

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
    if (form.dayRates < 1) {
      toast.error("Tagessätze müssen mindestens 1 betragen.");
      return;
    }

    setLoading(true);
    const orderNumber = generateOrderNumber();

    // Calculate totals
    const subtotal = selectedProducts.reduce(
      (sum, sp) => sum + (sp.pricePerDay || 0) * sp.quantity * form.dayRates,
      0
    );
    const discountAmount = parseFloat(form.discountAmount) || 0;
    const discount = form.discountType === "prozentual"
      ? subtotal * (discountAmount / 100)
      : discountAmount;
    const netAfterDiscount = Math.max(0, subtotal - discount);
    const totalAmount = netAfterDiscount;

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
        discount_type: form.discountType || null,
        discount_amount: discountAmount > 0 ? discountAmount : null,
        discount_reason: form.discountReason || null,
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

  const openCustomerModal = () => {
    setNewCustomerForm({ name: "", company: "", email: "", phone: "", address: "", notes: "" });
    setShowCustomerModal(true);
  };

  const closeCustomerModal = () => {
    setShowCustomerModal(false);
  };

  const saveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.name || !newCustomerForm.email) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }
    setSavingCustomer(true);
    const { data, error } = await supabase
      .from("customers")
      .insert({
        name: newCustomerForm.name,
        company: newCustomerForm.company || null,
        email: newCustomerForm.email,
        phone: newCustomerForm.phone || null,
        address: newCustomerForm.address || null,
        notes: newCustomerForm.notes || null,
      })
      .select()
      .single();

    setSavingCustomer(false);

    if (error || !data) {
      toast.error("Fehler: " + (error?.message || "Unbekannter Fehler"));
      return;
    }

    toast.success("Kunde erstellt.");
    setCustomers((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
    setForm((prev) => ({ ...prev, customerId: data.id }));
    closeCustomerModal();
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
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === "__new__") {
                    openCustomerModal();
                    // Reset select back to empty so the option can be selected again
                    setForm((prev) => ({ ...prev, customerId: "" }));
                  } else {
                    setForm((prev) => ({ ...prev, customerId: value }));
                  }
                }}
                required
              >
                <option value="">Bitte wählen</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value="__new__" className="font-semibold text-blue-600">
                  + Neuer Kunde...
                </option>
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
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Tagessätze *</label>
              <input
                type="number"
                min={1}
                className="input-field"
                value={form.dayRates}
                onChange={(e) => setForm({ ...form, dayRates: parseInt(e.target.value) || 1 })}
                required
              />
            </div>
          </div>

          {/* Discount */}
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Rabatt-Typ</label>
              <select
                className="input-field"
                value={form.discountType}
                onChange={(e) => setForm({ ...form, discountType: e.target.value as "prozentual" | "absolut" | "" })}
              >
                <option value="">Kein Rabatt</option>
                <option value="prozentual">Prozentual (%)</option>
                <option value="absolut">Fixer Betrag (CHF)</option>
              </select>
            </div>
            <div>
              <label className="label">Rabatt</label>
              <input
                type="number"
                min={0}
                step={form.discountType === "prozentual" ? 1 : 0.01}
                className="input-field"
                value={form.discountAmount}
                onChange={(e) => setForm({ ...form, discountAmount: e.target.value })}
                disabled={!form.discountType}
                placeholder={form.discountType === "prozentual" ? "%" : "CHF"}
              />
            </div>
            <div>
              <label className="label">Rabatt-Grund</label>
              <input
                type="text"
                className="input-field"
                value={form.discountReason}
                onChange={(e) => setForm({ ...form, discountReason: e.target.value })}
                disabled={!form.discountType}
                placeholder="z.B. Stammkunde"
              />
            </div>
          </div>

          {/* Live preview */}
          {selectedProducts.length > 0 && (
            <div className="card bg-gray-50 border-gray-200">
              {(() => {
                const subtotal = selectedProducts.reduce((sum, sp) => sum + (sp.pricePerDay || 0) * sp.quantity * form.dayRates, 0);
                const discountAmount = parseFloat(form.discountAmount) || 0;
                const discount = form.discountType === "prozentual" ? subtotal * (discountAmount / 100) : discountAmount;
                const netAfterDiscount = Math.max(0, subtotal - discount);
                const total = netAfterDiscount;
                const deposit = subtotal * 0.25;
                return (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Zwischensumme</span>
                      <span>{subtotal.toFixed(2)} CHF</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between text-red-600">
                        <span>Rabatt{form.discountReason ? ` (${form.discountReason})` : ""}</span>
                        <span>-{discount.toFixed(2)} CHF</span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-base border-t border-gray-300 pt-1 mt-1">
                      <span>Gesamtbetrag</span>
                      <span>{total.toFixed(2)} CHF</span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 pt-1">
                      <span>Kaution (25% Netto)</span>
                      <span>{deposit.toFixed(2)} CHF</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
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
            <div className="relative mb-2">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Produkte suchen..."
                className="input-field pl-9 w-full"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
            </div>
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
                .filter((p) => {
                  if (selectedProducts.find((sp) => sp.productId === p.id)) return false;
                  if (!productSearch.trim()) return true;
                  const term = productSearch.toLowerCase();
                  return (
                    p.name?.toLowerCase().includes(term) ||
                    p.manufacturer?.toLowerCase().includes(term) ||
                    p.product_id?.toLowerCase().includes(term)
                  );
                })
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

      {/* New Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                Neuer Kunde
              </h3>
              <button onClick={closeCustomerModal} className="p-2 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={saveNewCustomer} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    className="input-field w-full"
                    value={newCustomerForm.name}
                    onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Firma</label>
                  <input
                    className="input-field w-full"
                    value={newCustomerForm.company}
                    onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, company: e.target.value }))}
                  />
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail *</label>
                  <input
                    type="email"
                    className="input-field w-full"
                    value={newCustomerForm.email}
                    onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    className="input-field w-full"
                    value={newCustomerForm.phone}
                    onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                <textarea
                  rows={2}
                  className="input-field w-full"
                  value={newCustomerForm.address}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interne Notizen</label>
                <textarea
                  rows={2}
                  className="input-field w-full"
                  value={newCustomerForm.notes}
                  onChange={(e) => setNewCustomerForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={closeCustomerModal}
                  className="flex-1 btn-secondary py-2.5"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={savingCustomer}
                  className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2"
                >
                  {savingCustomer ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Kunde speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
