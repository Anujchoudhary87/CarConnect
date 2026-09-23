"use client";

import { useState } from "react";

const FALLBACK_RATIO = 16 / 10;
const MIN_RATIO = 0.75;
const MAX_RATIO = 2.2;
const SWIPE_THRESHOLD = 40;

function naturalRatio(w: number, h: number) {
  const r = h > 0 ? w / h : FALLBACK_RATIO;
  return Math.min(Math.max(r, MIN_RATIO), MAX_RATIO);
}

export function CarGallery({ images, title }: { images: string[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState<number>(FALLBACK_RATIO);
  const [touchX, setTouchX] = useState<number | null>(null);

  const urls = [...new Set(images)];

  if (urls.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-xl border border-stone-200 bg-stone-100 text-6xl">
        🚗
      </div>
    );
  }

  const mainUrl = urls[index];

  const go = (dir: number) => setIndex((i) => (i + dir + urls.length) % urls.length);
  const prev = () => go(-1);
  const next = () => go(1);

  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setTouchX(e.touches[0].clientX);
  };
  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > SWIPE_THRESHOLD) (dx < 0 ? next : prev)();
    setTouchX(null);
  };
  const onTouchCancel = () => setTouchX(null);

  const gestures = urls.length > 1 ? { onTouchStart, onTouchEnd, onTouchCancel } : {};

  return (
    <div>
      <div
        {...gestures}
        style={{ aspectRatio: ratio, touchAction: "pan-y" }}
        className="group relative w-full overflow-hidden rounded-xl border border-stone-200 bg-stone-100"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={mainUrl}
          src={mainUrl}
          alt={`${title} photo ${index + 1}`}
          className="h-full w-full object-contain"
          onLoad={(e) => setRatio(naturalRatio(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight))}
        />
        {urls.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-stone-700 shadow-md transition-colors hover:bg-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-2 text-stone-700 shadow-md transition-colors hover:bg-white"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="size-5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
            <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/50 px-2 py-0.5 text-xs font-semibold text-white">
              {index + 1} / {urls.length}
            </span>
          </>
        )}
      </div>
      {urls.length > 1 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {urls.map((url, i) => (
            <button
              key={url}
              type="button"
              aria-label={`Open ${title} photo ${i + 1}`}
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