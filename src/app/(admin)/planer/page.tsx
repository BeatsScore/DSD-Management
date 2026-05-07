"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  CalendarDays,
  Loader2,
  QrCode,
  CheckCircle2,
  Circle,
  ArrowRight,
  X,
} from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";

export default function PlannerPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanningOrderId, setScanningOrderId] = useState<string | null>(null);
  const [scanInput, setScanInput] = useState("");
  const [scannedItems, setScannedItems] = useState<string[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const supabase = createClient();

  const loadOrders = useCallback(async () => {
    const { data } = await supabase
      .from("orders")
      .select("*, customer:customer_id(name), assigned:assigned_to(full_name)")
      .in("status", ["offen", "verhandlungsphase", "vertragsphase", "bestaetigt", "abgeholt"])
      .order("start_date", { ascending: true });
    setOrders(data || []);
    setLoading(false);
  }, [supabase]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const startPickup = async (orderId: string) => {
    setScanningOrderId(orderId);
    setScannedItems([]);
    setScanInput("");
    const { data: items } = await supabase
      .from("order_items")
      .select("*, product:product_id(*)")
      .eq("order_id", orderId);
    setOrderItems(items || []);
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim() || !scanningOrderId) return;

    const barcode = scanInput.trim();
    const matchedItem = orderItems.find(
      (item) => item.product?.barcode === barcode && !scannedItems.includes(item.product?.id)
    );

    if (matchedItem) {
      setScannedItems([...scannedItems, matchedItem.product.id]);
      toast.success(`${matchedItem.product.name} gescannt`);
    } else {
      // Try by product_id as fallback
      const matchedById = orderItems.find(
        (item) => item.product?.product_id === barcode && !scannedItems.includes(item.product?.id)
      );
      if (matchedById) {
        setScannedItems([...scannedItems, matchedById.product.id]);
        toast.success(`${matchedById.product.name} gescannt`);
      } else {
        toast.error("Artikel nicht in diesem Auftrag gefunden oder bereits gescannt.");
      }
    }
    setScanInput("");
  };

  const confirmPickup = async () => {
    if (!scanningOrderId) return;
    const { error } = await supabase
      .from("orders")
      .update({ status: "abgeholt" })
      .eq("id", scanningOrderId);
    if (error) {
      toast.error("Fehler: " + error.message);
      return;
    }
    toast.success("Abholung bestaetigt.");
    setScanningOrderId(null);
    loadOrders();
  };

  const cancelScan = () => {
    setScanningOrderId(null);
    setScannedItems([]);
    setOrderItems([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (scanningOrderId) {
    const totalItems = orderItems.reduce((sum, item) => sum + (item.quantity || 1), 0);
    const scannedCount = scannedItems.length;
    const allScanned = scannedCount >= totalItems && totalItems > 0;

    return (
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="page-header">Abholung scannen</h1>
          <button onClick={cancelScan} className="p-2 text-gray-400 hover:text-black">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="card mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Fortschritt</span>
            <span className="text-sm font-medium">
              {scannedCount} von {totalItems}
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5">
            <div
              className="bg-accent h-2.5 rounded-full transition-all"
              style={{ width: `${totalItems > 0 ? (scannedCount / totalItems) * 100 : 0}%` }}
            />
          </div>
        </div>

        <form onSubmit={handleScan} className="flex gap-2 mb-6">
          <input
            type="text"
            autoFocus
            inputMode="text"
            placeholder="Barcode scannen..."
            className="input-field flex-1"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
          />
          <button type="submit" className="btn-primary px-4">
            <QrCode className="w-4 h-4" />
          </button>
        </form>

        <div className="space-y-2 mb-8">
          {orderItems.map((item) => {
            const isScanned = scannedItems.includes(item.product?.id);
            return (
              <div
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  isScanned
                    ? "border-green-200 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {isScanned ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${isScanned ? "text-green-800" : ""}`}>
                    {item.product?.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {item.product?.product_id} | {item.product?.manufacturer}
                  </div>
                </div>
                <span className="text-xs text-gray-400">x{item.quantity}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={confirmPickup}
          disabled={!allScanned}
          className={`w-full py-3 px-4 rounded-lg font-medium text-sm transition-colors ${
            allScanned
              ? "bg-green-600 text-white hover:bg-green-700"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 inline mr-2" />
          Abholung bestaetigen
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-header">Auftragsplaner</h1>
        <p className="text-gray-600 mt-1">Übersicht aller aktiven Aufträge</p>
      </div>

      <div className="grid gap-4">
        {orders.length > 0 ? (
          orders.map((order) => (
            <div key={order.id} className="card flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <span className="font-mono text-xs text-gray-500">{order.order_number}</span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
                <div className="font-medium">{order.customer?.name || "-"}</div>
                <div className="text-sm text-gray-500">
                  {formatDate(order.start_date)} - {formatDate(order.end_date)}
                </div>
                {order.assigned && (
                  <div className="text-xs text-gray-400 mt-1">
                    Zugewiesen: {order.assigned.full_name}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Link href={`/auftraege/${order.id}/`} className="btn-secondary text-sm py-2 px-3">
                  Details
                </Link>
                {order.status === "bestaetigt" && (
                  <button onClick={() => startPickup(order.id)} className="btn-primary text-sm py-2 px-3">
                    <QrCode className="w-4 h-4 mr-1" /> Abholung
                  </button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-xl">
            <CalendarDays className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Keine aktiven Aufträge.</p>
          </div>
        )}
      </div>
    </div>
  );
}
