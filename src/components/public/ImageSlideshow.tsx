"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ImageSlideshowProps {
  images: string[];
  alt: string;
  aspectRatio?: string;
}

export function ImageSlideshow({ images, alt, aspectRatio = "aspect-square" }: ImageSlideshowProps) {
  const [current, setCurrent] = useState(0);

  if (!images || images.length === 0) return null;

  const prev = () => setCurrent((c) => (c === 0 ? images.length - 1 : c - 1));
  const next = () => setCurrent((c) => (c === images.length - 1 ? 0 : c + 1));

  return (
    <div className={`relative bg-gray-100 rounded-xl overflow-hidden ${aspectRatio} group p-6`}>
      <img
        src={images[current]}
        alt={`${alt} - Bild ${current + 1}`}
        className="w-full h-full object-contain transition-transform duration-500 ease-out group-hover:scale-110"
        loading="lazy"
        decoding="async"
      />

      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-sm transition-colors"
            aria-label="Vorheriges Bild"
          >
            <ChevronLeft className="w-5 h-5 text-gray-700" />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-sm transition-colors"
            aria-label="Nächstes Bild"
          >
            <ChevronRight className="w-5 h-5 text-gray-700" />
          </button>

          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? "bg-white" : "bg-white/50"
                }`}
                aria-label={`Bild ${i + 1}`}
              />
            ))}
          </div>

          <div className="absolute top-3 right-3 px-2 py-0.5 bg-black/50 text-white text-xs rounded-full pointer-events-none">
            {current + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
}
