"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus, ClipboardList, Search, Eye } from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("*, customer:customer_id(name)")
        .order("created_at", { ascending: false })
        .limit(50);
      setOrders(data || []);
      setFiltered(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      orders.filter(
        (o) =>
          o.order_number.toLowerCase().includes(term) ||
          o.customer?.name?.toLowerCase().includes(term) ||
          o.status.toLowerCase().includes(term)
      )
    );
  }, [search, orders]);

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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">Aufträge</h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {orders.length} Aufträge gesamt
          </p>
        </div>
        <Link href="/auftraege/neu/" className="btn-primary text-sm px-4 py-2.5">
          <Plus className="w-4 h-4 mr-1.5" /> Auftrag erstellen
        </Link>
      </div>

      <div className="card p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Suchen nach Auftragsnr., Kunde oder Status..."
            className="flex-1 text-sm outline-none bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-medium">Auftragsnr.</th>
                <th className="pb-3 font-medium">Kunde</th>
                <th className="pb-3 font-medium">Zeitraum</th>
                <th className="pb-3 font-medium">Betrag</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-xs text-gray-500">
                      {order.order_number}
                    </td>
                    <td className="py-3 font-medium">
                      {order.customer?.name || "-"}
                    </td>
                    <td className="py-3 text-gray-600">
                      {formatDate(order.start_date)} - {formatDate(order.end_date)}
                    </td>
                    <td className="py-3 text-gray-600">
                      {order.total_amount != null
                        ? new Intl.NumberFormat("de-CH", {
                            style: "currency",
                            currency: "CHF",
                          }).format(order.total_amount)
                        : "-"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          order.status
                        )}`}
                      >
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/auftraege/${order.id}/`}
                        className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        title="Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Keine Aufträge gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden space-y-3">
          {filtered.length > 0 ? (
            filtered.map((order) => (
              <Link
                key={order.id}
                href={`/auftraege/${order.id}/`}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-gray-500">{order.order_number}</span>
                    <span
                      className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
                        order.status
                      )}`}
                    >
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="font-medium text-sm">{order.customer?.name || "-"}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(order.start_date)} - {formatDate(order.end_date)}
                  </div>
                  <div className="text-xs text-gray-400">
                    {order.total_amount != null
                      ? new Intl.NumberFormat("de-CH", { style: "currency", currency: "CHF" }).format(order.total_amount)
                      : ""}
                  </div>
                </div>
                <Eye className="w-4 h-4 text-gray-400 shrink-0" />
              </Link>
            ))
          ) : (
            <div className="py-12 text-center text-gray-500">
              <ClipboardList className="w-8 h-8 mx-auto mb-2 text-gray-300" />
              Keine Aufträge gefunden.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
