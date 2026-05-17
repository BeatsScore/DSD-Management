"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Order } from "@/types";
import { Search, FileText, CheckCircle, AlertCircle, Clock, XCircle } from "lucide-react";

const PAYMENT_METHODS: Record<string, string> = {
  bar: "Bar",
  ueberweisung: "Überweisung",
  karte: "Karte",
  paypal: "PayPal",
};

type InvoiceStatus = "offen" | "teilweise_bezahlt" | "bezahlt" | "ueberfaellig" | "storniert";

function getInvoiceStatus(order: any): InvoiceStatus {
  if (order.status === "storniert") return "storniert";
  if ((order.paid_amount || 0) >= (order.total_amount || 0)) return "bezahlt";
  if ((order.paid_amount || 0) > 0) return "teilweise_bezahlt";

  const created = new Date(order.created_at);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDiff > 14) return "ueberfaellig";

  return "offen";
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
  offen: { label: "Offen", className: "bg-orange-50 text-orange-700", icon: <Clock className="w-3.5 h-3.5" /> },
  teilweise_bezahlt: { label: "Teilweise", className: "bg-yellow-50 text-yellow-700", icon: <Clock className="w-3.5 h-3.5" /> },
  bezahlt: { label: "Bezahlt", className: "bg-green-50 text-green-700", icon: <CheckCircle className="w-3.5 h-3.5" /> },
  ueberfaellig: { label: "Überfällig", className: "bg-red-50 text-red-700", icon: <AlertCircle className="w-3.5 h-3.5" /> },
  storniert: { label: "Storniert", className: "bg-gray-100 text-gray-500", icon: <XCircle className="w-3.5 h-3.5" /> },
};

