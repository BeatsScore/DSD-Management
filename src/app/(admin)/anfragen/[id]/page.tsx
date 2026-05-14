"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Mail,
  Phone,
  Calendar,
  Clock,
  TrendingUp,
  FileText,
  XCircle,
  CheckCircle,
  Trash2,
  Package,
  UserPlus,
  ClipboardList,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

interface RequestItem {
  id: string;
  name: string;
  company: string | null;
  email: string;
  phone: string | null;
  event_description: string | null;
  start_date: string | null;
  end_date: string | null;
  product_ids: string[] | null;
  status: string;
  created_at: string;
}

const statusOptions = [
  { value: "offen", label: "Offen", icon: Clock, color: "bg-blue-100 text-blue-700" },
  { value: "bearbeitung", label: "In Bearbeitung", icon: TrendingUp, color: "bg-amber-100 text-amber-700" },
  { value: "angebot_erstellt", label: "Angebot erstellt", icon: FileText, color: "bg-green-100 text-green-700" },
  { value: "abgelehnt", label: "Abgelehnt", icon: XCircle, color: "bg-red-100 text-red-700" },
];

export default function RequestDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();
  const { confirm, state, handleConfirm, handleCancel, confirmTextValue, setConfirmTextValue, canConfirm } = useConfirm();

  const [request, setRequest] = useState<RequestItem | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    setLoading(true);
    const { data: req } = await supabase.from("requests").select("*").eq("id", id).single();
    setRequest(req);

    if (req?.product_ids && req.product_ids.length > 0) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, name, manufacturer, rental_price_per_day")
        .in("id", req.product_ids);
      setProducts(prods || []);
    }

    setLoading(false);
  };

  const updateStatus = async (newStatus: string) => {
    setSavingStatus(true);
    const { error } = await supabase.from("requests").update({ status: newStatus }).eq("id", id);
    setSavingStatus(false);

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }

    setRequest((prev) => (prev ? { ...prev, status: newStatus } : prev));
    toast.success("Status aktualisiert.");
  };

  const handleDelete = async () => {
    if (!(await confirm(
      "Anfrage löschen?",
      "Diese Anfrage wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.",
      { confirmLabel: "Löschen", cancelLabel: "Abbrechen", variant: "danger" }
    ))) return;

    const { error } = await supabase.from("requests").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Anfrage gelöscht.");
    router.push("/anfragen/");
  };

  const convertToOrder = async () => {
    if (!request) return;

    setConverting(true);

    // 1. Create or find customer
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("email", request.email)
      .maybeSingle();

    let customerId = existingCustomer?.id;

    if (!customerId) {
      const { data: newCustomer, error: custError } = await supabase
        .from("customers")
        .insert({
          name: request.name,
          company: request.company || null,
          email: request.email,
          phone: request.phone || null,
        })
        .select("id")
        .single();

      if (custError) {
        setConverting(false);
        toast.error("Fehler beim Erstellen des Kunden: " + custError.message);
        return;
      }
      customerId = newCustomer.id;
    }

    // 2. Generate order number
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today.toISOString().slice(0, 10));
    const orderNumber = `AUF-${dateStr}-${String((count || 0) + 1).padStart(4, "0")}`;

    // 3. Calculate total amount
    let totalAmount = 0;
    const days = request.start_date && request.end_date
      ? Math.max(1, Math.ceil((new Date(request.end_date).getTime() - new Date(request.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1)
      : 1;

    // 4. Create order
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        order_number: orderNumber,
        customer_id: customerId,
        start_date: request.start_date,
        end_date: request.end_date,
        total_amount: totalAmount,
        status: "offen",
        notes: request.event_description || null,
      })
      .select("*")
      .single();

    if (orderError) {
      setConverting(false);
      toast.error("Fehler beim Erstellen des Auftrags: " + orderError.message);
      return;
    }

    // 5. Create order items from products
    if (products.length > 0) {
      const orderItems = products.map((p) => ({
        order_id: order.id,
        product_id: p.id,
        quantity: 1,
        price_per_day: p.rental_price_per_day || 0,
      }));

      const { error: itemsError } = await supabase.from("order_items").insert(orderItems);
      if (itemsError) {
        console.error("Fehler beim Erstellen der Auftragspositionen:", itemsError);
      }

      // Recalculate total
      totalAmount = products.reduce((sum, p) => sum + (p.rental_price_per_day || 0) * days, 0);
      await supabase.from("orders").update({ total_amount: totalAmount }).eq("id", order.id);
    }

    // 6. Update request status
    await supabase.from("requests").update({ status: "angebot_erstellt" }).eq("id", id);

    setConverting(false);
    toast.success("Auftrag erstellt.");
    router.push(`/auftraege/${order.id}/`);
  };

  const currentStatus = statusOptions.find((s) => s.value === request?.status);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Anfrage nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <Link href="/anfragen/" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {currentStatus && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${currentStatus.color}`}>
                <currentStatus.icon className="w-3.5 h-3.5" />
                {currentStatus.label}
              </span>
            )}
            <span className="text-xs text-gray-400">{formatDate(request.created_at)}</span>
          </div>
          <h1 className="page-header">{request.name}</h1>
          {request.company && <p className="text-gray-500 text-sm">{request.company}</p>}
        </div>
        <button onClick={handleDelete} className="p-2 text-gray-400 hover:text-red-600">
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {/* Contact Info */}
        <div className="card grid sm:grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">E-Mail</div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="w-4 h-4 text-gray-400" />
              <a href={`mailto:${request.email}`} className="text-accent hover:underline">{request.email}</a>
            </div>
          </div>
          {request.phone && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Telefon</div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-gray-400" />
                <a href={`tel:${request.phone}`} className="text-accent hover:underline">{request.phone}</a>
              </div>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-1">Zeitraum</div>
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-gray-400" />
              {request.start_date ? formatDate(request.start_date) : "—"} – {request.end_date ? formatDate(request.end_date) : "—"}
            </div>
          </div>
        </div>

        {/* Event Description */}
        {request.event_description && (
          <div className="card">
            <h2 className="section-header mb-2">Eventbeschreibung</h2>
            <p className="text-sm text-gray-700 whitespace-pre-line">{request.event_description}</p>
          </div>
        )}

        {/* Products */}
        {products.length > 0 && (
          <div className="card">
            <h2 className="section-header mb-4">Angefragte Produkte</h2>
            <div className="space-y-2">
              {products.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-3">
                    <Package className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium">{p.name}</div>
                      <div className="text-xs text-gray-500">{p.manufacturer}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Change */}
        <div className="card">
          <h2 className="section-header mb-4">Status ändern</h2>
          <div className="flex flex-wrap gap-2">
            {statusOptions.map((opt) => {
              const Icon = opt.icon;
              const active = request.status === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => updateStatus(opt.value)}
                  disabled={savingStatus || active}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    active
                      ? opt.color
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  } disabled:opacity-50`}
                >
                  <Icon className="w-4 h-4" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Convert to Order */}
        {request.status !== "abgelehnt" && (
          <div className="card">
            <h2 className="section-header mb-4">In Auftrag umwandeln</h2>
            <p className="text-sm text-gray-600 mb-4">
              Erstellt einen neuen Auftrag mit diesem Kunden und den angefragten Produkten.
            </p>
            <button
              onClick={convertToOrder}
              disabled={converting}
              className="btn-primary inline-flex items-center gap-2"
            >
              {converting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <ClipboardList className="w-4 h-4" />
                  Auftrag erstellen
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <ConfirmModal
        open={state.open}
        title={state.title}
        description={state.description}
        confirmLabel={state.confirmLabel}
        cancelLabel={state.cancelLabel}
        variant={state.variant}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        confirmText={state.confirmText}
        confirmTextValue={confirmTextValue}
        onConfirmTextChange={setConfirmTextValue}
        confirmTextPlaceholder={state.confirmTextPlaceholder}
        confirmTextLabel={state.confirmTextLabel}
        canConfirm={canConfirm}
      />
    </div>
  );
}
