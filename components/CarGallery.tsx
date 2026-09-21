"use client";

import { useState } from "react";

const FALLBACK_RATIO = 16 / 10;
const MIN_RATIO = 0.75;
const MAX_RATIO = 2.2;

function naturalRatio(w: number, h: number) {
  const r = h > 0 ? w / h : FALLBACK_RATIO;
  return Math.min(Math.max(r, MIN_RATIO), MAX_RATIO);
}

export function CarGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState<number>(FALLBACK_RATIO);
  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-6xl">
        🚗
      </div>
    );
  }

  const mainUrl = images[index];

  return (
    <div>
      <div
        style={{ aspectRatio: ratio }}
        className="w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={mainUrl}
          src={mainUrl}
          alt={`${title} photo ${index + 1}`}
          className="h-full w-full object-contain"
          onLoad={(e) => setRatio(naturalRatio(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))}
        />
      </div>
      {images.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {images.map((url, i) => (
            <button
              key={url}
              onClick={() => setIndex(i)}
              className={`h-16 w-24 shrink-0 overflow-hidden rounded-lg border-2 bg-stone-100 transition-colors ${
                i === index ? "border-brand" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-full w-full object-contain" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}