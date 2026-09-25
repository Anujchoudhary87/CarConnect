"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

const GAP = 16;

// Fractional per-view values intentionally expose a partial next card so users
// immediately understand more cars are available:
//   mobile  ~1 full card + partial, tablet ~2-3 + partial, desktop ~4 + partial.
const DEFAULT_BREAKPOINTS = [
  { max: 639, perView: 1.15 },
  { max: 1023, perView: 2.4 },
  { max: 1279, perView: 3.4 },
  { max: Number.POSITIVE_INFINITY, perView: 4.25 },
];

export interface CarouselColumn {
  id: string;
  node: React.ReactNode;
}

export function loopPerView(
  width: number,
  breakpoints: Array<{ max: number; perView: number }> = DEFAULT_BREAKPOINTS
): number {
  if (width <= 0) return 1;
  const hit = breakpoints.find((bp) => width <= bp.max);
  return hit ? hit.perView : breakpoints[breakpoints.length - 1].perView;
}

function reducedMotionSnapshot(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function subscribeReducedMotion(cb: () => void): () => void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

const NO_REDUCED_SNAPSHOT = (): boolean => false;

/**
 * Seamless infinite looping rail of equal-width cards.
 *
 * The rail layout is [ prefix: last perView ] [ originals ] [ suffix: first
 * perView ]. Movement nudges the leftmost-window index; when the index walks
 * into the cloned edge the visible cards are identical to the far edge of the
 * originals, so the index snaps back with a single disabled-transition frame -
 * no visible jump. Clones are presentational only (never exported).
 */
export function Carousel({
  columns,
  ariaLabel,
  breakpoints,
  autoMs = 1000,
  paused = false,
}: {
  columns: CarouselColumn[];
  ariaLabel: string;
  breakpoints?: Array<{ max: number; perView: number }>;
  autoMs?: number;
  paused?: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [vpWidth, setVpWidth] = useState(0);

  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    reducedMotionSnapshot,
    NO_REDUCED_SNAPSHOT
  );

  const count = columns.length;
  const perView = loopPerView(vpWidth, breakpoints);
  const loop = count > perView;
  // Clone rail with an integer base. The viewport still reveals a fractional
  // "partial" next card (perView rounds up to a whole card count for clones),
  // but positions themselves advance by exactly one card per step.
  const clone = Math.max(Math.ceil(perView), Math.min(count, 2));
  const base = loop ? clone : 0;
  const maxPos = loop ? base + count : Math.max(count - 1, 0);
  const itemWidth = vpWidth > 0 ? (vpWidth - GAP * (perView - 1)) / perView : 0;
  const step = itemWidth + GAP;
  const trackLen = count + 2 * clone;
  const maxLeft = (trackLen - perView) * step;

  const [pos, setPos] = useState(base);
  const [animate, setAnimate] = useState(true);
  const [interacting, setInteracting] = useState(false);

  const [prevPerView, setPrevPerView] = useState(perView);
  if (prevPerView !== perView) {
    setPrevPerView(perView);
    setPos(base);
  }

  const track = useMemo(() => {
    const out: Array<{ key: string; node: React.ReactNode; width: number }> =
      [];
    if (!loop) {
      for (const c of columns) {
        out.push({ key: c.id, node: c.node, width: itemWidth });
      }
      return out;
    }
    const push = (list: CarouselColumn[], idPrefix: string) => {
      for (const c of list) {
        out.push({ key: `${idPrefix}:${c.id}`, node: c.node, width: itemWidth });
      }
    };
    push(columns.slice(Math.max(count - clone, 0)), "pre");
    for (const c of columns) {
      out.push({ key: c.id, node: c.node, width: itemWidth });
    }
    push(columns.slice(0, clone), "post");
    return out;
  }, [columns, loop, clone, itemWidth, count]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const el = viewportRef.current;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? el.clientWidth;
      setVpWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const next = useCallback(() => {
    if (loop) {
      if (pos >= maxPos) {
        // Seamless wrap: the window at index maxPos shows the same cards as
        // index base (originals replicated by the suffix clones), so a single
        // non-animated frame hides the jump.
        setAnimate(false);
        setPos(base);
        window.requestAnimationFrame(() => setAnimate(true));
      } else {
        setPos(pos + 1);
      }
    } else {
      setPos(Math.min(pos + 1, maxPos));
    }
  }, [loop, pos, maxPos, base]);

  const prev = useCallback(() => {
    if (loop) {
      if (pos <= base) {
        setAnimate(false);
        setPos(maxPos);
        window.requestAnimationFrame(() => setAnimate(true));
      } else {
        setPos(pos - 1);
      }
    } else {
      setPos(Math.max(pos - 1, 0));
    }
  }, [loop, pos, maxPos, base]);

  const nextRef = useRef(next);
  const prevRef = useRef(prev);

  useEffect(() => {
    nextRef.current = next;
    prevRef.current = prev;
  });

  useEffect(() => {
    if (reduced || interacting || paused || !loop || count === 0) return;
    const id = window.setInterval(() => nextRef.current(), autoMs);
    return () => window.clearInterval(id);
  }, [reduced, interacting, paused, loop, autoMs, count]);

  const left = Math.min(pos * step, maxLeft);

  const onKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" && loop) {
      e.preventDefault();
      nextRef.current();
    } else if (e.key === "ArrowLeft" && loop) {
      e.preventDefault();
      prevRef.current();
    }
  }, [loop]);

  const onTouchStart = (e: React.TouchEvent) => {
    if (reduced || !loop || e.touches.length > 1) return;
    const el = viewportRef.current;
    if (!el) return;
    setInteracting(true);
    const startX = e.touches[0].clientX;
    const baseLeft = left;
    let currentX = startX;
    el.style.transition = "none";
    const onMove = (ev: TouchEvent) => {
      currentX = ev.touches[0].clientX;
      el.style.transform = `translate3d(${baseLeft - (startX - currentX)}px, 0, 0)`;
    };
    const onEnd = () => {
      el.style.transition = "";
      el.style.transform = "";
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      const dx = startX - currentX;
      if (Math.abs(dx) > 48) {
        if (dx > 0) nextRef.current();
        else prevRef.current();
      }
      setInteracting(false);
    };
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
  };

  const activeIdx = ((pos - base) % count + count) % count;

  return (
    <div
      className="group/carousel relative rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      tabIndex={loop ? 0 : undefined}
      onKeyDown={onKey}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocus={() => setInteracting(true)}
      onBlur={() => setInteracting(false)}
    >
      <div
        ref={viewportRef}
        className="overflow-hidden"
        style={{ touchAction: "pan-y" }}
        onTouchStart={onTouchStart}
      >
        <div
          className="flex"
          style={{
            width: `${trackLen * itemWidth + (trackLen - 1) * GAP}px`,
            transform: `translate3d(${-left}px, 0, 0)`,
            transition:
              animate && !reduced
                ? "transform 420ms cubic-bezier(0.22, 1, 0.36, 1)"
                : "none",
            willChange: "transform",
          }}
        >
          {track.map((item, i) => (
            <div
              key={item.key}
              className="h-full"
              style={{
                width: `${itemWidth}px`,
                marginRight: `${i === track.length - 1 ? 0 : GAP}px`,
                flexShrink: 0,
              }}
            >
              {item.node}
            </div>
          ))}
        </div>
      </div>

      {loop && (
        <>
          <button
            type="button"
            onClick={() => prevRef.current()}
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-stone-200/70 bg-white/90 p-2.5 text-stone-700 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-brand disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10 3 5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => nextRef.current()}
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-stone-200/70 bg-white/90 p-2.5 text-stone-700 shadow-md backdrop-blur transition-colors hover:bg-white hover:text-brand disabled:opacity-40"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </>
      )}

      {loop && count > 0 && (
        <div className="mt-3 flex h-2 items-center justify-center gap-1.5">
          {Array.from({ length: Math.min(count, 8) }).map((_, i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: activeIdx % Math.min(count, 8) === i ? "0.8rem" : "0.3rem",
                background:
                  activeIdx % Math.min(count, 8) === i
                    ? "#c2185b"
                    : "rgba(120,110,110,0.35)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
