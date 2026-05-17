"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Wallet,
  FileText,
} from "lucide-react";

export default function AccountingDashboardPage() {
  const supabase = createClient();
  const [stats, setStats] = useState({
    openInvoices: 0,
    openInvoicesAmount: 0,
    monthIncome: 0,
    monthExpenses: 0,
    balance: 0,
  });
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [openOrders, setOpenOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const startOfMonth = `${year}-${String(month).padStart(2, "0")}-01`;
    const endOfMonth = `${year}-${String(month).padStart(2, "0")}-31`;

    const [
      { data: entriesIncome },
      { data: entriesExpense },
      { data: recent },
      { data: orders },
    ] = await Promise.all([
      supabase
        .from("accounting_entries")
        .select("amount")
        .eq("type", "einnahme")
        .eq("status", "gebucht")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth),
      supabase
        .from("accounting_entries")
        .select("amount")
        .eq("type", "ausgabe")
        .eq("status", "gebucht")
        .gte("date", startOfMonth)
        .lte("date", endOfMonth),
      supabase
        .from("accounting_entries")
        .select("*, category:category_id(name, color, type)")
        .eq("status", "gebucht")
        .order("date", { ascending: false })
        .limit(5),
      supabase
        .from("orders")
        .select("id, order_number, customer:customer_id(name), total_amount, paid_amount, created_at")
        .or("payment_status.eq.offen,payment_status.eq.anzahlung")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const monthIncome = (entriesIncome || []).reduce((s, e) => s + (e.amount || 0), 0);
    const monthExpenses = (entriesExpense || []).reduce((s, e) => s + (e.amount || 0), 0);

    const { data: openInvData } = await supabase
      .from("orders")
      .select("total_amount, paid_amount")
      .or("payment_status.eq.offen,payment_status.eq.anzahlung")
      .not("status", "eq", "storniert");

    const openInvoicesAmount = (openInvData || []).reduce(
      (s, o) => s + ((o.total_amount || 0) - (o.paid_amount || 0)),
      0
    );

    setStats({
      openInvoices: openInvData?.length || 0,
      openInvoicesAmount: openInvoicesAmount,
      monthIncome,
      monthExpenses,
      balance: monthIncome - monthExpenses,
    });
    setRecentEntries(recent || []);
    setOpenOrders(orders || []);
    setLoading(false);
  }

  const formatChf = (n: number) =>
    n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Buchhaltung</h1>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Offene Rechnungen"
          value={`${stats.openInvoices}`}
          subtitle={`CHF ${formatChf(stats.openInvoicesAmount)}`}
          icon={<FileText className="w-6 h-6 text-orange-500" />}
          link="/buchhaltung/rechnungen/"
        />
        <StatCard
          title="Einnahmen (Monat)"
          value={`CHF ${formatChf(stats.monthIncome)}`}
          icon={<TrendingUp className="w-6 h-6 text-green-500" />}
          link="/buchhaltung/buchungen/"
        />
        <StatCard
          title="Ausgaben (Monat)"
          value={`CHF ${formatChf(stats.monthExpenses)}`}
          icon={<TrendingDown className="w-6 h-6 text-red-500" />}
          link="/buchhaltung/buchungen/"
        />
        <StatCard
          title="Kontostand"
          value={`CHF ${formatChf(stats.balance)}`}
          icon={<Wallet className="w-6 h-6 text-blue-500" />}
          link="/buchhaltung/buchungen/"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Entries */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Letzte Buchungen</h2>
            <Link
              href="/buchhaltung/buchungen/"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Alle anzeigen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Nr.</th>
                  <th className="text-left px-4 py-2 font-medium">Datum</th>
                  <th className="text-left px-4 py-2 font-medium">Typ</th>
                  <th className="text-right px-4 py-2 font-medium">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {recentEntries.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                      Noch keine Buchungen vorhanden
                    </td>
                  </tr>
                )}
                {recentEntries.map((entry) => (
                  <tr key={entry.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-600">{entry.entry_number}</td>
                    <td className="px-4 py-2.5 text-gray-600">
                      {new Date(entry.date).toLocaleDateString("de-CH")}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          entry.type === "einnahme"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {entry.type === "einnahme" ? "Einnahme" : "Ausgabe"}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right font-medium">
                      CHF {formatChf(entry.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Open Orders */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Offene Rechnungen</h2>
            <Link
              href="/buchhaltung/rechnungen/"
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              Alle anzeigen <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-2 font-medium">Rechnung</th>
                  <th className="text-left px-4 py-2 font-medium">Kunde</th>
                  <th className="text-right px-4 py-2 font-medium">Offen</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-gray-400">
                      Keine offenen Rechnungen
                    </td>
                  </tr>
                )}
                {openOrders.map((order) => {
                  const openAmount = (order.total_amount || 0) - (order.paid_amount || 0);
                  return (
                    <tr key={order.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 text-gray-600">{order.order_number}</td>
                      <td className="px-4 py-2.5 text-gray-600">{order.customer?.name || "—"}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-red-600">
                        CHF {formatChf(openAmount)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  link,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  link: string;
}) {
  return (
    <Link
      href={link}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow block"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
    </Link>
  );
}
