import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Package,
  ClipboardList,
  Users,
  TrendingUp,
  ArrowRight,
  Truck,
  PackageOpen,
  Clock,
  Banknote,
  Wrench,
} from "lucide-react";
import { formatDate, formatCurrency, getStatusColor, getStatusLabel } from "@/lib/utils";

export const revalidate = 60;

export default async function DashboardPage() {
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);
  const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().slice(0, 10);

  // Basic counts
  const { count: productCount } = await supabase
    .from("products")
    .select("*", { count: "exact", head: true });

  const { count: orderCount } = await supabase
    .from("orders")
    .select("*", { count: "exact", head: true });

  const { count: customerCount } = await supabase
    .from("customers")
    .select("*", { count: "exact", head: true });

  const { count: requestCount } = await supabase
    .from("requests")
    .select("*", { count: "exact", head: true })
    .eq("status", "offen");

  // Today's pickups and returns
  const { data: todaysPickups } = await supabase
    .from("orders")
    .select("*, customer:customer_id(name)")
    .eq("pickup_date", today)
    .order("pickup_time", { ascending: true });

  const { data: todaysReturns } = await supabase
    .from("orders")
    .select("*, customer:customer_id(name)")
    .eq("return_date", today)
    .order("return_time", { ascending: true });

  // Revenue this month
  const { data: revenueData } = await supabase
    .from("orders")
    .select("total_amount")
    .gte("created_at", currentMonthStart)
    .lte("created_at", currentMonthEnd + "T23:59:59")
    .neq("status", "storniert");

  const monthlyRevenue = (revenueData || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);

  // Open orders by status
  const { data: openOrdersData } = await supabase
    .from("orders")
    .select("status")
    .in("status", ["offen", "verhandlungsphase", "vertragsphase", "bestaetigt"]);

  const openByStatus: Record<string, number> = {};
  (openOrdersData || []).forEach((o) => {
    openByStatus[o.status] = (openByStatus[o.status] || 0) + 1;
  });

  // Recent orders
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("*, customer:customer_id(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  // Top products
  const { data: topProducts } = await supabase
    .from("order_items")
    .select("product:product_id(name, product_id), quantity")
    .order("created_at", { ascending: false })
    .limit(100);

  const productRentals: Record<string, { name: string; count: number }> = {};
  (topProducts || []).forEach((item: any) => {
    const key = item.product?.product_id || "unknown";
    if (!productRentals[key]) {
      productRentals[key] = { name: item.product?.name || "Unbekannt", count: 0 };
    }
    productRentals[key].count += item.quantity || 1;
  });

  const topProductsList = Object.entries(productRentals)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5);

  const stats = [
    { label: "Produkte", value: productCount || 0, icon: Package, href: "/inventar/" },
    { label: "Aufträge", value: orderCount || 0, icon: ClipboardList, href: "/auftraege/" },
    { label: "Kunden", value: customerCount || 0, icon: Users, href: "/kunden/" },
    { label: "Offene Anfragen", value: requestCount || 0, icon: TrendingUp, href: "/anfragen/" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="text-gray-600 mt-1">Überblick über Ihr Unternehmen</p>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="card hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-5 h-5 text-gray-400" />
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      {/* Revenue + Open Orders */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Banknote className="w-5 h-5 text-green-600" />
            <h2 className="section-header">Umsatz diesen Monat</h2>
          </div>
          <div className="text-3xl font-bold text-gray-900">{formatCurrency(monthlyRevenue)}</div>
          <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleString("de-CH", { month: "long", year: "numeric" })}</p>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-amber-600" />
            <h2 className="section-header">Offene Aufträge</h2>
          </div>
          <div className="space-y-2">
            {["offen", "verhandlungsphase", "vertragsphase", "bestaetigt"].map((status) => (
              <div key={status} className="flex items-center justify-between text-sm">
                <span>{getStatusLabel(status)}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                  {openByStatus[status] || 0}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Wrench className="w-5 h-5 text-blue-600" />
            <h2 className="section-header">Top-Produkte</h2>
          </div>
          {topProductsList.length > 0 ? (
            <div className="space-y-2">
              {topProductsList.map(([key, data]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="truncate mr-2" title={data.name}>{data.name}</span>
                  <span className="text-gray-500 shrink-0">{data.count}x</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Keine Daten vorhanden.</p>
          )}
        </div>
      </div>

      {/* Today's Appointments */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-5 h-5 text-blue-600" />
            <h2 className="section-header">Heutige Abholungen</h2>
          </div>
          {todaysPickups && todaysPickups.length > 0 ? (
            <div className="space-y-3">
              {todaysPickups.map((order) => (
                <Link key={order.id} href={`/auftraege/${order.id}/`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{order.customer?.name || "-"}</div>
                    <div className="text-xs text-gray-500">{order.order_number}</div>
                  </div>
                  {order.pickup_time && <span className="text-sm text-blue-700 font-medium">{order.pickup_time}</span>}
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Keine Abholungen heute.</p>
          )}
        </div>

        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <PackageOpen className="w-5 h-5 text-purple-600" />
            <h2 className="section-header">Heutige Rückgaben</h2>
          </div>
          {todaysReturns && todaysReturns.length > 0 ? (
            <div className="space-y-3">
              {todaysReturns.map((order) => (
                <Link key={order.id} href={`/auftraege/${order.id}/`} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{order.customer?.name || "-"}</div>
                    <div className="text-xs text-gray-500">{order.order_number}</div>
                  </div>
                  {order.return_time && <span className="text-sm text-purple-700 font-medium">{order.return_time}</span>}
                  <ArrowRight className="w-4 h-4 text-gray-300" />
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Keine Rückgaben heute.</p>
          )}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header">Neueste Aufträge</h2>
          <Link href="/auftraege/" className="text-sm text-accent hover:underline">Alle anzeigen</Link>
        </div>
        {recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 font-medium">Auftragsnr.</th>
                  <th className="pb-3 font-medium">Kunde</th>
                  <th className="pb-3 font-medium">Zeitraum</th>
                  <th className="pb-3 font-medium">Betrag</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 font-mono text-xs">{order.order_number}</td>
                    <td className="py-3">{order.customer?.name || "-"}</td>
                    <td className="py-3 text-gray-500">{formatDate(order.start_date)} - {formatDate(order.end_date)}</td>
                    <td className="py-3">{formatCurrency(order.total_amount)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-500">Keine Aufträge vorhanden.</p>
        )}
      </div>
    </div>
  );
}