export default function InvoicesPage() {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    date: new Date().toISOString().split("T")[0],
    payment_method: "ueberweisung",
    description: "",
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  async function fetchOrders() {
    setLoading(true);
    let q = supabase
      .from("orders")
      .select(
        "*, customer:customer_id(name, company), documents:documents(id, type)"
      )
      .not("total_amount", "eq", 0)
      .not("total_amount", "is", null)
      .order("created_at", { ascending: false });

    const { data } = await q;
    const enriched = (data || []).map((o) => ({ ...o, invoiceStatus: getInvoiceStatus(o) }));
    setOrders(enriched);
    setLoading(false);
  }

  const filteredOrders = orders.filter((o) => {
    const matchesSearch =
      !search ||
      o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      o.customer?.company?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !filterStatus || o.invoiceStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const openPaymentModal = (order: any) => {
    setSelectedOrder(order);
    const openAmount = (order.total_amount || 0) - (order.paid_amount || 0);
    setPaymentForm({
      amount: String(Math.max(0, openAmount)),
      date: new Date().toISOString().split("T")[0],
      payment_method: order.payment_method || "ueberweisung",
      description: `Zahlung zu Rechnung ${order.order_number}`,
    });
    setShowPaymentModal(true);
  };

  async function recordPayment() {
    if (!selectedOrder) return;
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      alert("Bitte gültigen Betrag eingeben");
      return;
    }

    const newPaid = (selectedOrder.paid_amount || 0) + amount;
    let newStatus = "offen";
    if (newPaid >= (selectedOrder.total_amount || 0)) {
      newStatus = "vollstaendig";
    } else if (newPaid > 0) {
      newStatus = "anzahlung";
    }

    // Update order
    const { error: orderError } = await supabase
      .from("orders")
      .update({
        paid_amount: newPaid,
        payment_status: newStatus,
        payment_method: paymentForm.payment_method,
      })
      .eq("id", selectedOrder.id);

    if (orderError) {
      alert("Fehler: " + orderError.message);
      return;
    }

    // Create accounting entry
    const { data: userData } = await supabase.auth.getUser();
    await supabase.from("accounting_entries").insert({
      date: paymentForm.date,
      amount,
      type: "einnahme",
      payment_method: paymentForm.payment_method,
      description: paymentForm.description,
      customer_id: selectedOrder.customer_id,
      order_id: selectedOrder.id,
      status: "gebucht",
      created_by: userData.user?.id || null,
    });

    setShowPaymentModal(false);
    fetchOrders();
  }

  const formatChf = (n: number) =>
    n.toLocaleString("de-CH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const totalOpen = filteredOrders
    .filter((o) => o.invoiceStatus !== "bezahlt" && o.invoiceStatus !== "storniert")
    .reduce((s, o) => s + ((o.total_amount || 0) - (o.paid_amount || 0)), 0);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Rechnungsintegration</h1>
        <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-2">
          <span className="text-sm text-red-600 font-medium">
            Offener Gesamtbetrag: CHF {formatChf(totalOpen)}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechnung oder Kunde suchen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Alle Status</option>
          <option value="offen">Offen</option>
          <option value="teilweise_bezahlt">Teilweise bezahlt</option>
          <option value="bezahlt">Bezahlt</option>
          <option value="ueberfaellig">Überfällig</option>
          <option value="storniert">Storniert</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left px-4 py-3 font-medium">Rechnungsnr.</th>
                <th className="text-left px-4 py-3 font-medium">Kunde</th>
                <th className="text-left px-4 py-3 font-medium">Datum</th>
                <th className="text-right px-4 py-3 font-medium">Betrag</th>
                <th className="text-right px-4 py-3 font-medium">Bezahlt</th>
                <th className="text-right px-4 py-3 font-medium">Offen</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-right px-4 py-3 font-medium w-32">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Laden...</td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-400">Keine Rechnungen gefunden</td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const status = STATUS_CONFIG[order.invoiceStatus];
                  const openAmount = (order.total_amount || 0) - (order.paid_amount || 0);
                  return (
                    <tr key={order.id} className="border-t border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-700">
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          {order.order_number}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {order.customer?.name || "—"}
                        {order.customer?.company && (
                          <div className="text-xs text-gray-400">{order.customer.company}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {new Date(order.created_at).toLocaleDateString("de-CH")}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        CHF {formatChf(order.total_amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        CHF {formatChf(order.paid_amount || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-red-600">
                        {openAmount > 0 ? `CHF ${formatChf(openAmount)}` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                          {status.icon}
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {order.invoiceStatus !== "bezahlt" && order.invoiceStatus !== "storniert" && (
                            <button
                              onClick={() => openPaymentModal(order)}
                              className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-medium hover:bg-blue-700 transition-colors"
                            >
                              Zahlung
                            </button>
                          )}
                          <a
                            href={`/auftraege/${order.id}/`}
                            className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                          >
                            Details
                          </a>
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

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">Zahlung erfassen</h2>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div className="text-gray-500">Rechnung</div>
                <div className="font-medium text-gray-800">{selectedOrder.order_number}</div>
                <div className="text-gray-600">{selectedOrder.customer?.name || "—"}</div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className="text-gray-500">Gesamtbetrag:</span>
                  <span className="font-medium">CHF {formatChf(selectedOrder.total_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Bereits bezahlt:</span>
                  <span className="font-medium">CHF {formatChf(selectedOrder.paid_amount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-gray-200 mt-1 pt-1">
                  <span className="text-gray-700 font-medium">Noch offen:</span>
                  <span className="font-bold text-red-600">
                    CHF {formatChf((selectedOrder.total_amount || 0) - (selectedOrder.paid_amount || 0))}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (CHF)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={paymentForm.date}
                    onChange={(e) => setPaymentForm({ ...paymentForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsart</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="ueberweisung">Überweisung</option>
                  <option value="bar">Bar</option>
                  <option value="karte">Karte</option>
                  <option value="paypal">PayPal</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Beschreibung</label>
                <input
                  value={paymentForm.description}
                  onChange={(e) => setPaymentForm({ ...paymentForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
              >
                Abbrechen
              </button>
              <button
                onClick={recordPayment}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Zahlung speichern
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
