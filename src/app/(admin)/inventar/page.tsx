"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus, Package, Search, Tag, Eye, FolderOpen } from "lucide-react";
import { getStatusColor, getStatusLabel, formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("*, category:category_id(*), owner:owner_id(full_name, email)")
        .order("name", { ascending: true })
        .limit(50);
      setProducts(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

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
            href="/inventar/kategorien/"
            className="btn-secondary text-sm px-4 py-2.5"
          >
            <Tag className="w-4 h-4 mr-1.5 md:mr-2" />{" "}
            <span className="hidden sm:inline">Kategorien</span>
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
                      {items.map((product) => (
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
                            {product.owner?.full_name ||
                              product.owner?.email ||
                              "-"}
                          </td>
                          <td className="py-2.5">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                                product.status
                              )}`}
                            >
                              {getStatusLabel(product.status)}
                            </span>
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
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  {items.map((product) => (
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
                            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(
                              product.status
                            )}`}
                          >
                            {getStatusLabel(product.status)}
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
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
