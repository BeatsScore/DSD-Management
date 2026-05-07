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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Aufträge</h1>
          <p className="text-gray-600 mt-1">
            {orders.length} Aufträge gesamt
          </p>
        </div>
        <Link href="/auftraege/neu/" className="btn-primary">
          <Plus className="w-4 h-4 mr-2" /> Auftrag erstellen
        </Link>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen nach Auftragsnr., Kunde oder Status..."
            className="flex-1 text-sm outline-none bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
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
      </div>
    </div>
  );
}
