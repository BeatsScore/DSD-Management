"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Trash2, FileText, Truck, CheckCircle, Printer, Clock, Calendar, PackageOpen, RotateCcw, X, User } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";
import { generateDocument } from "@/lib/documents";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type PlanType = "pickup" | "return" | null;

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  // Planning modal state
  const [planType, setPlanType] = useState<PlanType>(null);
  const [planStaffId, setPlanStaffId] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: i }, { data: d }, { data: p }] = await Promise.all([
        supabase.from("orders").select("*, customer:customer_id(*), assigned:assigned_to(full_name, email), pickup_staff:pickup_staff_id(full_name, email), return_staff:return_staff_id(full_name, email)").eq("id", id).single(),
        supabase.from("order_items").select("*, product:product_id(*)").eq("order_id", id),
        supabase.from("documents").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email").in("role", ["admin", "staff"]).order("full_name", { ascending: true }),
      ]);
      setOrder(o);
      setItems(i || []);
      setDocuments(d || []);
      setProfiles(p || []);
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
    if (!(await confirm("Auftrag löschen?", "Dieser Auftrag wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.", { confirmLabel: "Löschen", cancelLabel: "Abbrechen", variant: "danger" }))) return;
    await supabase.from("order_items").delete().eq("order_id", id);
    const { error } = await supabase.from("orders").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Auftrag geloescht.");
    router.push("/auftraege/");
  };

  const generatePDF = async (type: string) => {
    const success = generateDocument(type, order, items, window);
    if (!success) {
      toast.error("Popup wurde blockiert. Bitte erlauben Sie Popups für diese Seite.");
      return;
    }

    // Save document record to DB
    const fileName = `${type}_${order.order_number}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const { error } = await supabase.from("documents").insert({
      order_id: id,
      type,
      file_name: fileName,
    });

    if (!error) {
      // Refresh documents list
      const { data: d } = await supabase
        .from("documents")
        .select("*")
        .eq("order_id", id)
        .order("created_at", { ascending: false });
      setDocuments(d || []);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!(await confirm("Dokument entfernen?", "Dieses Dokument wird aus der Historie entfernt.", { confirmLabel: "Entfernen", cancelLabel: "Abbrechen", variant: "danger" }))) return;
    const { error } = await supabase.from("documents").delete().eq("id", docId);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
    toast.success("Dokument entfernt.");
  };

  const openPlanModal = (type: "pickup" | "return") => {
    setPlanType(type);
    if (type === "pickup") {
      setPlanStaffId(order.pickup_staff_id || "");
      setPlanDate(order.pickup_date || "");
      setPlanTime(order.pickup_time || "");
    } else {
      setPlanStaffId(order.return_staff_id || "");
      setPlanDate(order.return_date || "");
      setPlanTime(order.return_time || "");
    }
  };

  const closePlanModal = () => {
    setPlanType(null);
    setPlanStaffId("");
    setPlanDate("");
    setPlanTime("");
  };

  const savePlan = async () => {
    setSavingPlan(true);
    const payload = planType === "pickup"
      ? { pickup_date: planDate || null, pickup_time: planTime || null, pickup_staff_id: planStaffId || null }
      : { return_date: planDate || null, return_time: planTime || null, return_staff_id: planStaffId || null };

    const { data, error } = await supabase.from("orders").update(payload).eq("id", id).select("*, customer:customer_id(*), assigned:assigned_to(full_name, email), pickup_staff:pickup_staff_id(full_name, email), return_staff:return_staff_id(full_name, email)").single();

    setSavingPlan(false);

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }

    toast.success(planType === "pickup" ? "Abholung gespeichert." : "Rückgabe gespeichert.");
    setOrder(data);
    closePlanModal();
  };

  const docTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      angebot: "Angebot",
      rechnung: "Rechnung",
      mietvertrag: "Mietvertrag",
      auftragsbestaetigung: "Auftragsbestaetigung",
      ablehnung: "Ablehnung",
    };
    return map[type] || type;
  };

  const planModalTitle = planType === "pickup" ? "Abholung planen" : planType === "return" ? "Rückgabe planen" : "";

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
            {order.customer?.phone && <div className="text-sm text-gray-500">{order.customer.phone}</div>}
            {order.customer?.email && <div className="text-sm text-gray-500">{order.customer.email}</div>}
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

          {/* Pickup info */}
          <div className="sm:col-span-2 border-t border-gray-100 pt-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <Truck className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Geplante Abholung</div>
                  {order.pickup_date ? (
                    <div className="text-sm">
                      <span className="font-medium">{formatDate(order.pickup_date)}</span>
                      {order.pickup_time && <span> um {order.pickup_time}</span>}
                      {order.pickup_staff && <div className="text-gray-500 text-xs mt-0.5">{order.pickup_staff.full_name}</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Noch nicht geplant</div>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <RotateCcw className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs text-gray-500 mb-0.5">Geplante Rückgabe</div>
                  {order.return_date ? (
                    <div className="text-sm">
                      <span className="font-medium">{formatDate(order.return_date)}</span>
                      {order.return_time && <span> um {order.return_time}</span>}
                      {order.return_staff && <div className="text-gray-500 text-xs mt-0.5">{order.return_staff.full_name}</div>}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">Noch nicht geplant</div>
                  )}
                </div>
              </div>
            </div>
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

            {/* Planning buttons */}
            {["bestaetigt", "abgeholt", "zurueckgebracht", "abgeschlossen"].includes(order.status) && (
              <>
                <button onClick={() => openPlanModal("pickup")} className="btn-secondary text-sm py-2 px-4">
                  <Calendar className="w-4 h-4 mr-1" /> Abholung planen
                </button>
                <button onClick={() => openPlanModal("return")} className="btn-secondary text-sm py-2 px-4">
                  <PackageOpen className="w-4 h-4 mr-1" /> Rückgabe planen
                </button>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="section-header mb-4">Dokumente generieren</h2>
          <div className="flex flex-wrap gap-3">
            {["angebot", "rechnung", "mietvertrag", "auftragsbestaetigung", "ablehnung"].map((type) => (
              <button key={type} onClick={() => generatePDF(type)} className="btn-secondary text-sm py-2 px-4">
                <FileText className="w-4 h-4 mr-1" /> {docTypeLabel(type)}
              </button>
            ))}
          </div>
        </div>

        {/* Document History */}
        {documents.length > 0 && (
          <div className="card">
            <h2 className="section-header mb-4">Dokumentenhistorie</h2>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
                >
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{docTypeLabel(doc.type)}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(doc.created_at)} · {doc.file_name}
                    </div>
                  </div>
                  <button
                    onClick={() => generatePDF(doc.type)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors shrink-0"
                    title="Erneut generieren"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors shrink-0"
                    title="Entfernen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Plan Modal */}
      {planType && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{planModalTitle}</h3>
              <button onClick={closePlanModal} className="p-2 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={planStaffId}
                    onChange={(e) => setPlanStaffId(e.target.value)}
                    className="input-field pl-9 w-full"
                  >
                    <option value="">Bitte wählen</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    value={planDate}
                    onChange={(e) => setPlanDate(e.target.value)}
                    className="input-field pl-9 w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="time"
                    value={planTime}
                    onChange={(e) => setPlanTime(e.target.value)}
                    className="input-field pl-9 w-full"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closePlanModal} className="flex-1 btn-secondary py-2.5">
                Abbrechen
              </button>
              <button
                onClick={savePlan}
                disabled={savingPlan || !planStaffId || !planDate}
                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

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
