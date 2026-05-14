"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Loader2, Wrench, Calendar, AlertTriangle, CheckCircle, X, Plus, Search, Package } from "lucide-react";
import toast from "react-hot-toast";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils";

interface MaintenanceItem {
  product: any;
  lastMaintenance: any;
  nextServiceDate: Date | null;
  daysUntil: number | null;
  overdue: boolean;
}

export default function MaintenancePage() {
  const supabase = createClient();
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "overdue" | "upcoming">("all");
  const [search, setSearch] = useState("");

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [maintDate, setMaintDate] = useState("");
  const [maintDesc, setMaintDesc] = useState("");
  const [maintCost, setMaintCost] = useState("");
  const [maintNext, setMaintNext] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    let result = items;
    if (filter === "overdue") result = result.filter((i) => i.overdue);
    if (filter === "upcoming") result = result.filter((i) => !i.overdue && i.daysUntil !== null && i.daysUntil <= 30);
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((i) =>
        i.product.name?.toLowerCase().includes(term) ||
        i.product.manufacturer?.toLowerCase().includes(term) ||
        i.product.product_id?.toLowerCase().includes(term)
      );
    }
    setFilteredItems(result);
  }, [items, filter, search]);

  async function loadData() {
    setLoading(true);
    const { data: products } = await supabase
      .from("products")
      .select("*, category:category_id(name)")
      .order("name");

    const { data: logs } = await supabase
      .from("maintenance_logs")
      .select("*, performed_by_profile:performed_by(full_name)")
      .order("maintenance_date", { ascending: false });

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const mapped: MaintenanceItem[] = (products || []).map((p) => {
      const productLogs = (logs || []).filter((l) => l.product_id === p.id);
      const last = productLogs[0] || null;
      const interval = p.maintenance_interval || 365;

      let nextDate: Date | null = null;
      let daysUntil: number | null = null;
      let overdue = false;

      if (last?.next_service_date) {
        nextDate = new Date(last.next_service_date);
        nextDate.setHours(0, 0, 0, 0);
        daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        overdue = daysUntil < 0;
      } else if (last?.maintenance_date) {
        nextDate = new Date(last.maintenance_date);
        nextDate.setDate(nextDate.getDate() + interval);
        nextDate.setHours(0, 0, 0, 0);
        daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        overdue = daysUntil < 0;
      } else {
        // No maintenance yet - assume due now
        nextDate = now;
        daysUntil = 0;
        overdue = true;
      }

      return {
        product: p,
        lastMaintenance: last,
        nextServiceDate: nextDate,
        daysUntil,
        overdue,
      };
    });

    // Sort: overdue first, then by days until
    mapped.sort((a, b) => {
      if (a.overdue && !b.overdue) return -1;
      if (!a.overdue && b.overdue) return 1;
      return (a.daysUntil ?? 999) - (b.daysUntil ?? 999);
    });

    setItems(mapped);
    setFilteredItems(mapped);
    setLoading(false);
  }

  const openModal = (product: any) => {
    setSelectedProduct(product);
    setMaintDate(new Date().toISOString().slice(0, 10));
    setMaintDesc("");
    setMaintCost("");
    setMaintNext("");
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedProduct(null);
    setMaintDesc("");
    setMaintCost("");
    setMaintNext("");
  };

  const saveMaintenance = async () => {
    if (!maintDate || !maintDesc.trim()) {
      toast.error("Datum und Beschreibung sind erforderlich.");
      return;
    }
    setSaving(true);

    const { error } = await supabase.from("maintenance_logs").insert({
      product_id: selectedProduct.id,
      maintenance_date: maintDate,
      description: maintDesc.trim(),
      cost: parseFloat(maintCost) || null,
      next_service_date: maintNext || null,
    });

    setSaving(false);

    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }

    toast.success("Wartung eingetragen.");
    closeModal();
    loadData();
  };

  const getStatusBadge = (item: MaintenanceItem) => {
    if (item.overdue) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <AlertTriangle className="w-3 h-3" /> Überfällig
        </span>
      );
    }
    if (item.daysUntil !== null && item.daysUntil <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <AlertTriangle className="w-3 h-3" /> In {item.daysUntil} Tagen
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle className="w-3 h-3" /> In {item.daysUntil} Tagen
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const overdueCount = items.filter((i) => i.overdue).length;
  const upcomingCount = items.filter((i) => !i.overdue && i.daysUntil !== null && i.daysUntil <= 30).length;

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Wartungsübersicht</h1>
          <p className="text-sm text-gray-500 mt-1">
            {overdueCount > 0 && <span className="text-red-600 font-medium">{overdueCount} überfällig</span>}
            {overdueCount > 0 && upcomingCount > 0 && <span className="text-gray-400 mx-1">·</span>}
            {upcomingCount > 0 && <span className="text-amber-600 font-medium">{upcomingCount} demnächst fällig</span>}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(["all", "overdue", "upcoming"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f === "all" ? "Alle" : f === "overdue" ? "Überfällig" : "Demnächst"}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Artikel suchen..."
            className="input-field pl-9 w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredItems.map((item) => (
          <div
            key={item.product.id}
            className={`card flex flex-col sm:flex-row sm:items-center gap-4 ${
              item.overdue ? "border-l-4 border-l-red-500" : ""
            }`}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Link
                  href={`/inventar/${item.product.id}/`}
                  className="font-medium text-gray-900 hover:text-black"
                >
                  {item.product.name}
                </Link>
                {getStatusBadge(item)}
              </div>
              <div className="text-sm text-gray-500">
                {item.product.manufacturer} · {item.product.product_id}
                {item.product.category?.name && <span> · {item.product.category.name}</span>}
              </div>
              <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                {item.lastMaintenance ? (
                  <>
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      Letzte Wartung: {formatDate(item.lastMaintenance.maintenance_date)}
                    </span>
                    {item.lastMaintenance.cost && (
                      <span>{formatCurrency(item.lastMaintenance.cost)}</span>
                    )}
                  </>
                ) : (
                  <span className="text-amber-600">Noch nie gewartet</span>
                )}
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Nächste Wartung: {item.nextServiceDate ? formatDate(item.nextServiceDate.toISOString()) : "—"}
                </span>
              </div>
              {item.lastMaintenance?.description && (
                <div className="text-xs text-gray-400 mt-1 line-clamp-1">
                  {item.lastMaintenance.description}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => openModal(item.product)}
                className="btn-primary text-sm py-2 px-4 inline-flex items-center gap-2"
              >
                <Wrench className="w-4 h-4" /> Wartung durchführen
              </button>
            </div>
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Wrench className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">Keine Wartungen gefunden.</p>
          </div>
        )}
      </div>

      {/* Maintenance Modal */}
      {showModal && selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Wrench className="w-5 h-5 text-blue-600" />
                Wartung durchführen
              </h3>
              <button onClick={closeModal} className="p-2 text-gray-400 hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium">{selectedProduct.name}</div>
              <div className="text-xs text-gray-500">{selectedProduct.manufacturer} · {selectedProduct.product_id}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Wartungsdatum *</label>
                <input
                  type="date"
                  className="input-field w-full"
                  value={maintDate}
                  onChange={(e) => setMaintDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Was wurde gewartet? *</label>
                <textarea
                  rows={3}
                  className="input-field w-full"
                  placeholder="Beschreiben Sie die durchgeführte Wartung..."
                  value={maintDesc}
                  onChange={(e) => setMaintDesc(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kosten (CHF)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-field w-full"
                    placeholder="0.00"
                    value={maintCost}
                    onChange={(e) => setMaintCost(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nächste Wartung</label>
                  <input
                    type="date"
                    className="input-field w-full"
                    value={maintNext}
                    onChange={(e) => setMaintNext(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeModal} className="flex-1 btn-secondary py-2.5">
                Abbrechen
              </button>
              <button
                onClick={saveMaintenance}
                disabled={saving || !maintDate || !maintDesc.trim()}
                className="flex-1 btn-primary py-2.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Wartung speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
