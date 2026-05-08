"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  Package,
} from "lucide-react";
import {
  getDaysInMonth,
  formatMonthYear,
  getWeekDays,
  isSameDay,
} from "@/lib/availability";
import { formatDate } from "@/lib/utils";

export default function BookingCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [products, setProducts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase
        .from("products")
        .select("*, category:category_id(*)")
        .order("name", { ascending: true });

      const { data: oi } = await supabase
        .from("order_items")
        .select(
          "*, order:order_id(id, order_number, start_date, end_date, status, customer:customer_id(name))"
        )
        .neq("order.status", "storniert");

      setProducts(p || []);
      setBookings(oi || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  const days = useMemo(
    () => getDaysInMonth(currentMonth.getFullYear(), currentMonth.getMonth()),
    [currentMonth]
  );

  const weekDays = getWeekDays();

  const productBookings = useMemo(() => {
    const map = new Map<string, any[]>();
    bookings.forEach((b) => {
      if (!map.has(b.product_id)) map.set(b.product_id, []);
      map.get(b.product_id)!.push({
        order_id: b.order.id,
        order_number: b.order.order_number,
        start_date: b.order.start_date,
        end_date: b.order.end_date,
        status: b.order.status,
        quantity: b.quantity,
        customer: b.order.customer,
      });
    });
    return map;
  }, [bookings]);

  const groupedProducts = useMemo(() => {
    const map = new Map<string, any[]>();
    const noCat: any[] = [];
    products.forEach((p) => {
      const catName = p.category?.name || "Ohne Kategorie";
      if (p.category?.name) {
        if (!map.has(catName)) map.set(catName, []);
        map.get(catName)!.push(p);
      } else {
        noCat.push(p);
      }
    });
    const sorted = Array.from(map.entries()).sort(([a], [b]) =>
      a.localeCompare(b)
    );
    if (noCat.length) sorted.push(["Ohne Kategorie", noCat]);
    return sorted;
  }, [products]);

  const prevMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
    );
  };

  const nextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1)
    );
  };

  const today = new Date();

  function getBookingForDay(productId: string, day: Date) {
    const pb = productBookings.get(productId) || [];
    return pb.find((b) => {
      const s = new Date(b.start_date);
      s.setHours(0, 0, 0, 0);
      const e = new Date(b.end_date);
      e.setHours(23, 59, 59, 999);
      const d = new Date(day);
      d.setHours(12, 0, 0, 0);
      return d >= s && d <= e;
    });
  }

  function getBookingColor(status: string): string {
    switch (status) {
      case "bestaetigt":
      case "abgeholt":
        return "bg-red-400 border-red-500";
      case "offen":
      case "verhandlungsphase":
      case "vertragsphase":
        return "bg-amber-400 border-amber-500";
      case "zurueckgebracht":
      case "abgeschlossen":
        return "bg-green-400 border-green-500";
      default:
        return "bg-gray-400 border-gray-500";
    }
  }

  function getBookingLabel(status: string): string {
    switch (status) {
      case "bestaetigt":
        return "Bestätigt";
      case "abgeholt":
        return "Abgeholt";
      case "offen":
        return "Offen";
      case "verhandlungsphase":
        return "Verhandlung";
      case "vertragsphase":
        return "Vertrag";
      case "zurueckgebracht":
        return "Zurück";
      case "abgeschlossen":
        return "Abgeschlossen";
      default:
        return status;
    }
  }

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
        <div className="flex items-center gap-3">
          <Link
            href="/inventar/"
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
              Buchungskalender
            </h1>
            <p className="text-gray-600 mt-1 text-sm md:text-base">
              {products.length} Artikel · {" "}
              {formatMonthYear(currentMonth)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Vorheriger Monat"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentMonth(new Date())}
            className="px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Heute
          </button>
          <button
            onClick={nextMonth}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Nächster Monat"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-red-400 border border-red-500" />
          <span>Bestätigt / Abgeholt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-amber-400 border border-amber-500" />
          <span>Offen / Verhandlung / Vertrag</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-400 border border-green-500" />
          <span>Zurückgebracht / Abgeschlossen</span>
        </div>
      </div>

      {/* Calendar */}
      <div className="card overflow-hidden">
        {groupedProducts.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Keine Artikel im Bestand.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header row with day names */}
              <div className="grid grid-cols-[200px_1fr] border-b border-gray-200">
                <div className="p-3 text-xs font-medium text-gray-500 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                  Artikel
                </div>
                <div className="grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(32px, 1fr))` }}>
                  {days.map((day) => {
                    const isToday = isSameDay(day, today);
                    const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                    return (
                      <div
                        key={day.getTime()}
                        className={`p-1.5 text-center text-[10px] font-medium border-r border-gray-100 ${
                          isToday
                            ? "bg-blue-50 text-blue-700"
                            : isWeekend
                            ? "bg-gray-50 text-gray-400"
                            : "text-gray-600"
                        }`}
                      >
                        <div>{weekDays[(day.getDay() + 6) % 7]}</div>
                        <div className={isToday ? "font-bold" : ""}>
                          {day.getDate()}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Product rows by category */}
              {groupedProducts.map(([categoryName, items]) => (
                <div key={categoryName}>
                  {/* Category header */}
                  <div className="grid grid-cols-[200px_1fr] border-b border-gray-200 bg-gray-100">
                    <div className="p-2 px-3 text-xs font-semibold text-gray-700 sticky left-0 z-10 bg-gray-100 border-r border-gray-200">
                      {categoryName}
                    </div>
                    <div />
                  </div>

                  {items.map((product) => (
                    <div
                      key={product.id}
                      className="grid grid-cols-[200px_1fr] border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <div className="p-2 px-3 text-xs sticky left-0 z-10 bg-white border-r border-gray-200 flex items-center gap-2">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">
                            {product.name}
                          </div>
                          <div className="text-gray-400 font-mono">
                            {product.product_id}
                          </div>
                        </div>
                      </div>
                      <div
                        className="grid"
                        style={{
                          gridTemplateColumns: `repeat(${days.length}, minmax(32px, 1fr))`,
                        }}
                      >
                        {days.map((day) => {
                          const booking = getBookingForDay(product.id, day);
                          const isToday = isSameDay(day, today);
                          const isWeekend =
                            day.getDay() === 0 || day.getDay() === 6;
                          return (
                            <div
                              key={day.getTime()}
                              className={`relative border-r border-gray-100 min-h-[36px] flex items-center justify-center ${
                                isToday
                                  ? "bg-blue-50/50"
                                  : isWeekend
                                  ? "bg-gray-50/50"
                                  : ""
                              }`}
                              title={
                                booking
                                  ? `${booking.order_number} – ${booking.customer?.name || "Unbekannt"}\n${formatDate(booking.start_date)} – ${formatDate(booking.end_date)}\nStatus: ${getBookingLabel(booking.status)}`
                                  : undefined
                              }
                            >
                              {booking && (
                                <div
                                  className={`w-full h-5 mx-px rounded-sm border ${getBookingColor(
                                    booking.status
                                  )}`}
                                />
                              )}
                              {isToday && !booking && (
                                <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
