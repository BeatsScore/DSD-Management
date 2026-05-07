"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Plus, Package, Search, Tag, Eye } from "lucide-react";
import { getStatusColor, getStatusLabel, formatCurrency } from "@/lib/utils";

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("*, category:category_id(*)")
        .order("created_at", { ascending: false })
        .limit(50);
      setProducts(data || []);
      setFiltered(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    const term = search.toLowerCase();
    setFiltered(
      products.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.manufacturer.toLowerCase().includes(term) ||
          p.product_id.toLowerCase().includes(term) ||
          p.category?.name?.toLowerCase().includes(term)
      )
    );
  }, [search, products]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-header">Inventar</h1>
          <p className="text-gray-600 mt-1">
            {products.length} Artikel im Bestand
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/inventar/kategorien/" className="btn-secondary">
            <Tag className="w-4 h-4 mr-2" /> Kategorien
          </Link>
          <Link href="/inventar/neu/" className="btn-primary">
            <Plus className="w-4 h-4 mr-2" /> Artikel erstellen
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="flex items-center gap-3 mb-4">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Suchen nach Name, Hersteller, ID oder Kategorie..."
            className="flex-1 text-sm outline-none bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-3 font-medium">Produkt-ID</th>
                <th className="pb-3 font-medium">Name</th>
                <th className="pb-3 font-medium">Hersteller</th>
                <th className="pb-3 font-medium">Kategorie</th>
                <th className="pb-3 font-medium">Anzahl</th>
                <th className="pb-3 font-medium">Mietpreis/Tag</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length > 0 ? (
                filtered.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="py-3 font-mono text-xs text-gray-500">
                      {product.product_id}
                    </td>
                    <td className="py-3 font-medium">{product.name}</td>
                    <td className="py-3 text-gray-600">
                      {product.manufacturer}
                    </td>
                    <td className="py-3 text-gray-600">
                      {product.category?.name || "-"}
                    </td>
                    <td className="py-3 text-gray-600">
                      {product.quantity ?? 1}
                    </td>
                    <td className="py-3 text-gray-600">
                      {product.rental_price_per_day
                        ? formatCurrency(product.rental_price_per_day)
                        : "-"}
                    </td>
                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                          product.status
                        )}`}
                      >
                        {getStatusLabel(product.status)}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/inventar/${product.id}/`}
                        className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                        title="Details"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Keine Artikel gefunden.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
