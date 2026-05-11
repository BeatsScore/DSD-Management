import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Package, ArrowLeft, Calendar, Ruler, Building2, Tag, FileText } from "lucide-react";
import { formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { ImageSlideshow } from "@/components/public/ImageSlideshow";
import { ManualQrCode } from "@/components/ManualQrCode";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: product } = await supabase
    .from("products")
    .select("*, category:category_id(*)")
    .eq("id", id)
    .single();

  if (!product) {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/katalog/"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-black mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück zum Katalog
      </Link>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Image slideshow */}
          <div className="md:w-1/2">
            {product.image_urls && product.image_urls.length > 0 ? (
              <ImageSlideshow images={product.image_urls} alt={product.name} aspectRatio="aspect-[3/4]" />
            ) : (
              <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center">
                <Package className="w-16 h-16 text-gray-300" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  product.status
                )}`}
              >
                {getStatusLabel(product.status)}
              </span>
            </div>

            <p className="text-sm text-gray-500 mb-6 font-mono">
              {product.product_id}
            </p>

            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3">
                <Building2 className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Hersteller</div>
                  <div className="text-sm font-medium">{product.manufacturer}</div>
                </div>
              </div>
              {product.manufacture_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Herstellungsdatum</div>
                    <div className="text-sm font-medium">
                      {formatDate(product.manufacture_date)}
                    </div>
                  </div>
                </div>
              )}
              {product.dimensions && (
                <div className="flex items-center gap-3">
                  <Ruler className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-xs text-gray-500">Masse</div>
                    <div className="text-sm font-medium">{product.dimensions}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Tag className="w-4 h-4 text-gray-400" />
                <div>
                  <div className="text-xs text-gray-500">Kategorie</div>
                  <div className="text-sm font-medium">
                    {product.category?.name || "-"}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-6">
              <h2 className="font-semibold text-sm mb-2">Beschreibung</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">
                {product.description || "Keine Beschreibung vorhanden."}
              </p>
            </div>

            {product.manual_url && (
              <div className="mt-4 space-y-3">
                <a
                  href={product.manual_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  Bedienungsanleitung ansehen
                </a>
                <ManualQrCode url={product.manual_url} productName={product.name} size={96} />
              </div>
            )}

            <div className="mt-8">
              <Link href="/anfrage/" className="btn-primary">
                Zur Anfrage hinzufügen
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
