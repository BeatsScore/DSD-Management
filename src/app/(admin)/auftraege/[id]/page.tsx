"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, Loader2, Trash2, FileText, Truck, CheckCircle, Printer, Clock, Calendar, PackageOpen, RotateCcw, X, User, Banknote, AlertTriangle, Camera, Wrench, Download, ShieldCheck, History, Pencil, Plus, Search, Layers } from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel, safeParseFloat } from "@/lib/utils";
import { generateDocument, printDocument } from "@/lib/documents";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

type PlanType = "pickup" | "return" | null;

function getPaymentColor(status: string | null | undefined): string {
  switch (status) {
    case "vollstaendig": return "bg-green-100 text-green-800";
    case "anzahlung": return "bg-yellow-100 text-yellow-800";
    default: return "bg-red-100 text-red-800";
  }
}

function getPaymentLabel(status: string | null | undefined): string {
  switch (status) {
    case "vollstaendig": return "Bezahlt";
    case "anzahlung": return "Anzahlung";
    default: return "Offen";
  }
}

export default function OrderDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [damageLogs, setDamageLogs] = useState<any[]>([]);
  const [changeLogs, setChangeLogs] = useState<any[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  // Change log modal state
  const [showChangeModal, setShowChangeModal] = useState<"datum" | "tagessaetze" | "produkte" | "mitarbeiter" | null>(null);
  const [changeForm, setChangeForm] = useState({
    startDate: "",
    endDate: "",
    dayRates: 1,
    assignedTo: "",
  });
  const [editProducts, setEditProducts] = useState<{ productId: string; quantity: number; pricePerDay: number }[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [savingChange, setSavingChange] = useState(false);

  // Planning modal state
  const [planType, setPlanType] = useState<PlanType>(null);
  const [planStaffId, setPlanStaffId] = useState("");
  const [planDate, setPlanDate] = useState("");
  const [planTime, setPlanTime] = useState("");
  const [savingPlan, setSavingPlan] = useState(false);

  // Payment state
  const [paymentStatus, setPaymentStatus] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [savingPayment, setSavingPayment] = useState(false);

  // Deposit state
  const [depositStatus, setDepositStatus] = useState("");
  const [depositMethod, setDepositMethod] = useState("");
  const [depositPaidAmount, setDepositPaidAmount] = useState("");
  const [savingDeposit, setSavingDeposit] = useState(false);

  // Damage protocol modal state
  const [showDamageModal, setShowDamageModal] = useState(false);
  const [damageProductItemIds, setDamageProductItemIds] = useState<string[]>([]);
  const [damageDescription, setDamageDescription] = useState("");
  const [damageSeverity, setDamageSeverity] = useState<"leicht" | "mittel" | "schwer">("leicht");
  const [damagePhotoFile, setDamagePhotoFile] = useState<File | null>(null);
  const [damagePhotoPreview, setDamagePhotoPreview] = useState<string | null>(null);
  const [savingDamage, setSavingDamage] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: o }, { data: i }, { data: d }, { data: p }, { data: dl }, { data: cl }, { data: ap }] = await Promise.all([
        supabase.from("orders").select("*, customer:customer_id(*), assigned:assigned_to(full_name, email), pickup_staff:pickup_staff_id(full_name, email), return_staff:return_staff_id(full_name, email)").eq("id", id).single(),
        supabase.from("order_items").select("*, product:product_id(*), product_item:product_item_id(*)").eq("order_id", id),
        supabase.from("documents").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        supabase.from("profiles").select("id, full_name, email").in("role", ["admin", "staff"]).order("full_name", { ascending: true }),
        supabase.from("damage_logs").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        supabase.from("order_change_logs").select("*").eq("order_id", id).order("created_at", { ascending: false }),
        supabase.from("products").select("id, name, manufacturer, product_id").eq("status", "verfuegbar").order("name"),
      ]);
      setOrder(o);
      setItems(i || []);
      setDocuments(d || []);
      setProfiles(p || []);
      setDamageLogs(dl || []);
      setChangeLogs(cl || []);
      setAllProducts(ap || []);
      if (o) {
        setPaymentStatus(o.payment_status || "offen");
        setPaymentMethod(o.payment_method || "");
        setPaidAmount(o.paid_amount != null ? String(o.paid_amount) : "");
        setDepositStatus(o.deposit_status || "offen");
        setDepositMethod(o.deposit_method || "");
        setDepositPaidAmount(o.deposit_paid_amount != null ? String(o.deposit_paid_amount) : "");
        setChangeForm({
          startDate: o.start_date || "",
          endDate: o.end_date || "",
          dayRates: o.day_rates || 1,
          assignedTo: o.assigned_to || "",
        });
      }
      if (i) {
        setEditProducts(i.map((it: any) => ({ productId: it.product_id, quantity: it.quantity, pricePerDay: it.price_per_day || 0 })));
      }
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
    const success = await generateDocument(type, order, items, window);
    if (!success) {
      toast.error("PDF konnte nicht generiert werden.");
      return;
    }

    const fileName = `${type}_${order.order_number}_${new Date().toISOString().slice(0, 10)}.pdf`;
    const { error } = await supabase.from("documents").insert({
      order_id: id,
      type,
      file_name: fileName,
    });

    if (!error) {
      const { data: d } = await supabase.from("documents").select("*").eq("order_id", id).order("created_at", { ascending: false });
      setDocuments(d || []);
    }
  };

  const handlePrint = (type: string) => {
    const success = printDocument(type, order, items, window);
    if (!success) {
      toast.error("Druckvorschau konnte nicht geöffnet werden.");
    }
  };

  const handleDownload = async (type: string) => {
    const success = await generateDocument(type, order, items, window);
    if (!success) {
      toast.error("PDF konnte nicht generiert werden.");
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

  const savePayment = async () => {
    setSavingPayment(true);
    const { data, error } = await supabase.from("orders").update({
      payment_status: paymentStatus || null,
      payment_method: paymentMethod || null,
      paid_amount: safeParseFloat(paidAmount) || 0,
    }).eq("id", id).select("*, customer:customer_id(*), assigned:assigned_to(full_name, email), pickup_staff:pickup_staff_id(full_name, email), return_staff:return_staff_id(full_name, email)").single();

    setSavingPayment(false);

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }

    toast.success("Zahlungsinformationen gespeichert.");
    setOrder(data);
  };

  const saveDeposit = async () => {
    setSavingDeposit(true);
    const { data, error } = await supabase.from("orders").update({
      deposit_status: depositStatus || null,
      deposit_method: depositMethod || null,
      deposit_paid_amount: safeParseFloat(depositPaidAmount) || 0,
    }).eq("id", id).select("*, customer:customer_id(*), assigned:assigned_to(full_name, email), pickup_staff:pickup_staff_id(full_name, email), return_staff:return_staff_id(full_name, email)").single();

    setSavingDeposit(false);

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }

    toast.success("Kaution gespeichert.");
    setOrder(data);
  };

  const deleteDamageLog = async (logId: string) => {
    if (!(await confirm("Eintrag löschen?", "Dieser Schadenseintrag wird entfernt.", { confirmLabel: "Löschen", cancelLabel: "Abbrechen", variant: "danger" }))) return;
    const { error } = await supabase.from("damage_logs").delete().eq("id", logId);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    setDamageLogs((prev) => prev.filter((d) => d.id !== logId));
    toast.success("Eintrag entfernt.");
  };

  const openDamageModal = () => {
    setShowDamageModal(true);
    setDamageProductItemIds([]);
    setDamageDescription("");
    setDamageSeverity("leicht");
    setDamagePhotoFile(null);
    setDamagePhotoPreview(null);
  };

  const closeDamageModal = () => {
    setShowDamageModal(false);
    setDamageProductItemIds([]);
    setDamageDescription("");
    setDamageSeverity("leicht");
    setDamagePhotoFile(null);
    if (damagePhotoPreview?.startsWith("blob:")) URL.revokeObjectURL(damagePhotoPreview);
    setDamagePhotoPreview(null);
  };

  const handleDamagePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Bitte ein Bild hochladen.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Bild darf maximal 5 MB gross sein.");
      return;
    }
    if (damagePhotoPreview?.startsWith("blob:")) URL.revokeObjectURL(damagePhotoPreview);
    const url = URL.createObjectURL(file);
    setDamagePhotoFile(file);
    setDamagePhotoPreview(url);
  };

  const saveDamage = async () => {
    if (!damageDescription.trim()) {
      toast.error("Bitte eine Beschreibung eingeben.");
      return;
    }
    setSavingDamage(true);

    let photoPath: string | null = null;
    if (damagePhotoFile) {
      const ext = damagePhotoFile.name.split(".").pop() || "jpg";
      const fileName = `damage-${id}-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("damage-photos")
        .upload(fileName, damagePhotoFile, { contentType: damagePhotoFile.type });
      if (uploadError) {
        toast.error("Fehler beim Upload: " + uploadError.message);
        setSavingDamage(false);
        return;
      }
      photoPath = fileName;
    }

    const { error } = await supabase.from("damage_logs").insert({
      order_id: id,
      product_item_ids: damageProductItemIds.length > 0 ? damageProductItemIds : null,
      description: damageDescription.trim(),
      photo_path: photoPath,
      severity: damageSeverity,
    });

    setSavingDamage(false);

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }

    toast.success("Schadensprotokoll gespeichert.");
    closeDamageModal();
    // Refresh damage logs
    const { data: dl } = await supabase.from("damage_logs").select("*").eq("order_id", id).order("created_at", { ascending: false });
    setDamageLogs(dl || []);
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

  const changeTypeLabel = (type: string) => {
    const map: Record<string, string> = {
      datum: "Datum überarbeitet",
      tagessaetze: "Tagessätze überarbeitet",
      produkte: "Produkte überarbeitet",
      mitarbeiter: "Mitarbeiter geändert",
    };
    return map[type] || type;
  };

  const changeTypeIcon = (type: string) => {
    switch (type) {
      case "datum": return <Calendar className="w-4 h-4" />;
      case "tagessaetze": return <Clock className="w-4 h-4" />;
      case "produkte": return <Layers className="w-4 h-4" />;
      case "mitarbeiter": return <User className="w-4 h-4" />;
      default: return <Pencil className="w-4 h-4" />;
    }
  };

  // Change log handlers
  const openChangeModal = (type: "datum" | "tagessaetze" | "produkte" | "mitarbeiter") => {
    setShowChangeModal(type);
    if (order) {
      setChangeForm({
        startDate: order.start_date || "",
        endDate: order.end_date || "",
        dayRates: order.day_rates || 1,
        assignedTo: order.assigned_to || "",
      });
    }
    if (items) {
      setEditProducts(items.map((it: any) => ({ productId: it.product_id, quantity: it.quantity, pricePerDay: it.price_per_day || 0 })));
    }
    setProductSearch("");
  };

  const closeChangeModal = () => {
    setShowChangeModal(null);
    setSavingChange(false);
  };

  const saveChange = async () => {
    if (!showChangeModal) return;
    setSavingChange(true);

    let updates: any = {};
    let logDescription = "";
    let oldValue = "";
    let newValue = "";

    switch (showChangeModal) {
      case "datum":
        updates = { start_date: changeForm.startDate, end_date: changeForm.endDate };
        logDescription = `Zeitraum geändert`;
        oldValue = `${formatDate(order.start_date)} - ${formatDate(order.end_date)}`;
        newValue = `${formatDate(changeForm.startDate)} - ${formatDate(changeForm.endDate)}`;
        break;
      case "tagessaetze":
        const newTotal = items.reduce((sum: number, it: any) => sum + (it.price_per_day || 0) * it.quantity * changeForm.dayRates, 0);
        updates = { day_rates: changeForm.dayRates, total_amount: newTotal > 0 ? newTotal : null };
        logDescription = `Tagessätze geändert`;
        oldValue = `${order.day_rates || 1} Tagessätze (${formatCurrency(order.total_amount)})`;
        newValue = `${changeForm.dayRates} Tagessätze (${formatCurrency(newTotal)})`;
        break;
      case "mitarbeiter":
        updates = { assigned_to: changeForm.assignedTo || null };
        logDescription = `Mitarbeiter geändert`;
        const oldStaff = profiles.find((p) => p.id === order.assigned_to);
        const newStaff = profiles.find((p) => p.id === changeForm.assignedTo);
        oldValue = oldStaff?.full_name || oldStaff?.email || "Nicht zugewiesen";
        newValue = newStaff?.full_name || newStaff?.email || "Nicht zugewiesen";
        break;
      case "produkte":
        // Delete existing items and insert new ones
        await supabase.from("order_items").delete().eq("order_id", id);
        if (editProducts.length > 0) {
          const newItems = editProducts.map((ep) => ({
            order_id: id,
            product_id: ep.productId,
            quantity: ep.quantity,
            price_per_day: ep.pricePerDay || null,
          }));
          await supabase.from("order_items").insert(newItems);
        }
        logDescription = `Produkte überarbeitet`;
        oldValue = items.map((it: any) => `${it.product?.name} (${it.quantity}x)`).join(", ");
        newValue = editProducts.map((ep) => {
          const p = allProducts.find((ap) => ap.id === ep.productId);
          return `${p?.name || "?"} (${ep.quantity}x)`;
        }).join(", ");
        break;
    }

    // Update order if needed
    if (showChangeModal !== "produkte") {
      const { error } = await supabase.from("orders").update(updates).eq("id", id);
      if (error) {
        setSavingChange(false);
        toast.error("Fehler: " + error.message);
        return;
      }
    }

    // Recalculate total amount for product changes
    if (showChangeModal === "produkte") {
      const dayRates = order.day_rates || 1;
      const totalAmount = editProducts.reduce((sum, ep) => sum + (ep.pricePerDay || 0) * ep.quantity * dayRates, 0);
      await supabase.from("orders").update({ total_amount: totalAmount > 0 ? totalAmount : null }).eq("id", id);
    }

    // Insert change log
    await supabase.from("order_change_logs").insert({
      order_id: id,
      change_type: showChangeModal,
      description: logDescription,
      old_value: oldValue,
      new_value: newValue,
    });

    // Refresh data
    const { data: o } = await supabase.from("orders").select("*, customer:customer_id(*), assigned:assigned_to(full_name, email), pickup_staff:pickup_staff_id(full_name, email), return_staff:return_staff_id(full_name, email)").eq("id", id).single();
    const { data: i } = await supabase.from("order_items").select("*, product:product_id(*)").eq("order_id", id);
    const { data: cl } = await supabase.from("order_change_logs").select("*").eq("order_id", id).order("created_at", { ascending: false });

    setOrder(o);
    setItems(i || []);
    setChangeLogs(cl || []);

    setSavingChange(false);
    closeChangeModal();
    toast.success("Änderung gespeichert.");
  };

  // Product editing helpers
  const addEditProduct = (productId: string) => {
    if (editProducts.find((ep) => ep.productId === productId)) return;
    setEditProducts([...editProducts, { productId, quantity: 1, pricePerDay: 0 }]);
  };

  const removeEditProduct = (productId: string) => {
    setEditProducts(editProducts.filter((ep) => ep.productId !== productId));
  };

  const updateEditProduct = (productId: string, field: string, value: number) => {
    setEditProducts(editProducts.map((ep) => (ep.productId === productId ? { ...ep, [field]: value } : ep)));
  };

  const remainingAmount = (order?.total_amount || 0) - (order?.paid_amount || 0);

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
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getPaymentColor(order.payment_status)}`}>
            {getPaymentLabel(order.payment_status)}
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
            <div className="text-xs text-gray-400">
              {order.day_rates || 1} Tagessatz{order.day_rates > 1 ? "e" : ""} × {formatCurrency((order.total_amount || 0) / (order.day_rates || 1))}/Tag
            </div>
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

        {/* Payment Tracking */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-5 h-5 text-green-600" />
            <h2 className="section-header">Zahlungsstatus</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Gesamtbetrag</div>
              <div className="text-lg font-semibold">{formatCurrency(order.total_amount)}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Restbetrag</div>
              <div className={`text-lg font-semibold ${remainingAmount > 0 ? "text-red-600" : "text-green-600"}`}>
                {formatCurrency(remainingAmount)}
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsstatus</label>
              <select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)} className="input-field w-full">
                <option value="offen">Offen</option>
                <option value="anzahlung">Anzahlung</option>
                <option value="vollstaendig">Bezahlt</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsart</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="input-field w-full">
                <option value="">Bitte wählen</option>
                <option value="bar">Bar</option>
                <option value="ueberweisung">Überweisung</option>
                <option value="karte">Karte</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bezahlter Betrag (CHF)</label>
              <input type="number" step="0.01" min="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} className="input-field w-full" />
            </div>
          </div>
          <div className="mt-4">
            <button onClick={savePayment} disabled={savingPayment} className="btn-primary text-sm py-2 px-4">
              {savingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : "Zahlung speichern"}
            </button>
          </div>
        </div>

        {/* Deposit Tracking */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-amber-600" />
            <h2 className="section-header">Kaution</h2>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Kaution (25% Netto)</div>
              <div className="text-lg font-semibold">{formatCurrency(order.deposit_amount || (order.total_amount / 1.077 * 0.25))}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Status</div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                order.deposit_status === "erhalten" ? "bg-green-100 text-green-800" :
                order.deposit_status === "zurueckerstattet" ? "bg-blue-100 text-blue-800" :
                "bg-red-100 text-red-800"
              }`}>
                {order.deposit_status === "erhalten" ? "Erhalten" :
                 order.deposit_status === "zurueckerstattet" ? "Zurückerstattet" : "Offen"}
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kautionsstatus</label>
              <select value={depositStatus} onChange={(e) => setDepositStatus(e.target.value)} className="input-field w-full">
                <option value="offen">Offen</option>
                <option value="erhalten">Erhalten</option>
                <option value="zurueckerstattet">Zurückerstattet</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsart</label>
              <select value={depositMethod} onChange={(e) => setDepositMethod(e.target.value)} className="input-field w-full">
                <option value="">Bitte wählen</option>
                <option value="bar">Bar</option>
                <option value="ueberweisung">Überweisung</option>
                <option value="karte">Karte</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Eingangener Betrag (CHF)</label>
              <input type="number" step="0.01" min="0" value={depositPaidAmount} onChange={(e) => setDepositPaidAmount(e.target.value)} className="input-field w-full" />
            </div>
          </div>
          <div className="mt-4">
            <button onClick={saveDeposit} disabled={savingDeposit} className="btn-primary text-sm py-2 px-4">
              {savingDeposit ? <Loader2 className="w-4 h-4 animate-spin" /> : "Kaution speichern"}
            </button>
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

            {/* Damage protocol button */}
            {["abgeholt", "zurueckgebracht", "abgeschlossen"].includes(order.status) && (
              <button onClick={openDamageModal} className="btn-secondary text-sm py-2 px-4">
                <AlertTriangle className="w-4 h-4 mr-1" /> Schadensprotokoll
              </button>
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

        {/* Damage Logs */}
        {damageLogs.length > 0 && (
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <h2 className="section-header">Schadensprotokoll</h2>
            </div>
            <div className="space-y-3">
              {damageLogs.map((log) => {
                const affectedItems = (log.product_item_ids || [])
                  .map((piid: string) => items.find((i) => i.product_item?.id === piid))
                  .filter(Boolean);
                const photoUrl = log.photo_path
                  ? supabase.storage.from("damage-photos").getPublicUrl(log.photo_path).data.publicUrl
                  : null;
                return (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white">
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${log.severity === 'schwer' ? 'text-red-600' : log.severity === 'mittel' ? 'text-amber-600' : 'text-yellow-500'}`} />
                    <div className="flex-1 min-w-0">
                      {affectedItems.length > 0 ? (
                        <div className="space-y-1">
                          {affectedItems.map((it: any) => (
                            <Link
                              key={it.product_item?.id}
                              href={`/inventar/${it.product?.id}/`}
                              className="text-sm font-medium hover:underline hover:text-blue-600 block"
                            >
                              {it.product?.name}
                              {it.product_item?.barcode && <span className="text-xs text-gray-400 font-normal"> · {it.product_item.barcode}</span>}
                              {it.product_item?.serial_number && <span className="text-xs text-gray-400 font-normal"> · SN {it.product_item.serial_number}</span>}
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <div className="text-sm font-medium">Allgemein</div>
                      )}
                      <div className="text-sm text-gray-600 mt-0.5">{log.description}</div>
                      {photoUrl && (
                        <a href={photoUrl} target="_blank" rel="noopener noreferrer" className="inline-block mt-2">
                          <img
                            src={photoUrl}
                            alt="Schadensfoto"
                            className="w-24 h-24 object-cover rounded-lg border border-gray-200 hover:opacity-80 transition-opacity"
                            loading="lazy"
                          />
                        </a>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${getStatusColor(log.severity === 'schwer' ? 'defekt' : log.severity === 'mittel' ? 'reserviert' : 'verfuegbar')}`}>
                          {log.severity === 'leicht' ? 'Leicht' : log.severity === 'mittel' ? 'Mittel' : 'Schwer'}
                        </span>
                        <span>{formatDate(log.created_at)}</span>
                      </div>
                    </div>
                    <button onClick={() => deleteDamageLog(log.id)} className="p-1.5 text-gray-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                    onClick={() => handlePrint(doc.type)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors shrink-0"
                    title="Drucken"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDownload(doc.type)}
                    className="p-2 text-gray-400 hover:text-green-600 rounded-md hover:bg-green-50 transition-colors shrink-0"
                    title="Herunterladen"
                  >
                    <Download className="w-4 h-4" />
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

        {/* Change Log Module */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-gray-600" />
              <h2 className="section-header">Änderungsverlauf</h2>
            </div>
          </div>

          {/* New Entry Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => openChangeModal("datum")} className="btn-secondary text-xs py-2 px-3">
              <Calendar className="w-3.5 h-3.5 mr-1" /> Datum überarbeiten
            </button>
            <button onClick={() => openChangeModal("tagessaetze")} className="btn-secondary text-xs py-2 px-3">
              <Clock className="w-3.5 h-3.5 mr-1" /> Tagessätze überarbeiten
            </button>
            <button onClick={() => openChangeModal("produkte")} className="btn-secondary text-xs py-2 px-3">
              <Layers className="w-3.5 h-3.5 mr-1" /> Produkte überarbeiten
            </button>
            <button onClick={() => openChangeModal("mitarbeiter")} className="btn-secondary text-xs py-2 px-3">
              <User className="w-3.5 h-3.5 mr-1" /> Mitarbeiter ändern
            </button>
          </div>

          {/* History List */}
          {changeLogs.length > 0 ? (
            <div className="space-y-2">
              {changeLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                >
                  <div className="shrink-0 mt-0.5 text-gray-400">
                    {changeTypeIcon(log.change_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{changeTypeLabel(log.change_type)}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{log.description}</div>
                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-2">
                      <span className="line-through">{log.old_value}</span>
                      <span>→</span>
                      <span className="font-medium text-gray-600">{log.new_value}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Noch keine Änderungen eingetragen.</p>
          )}
        </div>
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
                  <select value={planStaffId} onChange={(e) => setPlanStaffId(e.target.value)} className="input-field pl-9 w-full">
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
                  <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="input-field pl-9 w-full" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Uhrzeit</label>
                <div className="relative">
                  <Clock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input type="time" value={planTime} onChange={(e) => setPlanTime(e.target.value)} className="input-field pl-9 w-full" />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closePlanModal} className="flex-1 btn-secondary py-2.5">Abbrechen</button>
              <button onClick={savePlan} disabled={savingPlan || !planStaffId || !planDate} className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50">
                {savingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Damage Protocol Modal */}
      {showDamageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Schadensprotokoll</h3>
              <button onClick={closeDamageModal} className="p-2 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="card mb-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-sm font-medium">Optionale Schadensdokumentation</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Betroffene Artikel</label>
                <div className="space-y-2">
                  {items.map((item) => {
                    const piid = item.product_item?.id;
                    const checked = piid && damageProductItemIds.includes(piid);
                    return (
                      <label key={item.id} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={!!checked}
                          onChange={(e) => {
                            if (!piid) return;
                            setDamageProductItemIds((prev) =>
                              e.target.checked ? [...prev, piid] : prev.filter((id) => id !== piid)
                            );
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium">{item.product?.name}</div>
                          <div className="text-xs text-gray-400">
                            {item.product_item?.barcode && <span>Barcode: {item.product_item.barcode}</span>}
                            {item.product_item?.serial_number && <span> · SN: {item.product_item.serial_number}</span>}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Schweregrad</label>
                <div className="flex gap-2">
                  {(["leicht", "mittel", "schwer"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setDamageSeverity(s)}
                      className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                        damageSeverity === s
                          ? s === "schwer"
                            ? "bg-red-100 border-red-300 text-red-800"
                            : s === "mittel"
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                            : "bg-green-100 border-green-300 text-green-800"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {s === "leicht" ? "Leicht" : s === "mittel" ? "Mittel" : "Schwer"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung *</label>
                <textarea
                  rows={3}
                  value={damageDescription}
                  onChange={(e) => setDamageDescription(e.target.value)}
                  placeholder="Beschreiben Sie den Schaden..."
                  className="input-field w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Foto</label>
                {damagePhotoPreview ? (
                  <div className="relative inline-block">
                    <img
                      src={damagePhotoPreview}
                      alt="Vorschau"
                      className="w-full max-h-64 object-contain rounded-lg border border-gray-200"
                      loading="lazy"
                      decoding="async"
                    />
                    <button
                      onClick={() => {
                        if (damagePhotoPreview?.startsWith("blob:")) URL.revokeObjectURL(damagePhotoPreview);
                        setDamagePhotoPreview(null);
                        setDamagePhotoFile(null);
                      }}
                      className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
                    <Camera className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Foto hochladen</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleDamagePhotoChange} />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeDamageModal} className="flex-1 btn-secondary py-3">
                Abbrechen
              </button>
              <button
                onClick={saveDamage}
                disabled={savingDamage || !damageDescription.trim()}
                className="flex-1 btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingDamage ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Speichern
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Log Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {showChangeModal === "datum" && "Datum überarbeiten"}
                {showChangeModal === "tagessaetze" && "Tagessätze überarbeiten"}
                {showChangeModal === "produkte" && "Produkte überarbeiten"}
                {showChangeModal === "mitarbeiter" && "Mitarbeiter ändern"}
              </h3>
              <button onClick={closeChangeModal} className="p-2 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Datum Form */}
            {showChangeModal === "datum" && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Startdatum</label>
                    <input type="date" className="input-field w-full" value={changeForm.startDate} onChange={(e) => setChangeForm({ ...changeForm, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Enddatum</label>
                    <input type="date" className="input-field w-full" value={changeForm.endDate} onChange={(e) => setChangeForm({ ...changeForm, endDate: e.target.value })} />
                  </div>
                </div>
              </div>
            )}

            {/* Tagessätze Form */}
            {showChangeModal === "tagessaetze" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tagessätze</label>
                  <input type="number" min={1} className="input-field w-full" value={changeForm.dayRates} onChange={(e) => setChangeForm({ ...changeForm, dayRates: parseInt(e.target.value) || 1 })} />
                </div>
              </div>
            )}

            {/* Mitarbeiter Form */}
            {showChangeModal === "mitarbeiter" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zugewiesen an</label>
                  <select className="input-field w-full" value={changeForm.assignedTo} onChange={(e) => setChangeForm({ ...changeForm, assignedTo: e.target.value })}>
                    <option value="">Nicht zugewiesen</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>{p.full_name || p.email}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Produkte Form */}
            {showChangeModal === "produkte" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Produkt hinzufügen</label>
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
                    className="input-field w-full"
                    onChange={(e) => {
                      if (e.target.value) {
                        addEditProduct(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">Bitte wählen</option>
                    {allProducts
                      .filter((p) => {
                        if (editProducts.find((ep) => ep.productId === p.id)) return false;
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

                {editProducts.length > 0 && (
                  <div className="space-y-2">
                    {editProducts.map((ep) => {
                      const product = allProducts.find((p) => p.id === ep.productId);
                      return (
                        <div key={ep.productId} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium">{product?.name}</div>
                            <div className="text-xs text-gray-500">{product?.manufacturer}</div>
                          </div>
                          <input
                            type="number"
                            min={1}
                            className="w-20 input-field py-1.5 text-sm"
                            value={ep.quantity}
                            onChange={(e) => updateEditProduct(ep.productId, "quantity", parseInt(e.target.value) || 1)}
                          />
                          <input
                            type="number"
                            step="0.01"
                            className="w-28 input-field py-1.5 text-sm"
                            placeholder="CHF/Tag"
                            value={ep.pricePerDay || ""}
                            onChange={(e) => updateEditProduct(ep.productId, "pricePerDay", parseFloat(e.target.value) || 0)}
                          />
                          <button
                            type="button"
                            onClick={() => removeEditProduct(ep.productId)}
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
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={closeChangeModal} className="flex-1 btn-secondary py-2.5">
                Abbrechen
              </button>
              <button
                onClick={saveChange}
                disabled={savingChange}
                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {savingChange ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
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
