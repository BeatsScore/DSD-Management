"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Package, Filter } from "lucide-react";
import { getStatusColor, getStatusLabel } from "@/lib/utils";

export default function CatalogPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: p }, { data: c }] = await Promise.all([
        supabase.from("products").select("*, category:category_id(*)").order("name", { ascending: true }),
        supabase.from("product_categories").select("*").order("name", { ascending: true }),
      ]);
      setProducts(p || []);
      setFiltered(p || []);
      setCategories(c || []);
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
                  className="card hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                      <Package className="w-5 h-5 text-gray-600" />
                    </div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                        product.status
                      )}`}
                    >
                      {getStatusLabel(product.status)}
                    </span>
                  </div>
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
