"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { Loader2, ArrowLeft } from "lucide-react";

export default function NewCustomerPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("customers").insert({
      name: form.name,
      company: form.company || null,
      email: form.email,
      phone: form.phone || null,
      address: form.address || null,
      notes: form.notes || null,
    });
    setLoading(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Kunde erstellt.");
    router.push("/kunden/");
  };

  return (
    <div className="max-w-2xl">
      <Link href="/kunden/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>
      <h1 className="page-header mb-6">Kunde erstellen</h1>
      <form onSubmit={handleSubmit} className="card space-y-5">
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
        <button type="submit" disabled={loading} className="btn-primary w-full">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kunde speichern"}
        </button>
      </form>
    </div>
  );
}
