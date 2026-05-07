"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Loader2,
  Trash2,
  ClipboardList,
  Pencil,
  X,
  Star,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

function StarRating({
  label,
  value,
  onChange,
  editable = false,
}: {
  label: string;
  value: number | null;
  onChange?: (v: number) => void;
  editable?: boolean;
}) {
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div>
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = (hover !== null ? hover : value || 0) >= star;
          return (
            <button
              key={star}
              type="button"
              disabled={!editable}
              onClick={() => onChange?.(star)}
              onMouseEnter={() => editable && setHover(star)}
              onMouseLeave={() => editable && setHover(null)}
              className={`transition-colors ${
                editable ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <Star
                className={`w-6 h-6 ${
                  filled ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                }`}
              />
            </button>
          );
        })}
        <span className="ml-2 text-sm text-gray-400">
          {value ? `${value}/5` : "-"}
        </span>
      </div>
    </div>
  );
}

function TrustStatusBadge({
  status,
  onChange,
  editable = false,
}: {
  status: string;
  onChange?: (v: "gruen" | "gelb" | "rot") => void;
  editable?: boolean;
}) {
  const configs = {
    gruen: {
      label: "Alles top",
      icon: ShieldCheck,
      bg: "bg-green-100",
      text: "text-green-700",
      border: "border-green-200",
      ring: "ring-green-500",
    },
    gelb: {
      label: "Nur gegen Vorkasse",
      icon: Shield,
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "border-yellow-200",
      ring: "ring-yellow-500",
    },
    rot: {
      label: "Gesperrt",
      icon: ShieldAlert,
      bg: "bg-red-100",
      text: "text-red-700",
      border: "border-red-200",
      ring: "ring-red-500",
    },
  };

  const current = configs[status as keyof typeof configs] || configs.gruen;
  const Icon = current.icon;

  if (!editable) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border ${current.bg} ${current.text} ${current.border}`}
      >
        <Icon className="w-5 h-5" />
        <span className="font-medium">{current.label}</span>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      {(Object.keys(configs) as Array<keyof typeof configs>).map((key) => {
        const cfg = configs[key];
        const CfgIcon = cfg.icon;
        const isActive = status === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onChange?.(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all ${
              isActive
                ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ${cfg.ring}`
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <CfgIcon className="w-5 h-5" />
            <span className="font-medium text-sm">{cfg.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function CustomerDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [form, setForm] = useState<any>({});

  useEffect(() => {
    async function load() {
      const [{ data: c }, { data: o }] = await Promise.all([
        supabase.from("customers").select("*").eq("id", id).single(),
        supabase
          .from("orders")
          .select("*")
          .eq("customer_id", id)
          .order("created_at", { ascending: false }),
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
          ratingPayment: c.rating_payment ?? 0,
          ratingBehavior: c.rating_behavior ?? 0,
          ratingEquipmentCare: c.rating_equipment_care ?? 0,
          trustStatus: c.trust_status || "gruen",
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
        rating_payment: form.ratingPayment || null,
        rating_behavior: form.ratingBehavior || null,
        rating_equipment_care: form.ratingEquipmentCare || null,
        trust_status: form.trustStatus,
      })
      .eq("id", id);
    setSaving(false);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    setCustomer({
      ...customer,
      name: form.name,
      company: form.company,
      email: form.email,
      phone: form.phone,
      address: form.address,
      notes: form.notes,
      rating_payment: form.ratingPayment,
      rating_behavior: form.ratingBehavior,
      rating_equipment_care: form.ratingEquipmentCare,
      trust_status: form.trustStatus,
    });
    setIsEditing(false);
    toast.success("Kunde aktualisiert.");
  };

  const handleDelete = async () => {
    if (!confirm("Kunde wirklich löschen?")) return;
    const { error } = await supabase.from("customers").delete().eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Kunde gelöscht.");
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
      <Link
        href="/kunden/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header">
          {isEditing ? "Kunde bearbeiten" : customer.name}
        </h1>
        <div className="flex items-center gap-2">
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary text-sm py-2 px-3 flex items-center gap-1.5"
            >
              <Pencil className="w-4 h-4" />
              Bearbeiten
            </button>
          )}
          {isEditing && (
            <button
              onClick={() => setIsEditing(false)}
              className="p-2 text-gray-400 hover:text-black"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={handleDelete}
            className="p-2 text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isEditing ? (
        <form onSubmit={handleSave} className="card space-y-5 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name *</label>
              <input
                className="input-field"
                value={form.name}
                onChange={(e) =>
                  setForm({ ...form, name: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Firma</label>
              <input
                className="input-field"
                value={form.company}
                onChange={(e) =>
                  setForm({ ...form, company: e.target.value })
                }
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
                onChange={(e) =>
                  setForm({ ...form, email: e.target.value })
                }
                required
              />
            </div>
            <div>
              <label className="label">Telefon</label>
              <input
                type="tel"
                className="input-field"
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value })
                }
              />
            </div>
          </div>
          <div>
            <label className="label">Adresse</label>
            <textarea
              rows={2}
              className="input-field"
              value={form.address}
              onChange={(e) =>
                setForm({ ...form, address: e.target.value })
              }
            />
          </div>
          <div>
            <label className="label">Interne Notizen</label>
            <textarea
              rows={3}
              className="input-field"
              value={form.notes}
              onChange={(e) =>
                setForm({ ...form, notes: e.target.value })
              }
            />
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-medium text-gray-900 mb-4">Bewertungen</h3>
            <div className="space-y-4">
              <StarRating
                label="Zahlung"
                value={form.ratingPayment}
                onChange={(v) => setForm({ ...form, ratingPayment: v })}
                editable
              />
              <StarRating
                label="Menschlicher Umgang"
                value={form.ratingBehavior}
                onChange={(v) => setForm({ ...form, ratingBehavior: v })}
                editable
              />
              <StarRating
                label="Umgang mit ausgeliehener Ware"
                value={form.ratingEquipmentCare}
                onChange={(v) =>
                  setForm({ ...form, ratingEquipmentCare: v })
                }
                editable
              />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-5">
            <h3 className="font-medium text-gray-900 mb-4">
              Kundenstatus
            </h3>
            <TrustStatusBadge
              status={form.trustStatus}
              onChange={(v) => setForm({ ...form, trustStatus: v })}
              editable
            />
          </div>

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
        </form>
      ) : (
        <>
          {/* Customer info card */}
          <div className="card mb-6">
            <div className="flex items-start justify-between mb-4">
              <TrustStatusBadge status={customer.trust_status || "gruen"} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-xs text-gray-400 mb-0.5">E-Mail</div>
                <div className="text-sm">{customer.email}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Telefon</div>
                <div className="text-sm">{customer.phone || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Firma</div>
                <div className="text-sm">{customer.company || "-"}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-0.5">Adresse</div>
                <div className="text-sm">{customer.address || "-"}</div>
              </div>
            </div>

            {customer.notes && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-3 mb-6">
                <div className="text-xs text-yellow-700 font-medium mb-1">
                  Interne Notizen
                </div>
                <div className="text-sm text-yellow-800">
                  {customer.notes}
                </div>
              </div>
            )}

            <div className="border-t border-gray-100 pt-5">
              <h3 className="font-medium text-gray-900 mb-4">Bewertungen</h3>
              <div className="space-y-3">
                <StarRating
                  label="Zahlung"
                  value={customer.rating_payment}
                />
                <StarRating
                  label="Menschlicher Umgang"
                  value={customer.rating_behavior}
                />
                <StarRating
                  label="Umgang mit ausgeliehener Ware"
                  value={customer.rating_equipment_care}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h2 className="section-header mb-4">Auftragshistorie</h2>
        {orders.length > 0 ? (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.id}
                href={`/auftraege/${order.id}/`}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium">
                    {order.order_number}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDate(order.start_date)} -{" "}
                    {formatDate(order.end_date)}
                  </div>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-gray-200">
                  {order.status}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">
              Keine Aufträge vorhanden.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
