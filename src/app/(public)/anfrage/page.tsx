"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Loader2, Send, CheckCircle } from "lucide-react";

export default function RequestPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    eventDescription: "",
    startDate: "",
    endDate: "",
  });

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from("products")
        .select("id, name, manufacturer, status")
        .eq("status", "verfuegbar")
        .order("name");
      setProducts(data || []);
    }
    loadProducts();
  }, [supabase]);

  const toggleProduct = (id: string) => {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Bitte fuellen Sie alle Pflichtfelder aus.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("requests").insert({
      name: form.name,
      company: form.company || null,
      email: form.email,
      phone: form.phone || null,
      event_description: form.eventDescription || null,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      product_ids: selectedProducts.length > 0 ? selectedProducts : null,
      status: "offen",
    });
    setLoading(false);
    if (error) {
      toast.error("Fehler beim Senden: " + error.message);
      return;
    }
    setSubmitted(true);
    toast.success("Anfrage erfolgreich gesendet!");
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Anfrage gesendet</h1>
        <p className="text-gray-600">
          Vielen Dank für Ihre Anfrage. Wir werden uns innerhalb von 24 Stunden bei Ihnen melden.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="page-header mb-2">Anfrage stellen</h1>
      <p className="text-gray-600 mb-8">
        Wählen Sie Produkte aus und teilen Sie uns Ihre Wünsche mit.
      </p>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Product selection */}
        <div className="card">
          <h2 className="section-header mb-4">Produkte auswählen (optional)</h2>
          {products.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-3 max-h-64 overflow-auto">
              {products.map((p) => (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedProducts.includes(p.id)
                      ? "border-accent bg-accent/5"
                      : "border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="w-4 h-4 text-accent border-gray-300 rounded focus:ring-accent"
                    checked={selectedProducts.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.manufacturer}</div>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Keine verfuegbaren Produkte.</p>
          )}
        </div>

        {/* Contact form */}
        <div className="card space-y-4">
          <h2 className="section-header mb-4">Ihre Angaben</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Firma</label>
              <input
                className="input-field"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">E-Mail *</label>
              <input
                type="email"
                className="input-field"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input
                type="tel"
                className="input-field"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Startdatum</label>
              <input
                type="date"
                className="input-field"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Enddatum</label>
              <input
                type="date"
                className="input-field"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="label">Eventbeschreibung</label>
            <textarea
              rows={4}
              className="input-field"
              value={form.eventDescription}
              onChange={(e) =>
                setForm({ ...form, eventDescription: e.target.value })
              }
            />
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" /> Anfrage senden
            </>
          )}
        </button>
      </form>
    </div>
  );
}
