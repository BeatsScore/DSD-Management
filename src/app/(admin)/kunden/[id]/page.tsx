"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Trash2, ClipboardList } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from("customers").select("*").eq("id", id).single(),
        supabase.from("orders").select("*").eq("customer_id", id).order("created_at", { ascending: false }),
      ]);
      if (c) {
        setCustomer(c);
        setForm({
          name: c.name,
          company: c.company || "",
          email: c.email,
          phone: c.phone || "",
          address: c.address || "",
          notes: c.notes || "",
        });
      }
      setOrders(o || []);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("customers")
      .update({
        name: form.name,
        company: form.company || null,
        email: form.email,
        phone: form.phone || null,
        address: form.address || null,
        notes: form.notes || null,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Kunde aktualisiert.");
  };

  const handleDelete = async () => {
    if (!confirm("Kunde wirklich löschen?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Kunde geloescht.");
    router.push("/kunden/");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Kunde nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/kunden/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">Kunde bearbeiten</h1>
        <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSave} className="card space-y-5 mb-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name *</label>
            <input className="input-field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div>
            <label className="label">Firma</label>
            <input className="input-field" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">E-Mail *</label>
            <input type="email" className="input-field" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input type="tel" className="input-field" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
        </div>
        <div>
          <label className="label">Adresse</label>
          <textarea rows={2} className="input-field" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
        </div>
        <div>
          <label className="label">Interne Notizen</label>
          <textarea rows={3} className="input-field" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button type="submit" disabled={saving} className="btn-primary w-full">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Änderungen speichern"}
        </button>
      </form>

      <div className="card">
        <h2 className="section-header mb-4">Auftragshistorie</h2>
        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link key={order.id} href={`/auftraege/${order.id}/`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div>
                  <div className="text-sm font-medium">{order.order_number}</div>
                  <div className="text-xs text-gray-500">{formatDate(order.start_date)} - {formatDate(order.end_date)}</div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">{order.status}</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">Keine Auftraege vorhanden.</p>
          </div>
        )}
      </div>
    </div>
  );
}
