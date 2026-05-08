"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus,
  Package,
  Eye,
  Pencil,
  Trash2,
  ArrowLeft,
  Layers,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";
import { useConfirm } from "@/hooks/useConfirm";
import { ConfirmModal } from "@/components/ui/ConfirmModal";

export default function SetsPage() {
  const [sets, setSets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const { confirm, state, handleConfirm, handleCancel } = useConfirm();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("product_sets")
        .select("*, items:set_items(*, product:product_id(*))")
        .order("created_at", { ascending: false });
      setSets(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const handleDelete = async (id: string) => {
    if (!(await confirm("Set löschen?", "Dieses Set wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.", { confirmLabel: "Löschen", cancelLabel: "Abbrechen", variant: "danger" }))) return;
    const { error } = await supabase
      .from("product_sets")
      .delete()
      .eq("id", id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Set gelöscht.");
    setSets((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleActive = async (set: any) => {
    const { error } = await supabase
      .from("product_sets")
      .update({ active: !set.active })
      .eq("id", set.id);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    setSets((prev) =>
      prev.map((s) => (s.id === set.id ? { ...s, active: !s.active } : s))
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/inventar/"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Sets
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              {sets.length} Sets im Bestand
            </p>
          </div>
        </div>
        <Link
          href="/inventar/sets/neu/"
          className="btn-primary text-sm px-4 py-2.5"
        >
          <Plus className="w-4 h-4 mr-1.5" /> Set erstellen
        </Link>
      </div>

      <div className="card p-4 md:p-6">
        {sets.length > 0 ? (
          <div className="space-y-3">
            {sets.map((set) => (
              <div
                key={set.id}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                {set.image_url ? (
                  <img
                    src={set.image_url}
                    alt={set.name}
                    className="w-14 h-14 object-cover rounded-lg shrink-0"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <Layers className="w-6 h-6 text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{set.name}</span>
                    <button
                      onClick={() => toggleActive(set)}
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        set.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {set.active ? "Aktiv" : "Inaktiv"}
                    </button>
                  </div>
                  <div className="text-xs text-gray-500">
                    {set.items?.length || 0} Artikel
                    {set.rental_price_per_day
                      ? " · " + formatCurrency(set.rental_price_per_day) + "/Tag"
                      : ""}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Link
                    href={`/inventar/sets/${set.id}/`}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                    title="Bearbeiten"
                  >
                    <Pencil className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(set.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    title="Löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Layers className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Keine Sets vorhanden.</p>
            <p className="text-sm text-gray-400 mt-1">
              Erstellen Sie ein Set, um mehrere Artikel zusammen anzubieten.
            </p>
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
      />
    </div>
  );
}
