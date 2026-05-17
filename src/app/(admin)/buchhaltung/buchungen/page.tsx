"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AccountingEntry, AccountingCategory, Customer, Supplier } from "@/types";
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Copy,
  Archive,
  XCircle,
  FileUp,
} from "lucide-react";

const PAYMENT_METHODS: Record<string, string> = {
  bar: "Bar",
  ueberweisung: "Überweisung",
  karte: "Karte",
  paypal: "PayPal",
  andere: "Andere",
};

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  gebucht: { label: "Gebucht", className: "bg-green-50 text-green-700" },
  storniert: { label: "Storniert", className: "bg-red-50 text-red-700" },
  archiviert: { label: "Archiviert", className: "bg-gray-100 text-gray-600" },
};

export default function AccountingEntriesPage() {
  const supabase = createClient();
  const [entries, setEntries] = useState<AccountingEntry[]>([]);
  const [categories, setCategories] = useState<AccountingCategory[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AccountingEntry | null>(null);

  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    type: "einnahme" as "einnahme" | "ausgabe",
    category_id: "",
    payment_method: "ueberweisung" as string,
    description: "",
    customer_id: "",
    supplier_id: "",
    order_id: "",
    status: "gebucht" as string,
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const [{ data: cats }, { data: custs }, { data: supps }] = await Promise.all([
      supabase.from("accounting_categories").select("*").eq("active", true).order("name"),
      supabase.from("customers").select("id, name, company").order("name"),
      supabase.from("suppliers").select("id, company_name").order("company_name"),
    ]);
    setCategories(cats || []);
    setCustomers(custs || []);
    setSuppliers(supps || []);
    await fetchEntries();
    setLoading(false);
  }

  async function fetchEntries() {
    let q = supabase
      .from("accounting_entries")
      .select("*, category:category_id(name, color, type), customer:customer_id(name), supplier:supplier_id(company_name)")
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (filterType) q = q.eq("type", filterType);
    if (filterCategory) q = q.eq("category_id", filterCategory);
    if (filterStatus) q = q.eq("status", filterStatus);

    const { data } = await q;
    let result = data || [];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (e: any) =>
          e.entry_number?.toLowerCase().includes(s) ||
          e.description?.toLowerCase().includes(s) ||
          e.category?.name?.toLowerCase().includes(s) ||
          e.customer?.name?.toLowerCase().includes(s) ||
          e.supplier?.company_name?.toLowerCase().includes(s)
      );
    }

    setEntries(result);
  }

  function openModal(entry?: AccountingEntry) {
    if (entry) {
      setEditingEntry(entry);
      setForm({
        date: entry.date,
        amount: String(entry.amount),
        type: entry.type,
        category_id: entry.category_id || "",
        payment_method: entry.payment_method || "ueberweisung",
        description: entry.description || "",
        customer_id: entry.customer_id || "",
        supplier_id: entry.supplier_id || "",
        order_id: entry.order_id || "",
        status: entry.status,
      });
    } else {
      setEditingEntry(null);
      setForm({
        date: new Date().toISOString().split("T")[0],
        amount: "",
        type: "einnahme",
        category_id: "",
        payment_method: "ueberweisung",
        description: "",
        customer_id: "",
        supplier_id: "",
        order_id: "",
        status: "gebucht",
      });
    }
    setShowModal(true);
  }

  async function saveEntry() {
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) {
      alert("Bitte einen gültigen Betrag eingeben");
      return;
    }

    const payload = {
      date: form.date,
      amount,
      type: form.type,
      category_id: form.category_id || null,
      payment_method: form.payment_method || null,
      description: form.description || null,
      customer_id: form.customer_id || null,
      supplier_id: form.supplier_id || null,
      order_id: form.order_id || null,
      status: form.status,
    };

    if (editingEntry) {
      const { error } = await supabase
        .from("accounting_entries")
        .update(payload)
        .eq("id", editingEntry.id);
      if (error) {
        alert("Fehler beim Speichern: " + error.message);
        return;
      }
    } else {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase.from("accounting_entries").insert({
        ...payload,
        created_by: userData.user?.id || null,
      });
      if (error) {
        alert("Fehler beim Erstellen: " + error.message);
        return;
      }
    }

    setShowModal(false);
    await fetchEntries();
  }

  async function deleteEntry(id: string) {
    if (!confirm("Buchung wirklich löschen?")) return;
    await supabase.from("accounting_entries").delete().eq("id", id);
    await fetchEntries();
  }

  async function changeStatus(id: string, status: string) {
    await supabase.from("accounting_entries").update({ status }).eq("id", id);
    await fetchEntries();
  }

  async function duplicateEntry(entry: AccountingEntry) {
    const { data: userData } = await supabase.auth.getUser();
    const { error } = await supabase.from("accounting_entries").insert({
      date: entry.date,
      amount: entry.amount,
      type: entry.type,
      category_id: entry.category_id,
      payment_method: entry.payment_method,
      description: entry.description ? `${entry.description} (Kopie)` : null,
      customer_id: entry.customer_id,
      supplier_id: entry.supplier_id,
      order_id: entry.order_id,
      status: "gebucht",
      created_by: userData.user?.id || null,
    });
    if (error) {
      alert("Fehler beim Duplizieren: " + error.message);
      return;
    }
    await fetchEntries();
  }

  const formatChf = (n: number) =>
    n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalIncome = entries.filter((e) => e.type === "einnahme" && e.status === "gebucht").reduce((s, e) => s + e.amount, 0);
  const totalExpense = entries.filter((e) => e.type === "ausgabe" && e.status === "gebucht").reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Buchungsregister</h1>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Neue Buchung
        </button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 border border-green-100 rounded-lg p-4">
          <div className="text-sm text-green-600 font-medium">Einnahmen</div>
          <div className="text-xl font-bold text-green-800">CHF {formatChf(totalIncome)}</div>
        </div>
        <div className="bg-red-50 border border-red-100 rounded-lg p-4">
          <div className="text-sm text-red-600 font-medium">Ausgaben</div>
          <div className="text-xl font-bold text-red-800">CHF {formatChf(totalExpense)}</div>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
          <div className="text-sm text-blue-600 font-medium">Saldo</div>
          <div className="text-xl font-bold text-blue-800">CHF {formatChf(totalIncome - totalExpense)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Typen</option>
            <option value="einnahme">Einnahme</option>
            <option value="ausgabe">Ausgabe</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Kategorien</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Alle Status</option>
            <option value="gebucht">Gebucht</option>
            <option value="storniert">Storniert</option>
            <option value="archiviert">Archiviert</option>
          </select>
          <button
            onClick={fetchEntries}
            className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <Filter className="w-4 h-4" /> Filtern
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Buchungsnr.</th>
                <th className="text-left px-4 py-3 font-medium">Datum</th>
                <th className="text-left px-4 py-3 font-medium">Typ</th>
                <th className="text-right px-4 py-3 font-medium">Betrag</th>
                <th className="text-left px-4 py-3 font-medium">Kategorie</th>
                <th className="text-left px-4 py-3 font-medium">Zahlungsart</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Kunde / Lieferant</th>
                <th className="text-right px-4 py-3 font-medium w-32">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">Laden...</td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">Keine Buchungen gefunden</td>
                </tr>
              ) : (
                entries.map((entry) => {
                  const statusInfo = STATUS_LABELS[entry.status];
                  return (
                    <tr key={entry.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700">{entry.entry_number}</td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(entry.date).toLocaleDateString("de-CH")}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            entry.type === "einnahme"
                              ? "bg-green-50 text-green-700"
                              : "bg-red-50 text-red-700"
                          }`}
                        >
                          {entry.type === "einnahme" ? "E" : "A"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        CHF {formatChf(entry.amount)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {entry.category?.name ? (
                          <span
                            className="inline-flex items-center gap-1.5"
                          >
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: entry.category.color || "#9ca3af" }}
                            />
                            {entry.category.name}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {entry.payment_method ? PAYMENT_METHODS[entry.payment_method] : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.className}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {entry.customer?.name || entry.supplier?.company_name || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(entry)}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                            title="Bearbeiten"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => duplicateEntry(entry)}
                            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                            title="Duplizieren"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          {entry.status === "gebucht" && (
                            <>
                              <button
                                onClick={() => changeStatus(entry.id, "archiviert")}
                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded"
                                title="Archivieren"
                              >
                                <Archive className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => changeStatus(entry.id, "storniert")}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                                title="Stornieren"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => deleteEntry(entry.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Löschen"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingEntry ? "Buchung bearbeiten" : "Neue Buchung"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (CHF)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Typ</label>
                  <select
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="einnahme">Einnahme</option>
                    <option value="ausgabe">Ausgabe</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsart</label>
                  <select
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ueberweisung">Überweisung</option>
                    <option value="bar">Bar</option>
                    <option value="karte">Karte</option>
                    <option value="paypal">PayPal</option>
                    <option value="andere">Andere</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategorie</label>
                <select
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— Keine —</option>
                  {categories
                    .filter((c) => c.type === form.type)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Buchungstext</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  placeholder="Beschreibung der Buchung..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Kunde</label>
                  <select
                    value={form.customer_id}
                    onChange={(e) => setForm({ ...form, customer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Keiner —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieferant</label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">— Keiner —</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.company_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={saveEntry}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                {editingEntry ? "Speichern" : "Erstellen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
