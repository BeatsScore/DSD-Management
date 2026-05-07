import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import {
  Package,
  ClipboardList,
  Users,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

export const revalidate = 60;

export default async function DashboardPage() {
  const supabase = await createClient();

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

  const { data: recentOrders } = await supabase
    .from("orders")
    .select("*, customer:customer_id(name)")
    .order("created_at", { ascending: false })
    .limit(5);

  const stats = [
    {
      label: "Produkte",
      value: productCount || 0,
      icon: Package,
      href: "/inventar/",
    },
    {
      label: "Aufträge",
      value: orderCount || 0,
      icon: ClipboardList,
      href: "/auftraege/",
    },
    {
      label: "Kunden",
      value: customerCount || 0,
      icon: Users,
      href: "/kunden/",
    },
    {
      label: "Offene Anfragen",
      value: requestCount || 0,
      icon: TrendingUp,
      href: "/auftraege/",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="page-header">Dashboard</h1>
        <p className="text-gray-600 mt-1">Überblick über Ihr Unternehmen</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <stat.icon className="w-5 h-5 text-gray-400" />
              <ArrowRight className="w-4 h-4 text-gray-300" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
          </Link>
        ))}
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="section-header">Neueste Aufträge</h2>
          <Link
            href="/auftraege/"
            className="text-sm text-accent hover:underline"
          >
            Alle anzeigen
          </Link>
        </div>
        {recentOrders && recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="pb-3 font-medium">Auftragsnr.</th>
                  <th className="pb-3 font-medium">Kunde</th>
                  <th className="pb-3 font-medium">Zeitraum</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="py-3 font-mono text-xs">
                      {order.order_number}
                    </td>
                    <td className="py-3">{order.customer?.name || "-"}</td>
                    <td className="py-3 text-gray-500">
                      {new Date(order.start_date).toLocaleDateString("de-CH")} -{" "}
                      {new Date(order.end_date).toLocaleDateString("de-CH")}
                    </td>
                    <td className="py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {order.status}
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
