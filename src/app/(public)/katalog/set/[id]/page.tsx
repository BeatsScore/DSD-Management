"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Layers,
  Package,
  Loader2,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function SetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("");
  const [set, setSet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!id) return;
    async function load() {
      const { data } = await supabase
        .from("product_sets")
        .select("*, items:set_items(*, product:product_id(*, category:category_id(*)))")
        .eq("id", id)
        .eq("active", true)
        .single();
      setSet(data);
      setLoading(false);
    }
    load();
  }, [id, supabase]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto" />
      </div>
    );
  }

  if (!set) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Set nicht gefunden.</p>
        <Link
          href="/katalog/"
          className="inline-flex items-center gap-2 text-accent mt-4 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück zum Katalog
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/katalog/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück zum Katalog
      </Link>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Image */}
        <div>
          {set.image_url ? (
            <img
              src={set.image_url}
              alt={set.name}
              className="w-full aspect-video object-cover rounded-xl"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="w-full aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center">
              <Layers className="w-16 h-16 text-gray-400" />
            </div>
          )}
        </div>

        {/* Info */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-accent/10 text-accent">
              Set
            </span>
            <span className="text-sm text-gray-500">
              {set.items?.length || 0} Artikel
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
            {set.name}
          </h1>
          <p className="text-gray-600 mb-6">
            {set.description || "Keine Beschreibung vorhanden."}
          </p>

          <div className="p-4 bg-gray-50 rounded-xl mb-6">
            <div className="flex items-baseline gap-2">
              {set.rental_price_per_day ? (
                <>
                  <span className="text-3xl font-bold text-gray-900">
                    {formatCurrency(set.rental_price_per_day)}
                  </span>
                  <span className="text-gray-500">/ Tag</span>
                </>
              ) : (
                <span className="text-lg text-gray-500">Preis auf Anfrage</span>
              )}
            </div>
          </div>

          <div>
            <Link
              href="/anfrage/"
              className="inline-flex items-center justify-center px-6 py-3 bg-accent text-white font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              Anfrage stellen
            </Link>
          </div>
        </div>
      </div>

      {/* Items list */}
      <div className="mt-12">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Enthaltene Artikel</h2>
        {set.items?.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {set.items.map((item: any) => (
              <Link
                key={item.id}
                href={`/katalog/${item.product_id}/`}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                  <Package className="w-5 h-5 text-gray-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{item.product?.name || "Unbekannt"}</div>
                  <div className="text-xs text-gray-400">
                    {item.product?.category?.name || "Unkategorisiert"} · {item.quantity}x
                  </div>
                </div>
                <ArrowLeft className="w-4 h-4 text-gray-300 rotate-180 shrink-0" />
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">Keine Artikel in diesem Set.</p>
        )}
      </div>
    </div>
  );
}
