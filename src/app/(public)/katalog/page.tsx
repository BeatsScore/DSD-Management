"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Package, Filter, Layers } from "lucide-react";
import { getStatusColor, getStatusLabel, formatCurrency } from "@/lib/utils";

export default function CatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [sets, setSets] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: p, error: ep }, { data: c, error: ec }, { data: s, error: es }] = await Promise.all([
        supabase.from("products").select("*, category:category_id(*)").order("name", { ascending: true }),
        supabase.from("product_categories").select("*").order("name", { ascending: true }),
        supabase.from("product_sets").select("*, items:set_items(*, product:product_id(id, name))").eq("active", true).order("name", { ascending: true }),
      ]);
      if (ep || ec || es) {
        console.error("Failed to load catalog:", ep || ec || es);
      }
      setProducts(p || []);
      setFiltered(p || []);
      setCategories(c || []);
      setSets(s || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    if (!activeCategory) {
      setFiltered(products);
    } else {
      setFiltered(products.filter((p) => p.category_id === activeCategory));
    }
  }, [activeCategory, products]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="mb-10">
        <h1 className="page-header mb-2">Miet- und Verleihkatalog</h1>
        <p className="text-gray-600">
          Durchsuchen Sie unser Sortiment an professioneller Eventtechnik.
        </p>
      </div>

      {/* Sets Section */}
      {sets.length > 0 && !activeCategory && (
        <div className="mb-12">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5 text-accent" />
            <h2 className="text-xl font-bold text-gray-900">Sets & Pakete</h2>
          </div>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
            {sets.map((set) => (
              <Link
                key={set.id}
                href={`/katalog/set/${set.id}/`}
                className="card hover:shadow-md transition-shadow group relative overflow-hidden"
              >
                {set.image_url ? (
                  <div className="h-40 -mx-5 -mt-5 mb-4 overflow-hidden">
                    <img
                      src={set.image_url}
                      alt={set.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      loading="lazy"
                      decoding="async"
                    />
                  </div>
                ) : (
                  <div className="h-32 -mx-5 -mt-5 mb-4 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <Layers className="w-10 h-10 text-gray-400" />
                  </div>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
                    Set
                  </span>
                  <span className="text-xs text-gray-400">
                    {set.items?.length || 0} Artikel
                  </span>
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-accent transition-colors mb-1">
                  {set.name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                  {set.description || "Keine Beschreibung vorhanden."}
                </p>
                {set.rental_price_per_day ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-lg font-bold text-gray-900">
                      {formatCurrency(set.rental_price_per_day)}
                    </span>
                    <span className="text-sm text-gray-500">/ Tag</span>
                  </div>
                ) : (
                  <span className="text-sm text-gray-400">Preis auf Anfrage</span>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Filter */}
        <aside className="lg:w-64 shrink-0">
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4" />
              <h2 className="font-semibold text-sm">Kategorien</h2>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setActiveCategory("")}
                className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  activeCategory === "" ? "bg-gray-100 font-medium" : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                Alle Kategorien
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                    activeCategory === cat.id ? "bg-gray-100 font-medium" : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Product Grid */}
        <div className="flex-1">
          {filtered.length > 0 ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((product) => (
                <Link
                  key={product.id}
                  href={`/katalog/${product.id}/`}
                  className="card hover:shadow-md transition-shadow group overflow-hidden"
                >
                  {product.image_urls && product.image_urls.length > 0 ? (
                    <div className="relative h-32 -mx-5 -mt-5 mb-4 overflow-hidden bg-gray-50 flex items-center justify-center">
                      <img
                        src={product.image_urls[0]}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform p-2"
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                        {product.quantity}x
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-600" />
                      </div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-900 text-white">
                        {product.quantity}x
                      </span>
                    </div>
                  )}
                  <h3 className="font-semibold text-gray-900 group-hover:text-accent transition-colors mb-1">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 mb-2">
                    {product.manufacturer}
                    {product.manufacture_date
                      ? ` / ${new Date(product.manufacture_date).getFullYear()}`
                      : ""}
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {product.description || "Keine Beschreibung vorhanden."}
                  </p>
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <span className="text-xs font-mono text-gray-400">
                      {product.product_id}
                    </span>
                    <span className="text-xs text-gray-500">
                      {product.category?.name || "Unkategorisiert"}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-xl">
              <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Keine Produkte gefunden.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
