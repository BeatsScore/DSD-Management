"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lock, Unlock, TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

export default function MonthlyClosingPage() {
  const supabase = createClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [stats, setStats] = useState({
    income: 0,
    expenses: 0,
    profit: 0,
    openReceivables: 0,
    openPayables: 0,
    entryCount: 0,
  });
  const [entries, setEntries] = useState<any[]>([]);
  const [closing, setClosing] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  async function loadData() {
    setLoading(true);
    const start = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-01`;
    const end = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}-31`;

    const [{ data: incomeData }, { data: expenseData }, { data: entryData }, { data: closingData }, { data: ordersData }] =
      await Promise.all([
        supabase
          .from("accounting_entries")
          .select("amount")
          .eq("type", "einnahme")
          .eq("status", "gebucht")
          .gte("date", start)
          .lte("date", end),
        supabase
          .from("accounting_entries")
          .select("amount")
          .eq("type", "ausgabe")
          .eq("status", "gebucht")
          .gte("date", start)
          .lte("date", end),
        supabase
          .from("accounting_entries")
          .select("*, category:category_id(name, color)")
          .eq("status", "gebucht")
          .gte("date", start)
          .lte("date", end)
          .order("date", { ascending: false }),
        supabase
          .from("accounting_monthly_closings")
          .select("*")
          .eq("year", selectedYear)
          .eq("month", selectedMonth)
          .single(),
        supabase
          .from("orders")
          .select("total_amount, paid_amount, status")
          .or("payment_status.eq.offen,payment_status.eq.anzahlung")
          .not("status", "eq", "storniert"),
      ]);

    const income = (incomeData || []).reduce((s, e) => s + (e.amount || 0), 0);
    const expenses = (expenseData || []).reduce((s, e) => s + (e.amount || 0), 0);
    const openReceivables = (ordersData || []).reduce(
      (s, o) => s + ((o.total_amount || 0) - (o.paid_amount || 0)),
      0
    );

    setStats({
      income,
      expenses,
      profit: income - expenses,
      openReceivables,
      openPayables: 0, // TODO: Lieferantenrechnungen
      entryCount: entryData?.length || 0,
    });
    setEntries(entryData || []);
    setClosing(closingData);
    setLoading(false);
  }

  async function closeMonth() {
    if (!confirm("Monat wirklich abschliessen? Nach dem Abschluss können keine Buchungen mehr für diesen Monat erstellt werden.")) return;

    const { data: userData } = await supabase.auth.getUser();

    const { error } = await supabase.from("accounting_monthly_closings").upsert({
      year: selectedYear,
      month: selectedMonth,
      total_income: stats.income,
      total_expenses: stats.expenses,
      profit: stats.profit,
      open_receivables: stats.openReceivables,
      open_payables: stats.openPayables,
      is_closed: true,
      closed_at: new Date().toISOString(),
      closed_by: userData.user?.id,
    });

    if (error) {
      alert("Fehler: " + error.message);
      return;
    }

    loadData();
  }

  const formatChf = (n: number) =>
    n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const months = [
    { value: 1, label: "Januar" },
    { value: 2, label: "Februar" },
    { value: 3, label: "März" },
    { value: 4, label: "April" },
    { value: 5, label: "Mai" },
    { value: 6, label: "Juni" },
    { value: 7, label: "Juli" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "Oktober" },
    { value: 11, label: "November" },
    { value: 12, label: "Dezember" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Monatsabschluss</h1>
        <div className="flex items-center gap-3">
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {closing?.is_closed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
          <Lock className="w-5 h-5 text-green-600" />
          <div>
            <div className="font-medium text-green-800">Monat abgeschlossen</div>
            <div className="text-sm text-green-600">
              Abgeschlossen am {new Date(closing.closed_at).toLocaleDateString("de-CH")}
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard title="Einnahmen" value={`CHF ${formatChf(stats.income)}`} icon={<TrendingUp className="w-6 h-6 text-green-500" />} color="green" />
        <StatCard title="Ausgaben" value={`CHF ${formatChf(stats.expenses)}`} icon={<TrendingDown className="w-6 h-6 text-red-500" />} color="red" />
        <StatCard title="Gewinn" value={`CHF ${formatChf(stats.profit)}`} icon={<Wallet className="w-6 h-6 text-blue-500" />} color="blue" />
        <StatCard title="Offene Forderungen" value={`CHF ${formatChf(stats.openReceivables)}`} icon={<AlertTriangle className="w-6 h-6 text-orange-500" />} color="orange" />
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-800">
            Buchungen ({stats.entryCount})
          </h2>
          {!closing?.is_closed && (
            <button
              onClick={closeMonth}
              className="inline-flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
            >
              <Lock className="w-4 h-4" /> Monat abschliessen
            </button>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Datum</th>
                <th className="text-left px-4 py-3 font-medium">Nr.</th>
                <th className="text-left px-4 py-3 font-medium">Typ</th>
                <th className="text-right px-4 py-3 font-medium">Betrag</th>
                <th className="text-left px-4 py-3 font-medium">Kategorie</th>
                <th className="text-left px-4 py-3 font-medium">Beschreibung</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Laden...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400">Keine Buchungen in diesem Monat</td>
                </tr>
              ) : (
                entries.map((e) => (
                  <tr key={e.id} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(e.date).toLocaleDateString("de-CH")}
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-700">{e.entry_number}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        e.type === "einnahme" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                      }`}>
                        {e.type === "einnahme" ? "Einnahme" : "Ausgabe"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      CHF {formatChf(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {e.category?.name ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.category.color || "#9ca3af" }} />
                          {e.category.name}
                        </span>
                      ) : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {e.description || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  const borderColors: Record<string, string> = {
    green: "border-green-100",
    red: "border-red-100",
    blue: "border-blue-100",
    orange: "border-orange-100",
  };
  return (
    <div className={`bg-white rounded-lg shadow-sm border ${borderColors[color]} p-5`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-sm text-gray-500 font-medium">{title}</span>
        {icon}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
    </div>
  );
}
