"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { TrendingUp, TrendingDown, Wallet } from "lucide-react";

const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

export default function YearlyClosingPage() {
  const supabase = createClient();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  async function loadData() {
    setLoading(true);

    // Monthly breakdown
    const startOfYear = `${selectedYear}-01-01`;
    const endOfYear = `${selectedYear}-12-31`;

    const { data: entries } = await supabase
      .from("accounting_entries")
      .select("date, amount, type, category:category_id(name, color)")
      .eq("status", "gebucht")
      .gte("date", startOfYear)
      .lte("date", endOfYear);

    // Group by month
    const monthly = Array.from({ length: 12 }, (_, i) => {
      const monthEntries = (entries || []).filter((e) => {
        const d = new Date(e.date);
        return d.getMonth() === i;
      });
      const income = monthEntries
        .filter((e) => e.type === "einnahme")
        .reduce((s, e) => s + (e.amount || 0), 0);
      const expenses = monthEntries
        .filter((e) => e.type === "ausgabe")
        .reduce((s, e) => s + (e.amount || 0), 0);
      return { month: i + 1, income, expenses, profit: income - expenses };
    });

    // Top categories
    const catMap = new Map();
    (entries || []).forEach((e) => {
      const name = e.category?.name || "Ohne Kategorie";
      const color = e.category?.color || "#9ca3af";
      const key = `${name}|${color}`;
      if (!catMap.has(key)) catMap.set(key, { name, color, income: 0, expenses: 0 });
      const c = catMap.get(key);
      if (e.type === "einnahme") c.income += e.amount || 0;
      else c.expenses += e.amount || 0;
    });
    const topCats = Array.from(catMap.values())
      .sort((a, b) => b.income + b.expenses - (a.income + a.expenses))
      .slice(0, 5);

    setMonthlyData(monthly);
    setTopCategories(topCats);
    setLoading(false);
  }

  const formatChf = (n: number) =>
    n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpenses = monthlyData.reduce((s, m) => s + m.expenses, 0);
  const totalProfit = totalIncome - totalExpenses;

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Jahresabschluss</h1>
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
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-green-50 border border-green-100 rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm text-green-600 font-medium">Einnahmen (Jahr)</span>
            <TrendingUp className="w-6 h-6 text-green-500" />
          </div>
          <div className="text-2xl font-bold text-green-800">CHF {formatChf(totalIncome)}</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm text-red-600 font-medium">Ausgaben (Jahr)</span>
            <TrendingDown className="w-6 h-6 text-red-500" />
          </div>
          <div className="text-2xl font-bold text-red-800">CHF {formatChf(totalExpenses)}</div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-5">
          <div className="flex items-start justify-between mb-3">
            <span className="text-sm text-blue-600 font-medium">Gewinn (Jahr)</span>
            <Wallet className="w-6 h-6 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-blue-800">CHF {formatChf(totalProfit)}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Table */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Monatsübersicht</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Monat</th>
                  <th className="text-right px-4 py-3 font-medium">Einnahmen</th>
                  <th className="text-right px-4 py-3 font-medium">Ausgaben</th>
                  <th className="text-right px-4 py-3 font-medium">Gewinn</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-gray-400">Laden...</td>
                  </tr>
                ) : (
                  monthlyData.map((m) => (
                    <tr key={m.month} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700">{MONTHS[m.month - 1]}</td>
                      <td className="px-4 py-3 text-right text-green-700">CHF {formatChf(m.income)}</td>
                      <td className="px-4 py-3 text-right text-red-700">CHF {formatChf(m.expenses)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${m.profit >= 0 ? "text-blue-700" : "text-red-700"}`}>
                        CHF {formatChf(m.profit)}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="border-t-2 border-gray-200 bg-gray-50 font-semibold">
                  <td className="px-4 py-3 text-gray-800">Gesamt</td>
                  <td className="px-4 py-3 text-right text-green-800">CHF {formatChf(totalIncome)}</td>
                  <td className="px-4 py-3 text-right text-red-800">CHF {formatChf(totalExpenses)}</td>
                  <td className={`px-4 py-3 text-right ${totalProfit >= 0 ? "text-blue-800" : "text-red-800"}`}>
                    CHF {formatChf(totalProfit)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Categories */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Top Kategorien</h2>
          </div>
          <div className="divide-y divide-gray-50">
            {topCategories.length === 0 && (
              <div className="px-5 py-6 text-center text-gray-400 text-sm">Keine Daten</div>
            )}
            {topCategories.map((cat) => (
              <div key={cat.name} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-sm font-medium text-gray-700">{cat.name}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    CHF {formatChf(cat.income + cat.expenses)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="text-green-600">E: CHF {formatChf(cat.income)}</span>
                  <span className="text-red-600">A: CHF {formatChf(cat.expenses)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
