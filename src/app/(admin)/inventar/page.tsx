"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import {
  Plus,
  Package,
  Search,
  Tag,
  Eye,
  FolderOpen,
  Layers,
  CalendarDays,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [bookings, setBookings] = useState<Map<string, any[]>>(new Map());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: p, error: ep }, { data: oi, error: eoi }, { data: po, error: epo }] = await Promise.all([
        supabase
          .from("products")
          .select("*, category:category_id(*)")
          .order("name", { ascending: true })
          .limit(50),
        supabase
          .from("order_items")
          .select(
            "product_id, quantity, order:order_id(start_date, end_date, status)"
          )
          .neq("order.status", "storniert"),
        supabase
          .from("product_owners")
          .select("*, owner:owner_id(full_name, email)"),
      ]);
      if (ep || eoi || epo) {
        console.error("Failed to load inventory:", ep || eoi || epo);
      }

      // Attach owners to products
      const ownersMap = new Map<string, any[]>();
      (po || []).forEach((o) => {
        if (!ownersMap.has(o.product_id)) ownersMap.set(o.product_id, []);
        ownersMap.get(o.product_id)!.push(o);
      });
      const productsWithOwners = (p || []).map((product) => ({
        ...product,
        owners: ownersMap.get(product.id) || [],
      }));
      setProducts(productsWithOwners);

      // Build product_id -> bookings map
      const map = new Map<string, any[]>();
      (oi || []).forEach((item) => {
        if (!map.has(item.product_id)) map.set(item.product_id, []);
        map.get(item.product_id)!.push(item.order);
      });
      setBookings(map);
      setLoading(false);
    }
    load();
  }, [supabase]);

  function getAvailability(product: any) {
    if (product.condition === "defekt") {
      return { label: "Defekt", className: "bg-red-100 text-red-800" };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pb = bookings.get(product.id) || [];

    const activeBooking = pb.find((b) => {
      const s = new Date(b.start_date);
      s.setHours(0, 0, 0, 0);
      const e = new Date(b.end_date);
      e.setHours(23, 59, 59, 999);
      return today >= s && today <= e;
    });

    if (activeBooking) {
      if (
        activeBooking.status === "bestaetigt" ||
        activeBooking.status === "abgeholt"
      ) {
        return { label: "Vermietet", className: "bg-blue-100 text-blue-800" };
      }
      if (
        activeBooking.status === "offen" ||
        activeBooking.status === "verhandlungsphase" ||
        activeBooking.status === "vertragsphase"
      ) {
        return { label: "Reserviert", className: "bg-yellow-100 text-yellow-800" };
      }
      return { label: "Reserviert", className: "bg-yellow-100 text-yellow-800" };
    }

    return { label: "Verfügbar", className: "bg-green-100 text-green-800" };
  }

  function getUpcomingBooking(product: any) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const pb = bookings.get(product.id) || [];

    const future = pb
      .filter((b) => {
        const s = new Date(b.start_date);
        s.setHours(0, 0, 0, 0);
        return s > today;
      })
      .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime());

    return future[0] || null;
  }

  const grouped = useMemo(() => {
    const term = search.toLowerCase();
    const filtered = products.filter(
      (p) =>
        p.name.toLowerCase().includes(term) ||
        p.manufacturer?.toLowerCase().includes(term) ||
        p.product_id.toLowerCase().includes(term) ||
        p.category?.name?.toLowerCase().includes(term)
    );

    const map = new Map<string, any[]>();
    const noCat: any[] = [];

    filtered.forEach((p) => {
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
  }, [products, search]);

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
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900">
            Inventar
          </h1>
          <p className="text-gray-600 mt-1 text-sm md:text-base">
            {products.length} Artikel im Bestand
          </p>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <Link
            href="/inventar/kalender/"
            className="btn-secondary text-sm px-4 py-2.5"
          >
            <CalendarDays className="w-4 h-4 mr-1.5 md:mr-2" />{" "}
            <span className="hidden sm:inline">Kalender</span>
          </Link>
          <Link
            href="/inventar/kategorien/"
            className="btn-secondary text-sm px-4 py-2.5"
          >
            <Tag className="w-4 h-4 mr-1.5 md:mr-2" />{" "}
            <span className="hidden sm:inline">Kategorien</span>
          </Link>
          <Link
            href="/inventar/sets/"
            className="btn-secondary text-sm px-4 py-2.5"
          >
            <Layers className="w-4 h-4 mr-1.5 md:mr-2" />{" "}
            <span className="hidden sm:inline">Sets</span>
          </Link>
          <Link
            href="/inventar/neu/"
            className="btn-primary text-sm px-4 py-2.5"
          >
            <Plus className="w-4 h-4 mr-1.5 md:mr-2" />{" "}
            <span className="hidden sm:inline">Artikel erstellen</span>
          </Link>
        </div>
      </div>

      <div className="card p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Suchen nach Name, Hersteller, ID oder Kategorie..."
            className="flex-1 text-sm outline-none bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {grouped.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            Keine Artikel gefunden.
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            {grouped.map(([categoryName, items]) => (
              <div key={categoryName}>
                {/* Category header */}
                <div className="flex items-center gap-2 mb-3">
                  <FolderOpen className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-gray-900">{categoryName}</h3>
                  <span className="text-xs text-gray-400">
                    {items.length} Artikel
                  </span>
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="pb-2 font-medium">Produkt-ID</th>
                        <th className="pb-2 font-medium">Name</th>
                        <th className="pb-2 font-medium">Hersteller</th>
                        <th className="pb-2 font-medium">Anzahl</th>
                        <th className="pb-2 font-medium">Mietpreis/Tag</th>
                        <th className="pb-2 font-medium">Besitzer</th>
                        <th className="pb-2 font-medium">Status</th>
                        <th className="pb-2 font-medium text-right">
                          Aktionen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {items.map((product) => {
                        const avail = getAvailability(product);
                        const upcoming = getUpcomingBooking(product);
                        return (
                          <tr key={product.id} className="hover:bg-gray-50">
                            <td className="py-2.5 font-mono text-xs text-gray-500">
                              {product.product_id}
                            </td>
                            <td className="py-2.5 font-medium">
                              {product.name}
                            </td>
                            <td className="py-2.5 text-gray-600">
                              {product.manufacturer || "-"}
                            </td>
                            <td className="py-2.5 text-gray-600">
                              {product.quantity ?? 1}
                            </td>
                            <td className="py-2.5 text-gray-600">
                              {product.rental_price_per_day
                                ? formatCurrency(product.rental_price_per_day)
                                : "-"}
                            </td>
                            <td className="py-2.5 text-gray-600">
                              {product.owners?.length > 0
                                ? product.owners.map((o: any) => `${o.owner?.full_name || o.owner?.email} (${o.quantity})`).join(", ")
                                : "-"}
                            </td>
                            <td className="py-2.5">
                              <div className="flex flex-col gap-0.5">
                                <span
                                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium w-fit ${avail.className}`}
                                >
                                  {avail.label}
                                </span>
                                {upcoming && (
                                  <span className="text-[10px] text-gray-400">
                                    Nächste Buchung:{" "}
                                    {new Date(
                                      upcoming.start_date
                                    ).toLocaleDateString("de-CH")}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 text-right">
                              <Link
                                href={`/inventar/${product.id}/`}
                                className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                                title="Details"
                              >
                                <Eye className="w-4 h-4" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  {items.map((product) => {
                    const avail = getAvailability(product);
                    const upcoming = getUpcomingBooking(product);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-white"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-sm truncate">
                              {product.name}
                            </span>
                            <span
                              className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${avail.className}`}
                            >
                              {avail.label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {product.product_id}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {product.quantity ?? 1}x{" "}
                            {product.rental_price_per_day
                              ? formatCurrency(product.rental_price_per_day) +
                                "/Tag"
                              : ""}
                            {product.owners?.length > 0 && (
                              <span className="ml-1">
                                · {product.owners.map((o: any) => `${o.owner?.full_name || o.owner?.email} (${o.quantity})`).join(", ")}
                              </span>
                            )}
                            {upcoming && (
                              <span className="ml-1">
                                · Nächste Buchung:{" "}
                                {new Date(
                                  upcoming.start_date
                                ).toLocaleDateString("de-CH")}
                              </span>
                            )}
                          </div>
                        </div>
                        <Link
                          href={`/inventar/${product.id}/`}
                          className="shrink-0 inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                          title="Details"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
