"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Trash2, FileText, Truck, CheckCircle } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { generateDocument } from "@/lib/documents";

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: i }] = await Promise.all([
        supabase.from("orders").select("*, customer:customer_id(*), assigned:assigned_to(full_name, email)").eq("id", id).single(),
        supabase.from("order_items").select("*, product:product_id(*)").eq("order_id", id),
      ]);
      setOrder(o);
      setItems(i || []);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  const updateStatus = async (status: string) => {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Status aktualisiert.");
    setOrder({ ...order, status });
  };

  const handleDelete = async () => {
    if (!confirm("Auftrag wirklich loeschen?")) return;
    await supabase.from("order_items").delete().eq("order_id", id);
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Auftrag geloescht.");
    router.push("/auftraege/");
  };

  const generatePDF = (type: string) => {
    generateDocument(type, order, items, window);
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Auftrag nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/auftraege/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">{order.order_number}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Erstellt am {formatDate(order.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {getStatusLabel(order.status)}
          </span>
          <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600">
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card grid sm:grid-cols-2 gap-6">
          <div>
            <div className="text-xs text-gray-500 mb-1">Kunde</div>
            <div className="font-medium">{order.customer?.name || "-"}</div>
            {order.customer?.company && <div className="text-sm text-gray-600">{order.customer.company}</div>}
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Zugewiesen an</div>
            <div className="font-medium">{order.assigned?.full_name || order.assigned?.email || "Nicht zugewiesen"}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Zeitraum</div>
            <div className="font-medium">{formatDate(order.start_date)} - {formatDate(order.end_date)}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 mb-1">Gesamtbetrag</div>
            <div className="font-medium">{formatCurrency(order.total_amount)}</div>
          </div>
        </div>

        {order.notes && (
          <div className="card">
            <div className="text-xs text-gray-500 mb-1">Notizen</div>
            <div className="text-sm text-gray-700 whitespace-pre-line">{order.notes}</div>
          </div>
        )}

        <div className="card">
          <h2 className="section-header mb-4">Artikel</h2>
          {items.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left text-gray-500">
                    <th className="pb-3 font-medium">Produkt</th>
                    <th className="pb-3 font-medium">Hersteller</th>
                    <th className="pb-3 font-medium text-center">Menge</th>
                    <th className="pb-3 font-medium text-right">Preis/Tag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 font-medium">{item.product?.name}</td>
                      <td className="py-3 text-gray-600">{item.product?.manufacturer}</td>
                      <td className="py-3 text-center">{item.quantity}</td>
                      <td className="py-3 text-right">{formatCurrency(item.price_per_day)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Keine Artikel zugewiesen.</p>
          )}
        </div>

        <div className="card">
          <h2 className="section-header mb-4">Aktionen</h2>
          <div className="flex flex-wrap gap-3">
            {order.status === "offen" && (
              <button onClick={() => updateStatus("verhandlungsphase")} className="btn-primary text-sm py-2 px-4">
                <CheckCircle className="w-4 h-4 mr-1" /> Zu Verhandlungsphase
              </button>
            )}
            {order.status === "verhandlungsphase" && (
              <button onClick={() => updateStatus("vertragsphase")} className="btn-primary text-sm py-2 px-4">
                <CheckCircle className="w-4 h-4 mr-1" /> Zu Vertragsphase
              </button>
            )}
            {order.status === "vertragsphase" && (
              <button onClick={() => updateStatus("bestaetigt")} className="btn-primary text-sm py-2 px-4">
                <CheckCircle className="w-4 h-4 mr-1" /> Bestätigen
              </button>
            )}
            {order.status === "bestaetigt" && (
              <button onClick={() => updateStatus("abgeholt")} className="btn-primary text-sm py-2 px-4">
                <Truck className="w-4 h-4 mr-1" /> Als abgeholt markieren
              </button>
            )}
            {order.status === "abgeholt" && (
              <button onClick={() => updateStatus("zurueckgebracht")} className="btn-primary text-sm py-2 px-4">
                <CheckCircle className="w-4 h-4 mr-1" /> Als zurückgebracht markieren
              </button>
            )}
            {order.status === "zurueckgebracht" && (
              <button onClick={() => updateStatus("abgeschlossen")} className="btn-primary text-sm py-2 px-4">
                <CheckCircle className="w-4 h-4 mr-1" /> Abschliessen
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="section-header mb-4">Dokumente</h2>
          <div className="flex flex-wrap gap-3">
            {["angebot", "rechnung", "mietvertrag", "auftragsbestaetigung", "ablehnung"].map((type) => (
              <button key={type} onClick={() => generatePDF(type)} className="btn-secondary text-sm py-2 px-4">
                <FileText className="w-4 h-4 mr-1" /> {type === "angebot" ? "Angebot" : type === "rechnung" ? "Rechnung" : type === "mietvertrag" ? "Mietvertrag" : type === "auftragsbestaetigung" ? "Auftragsbestaetigung" : "Ablehnung"}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
