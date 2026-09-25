// Anonymous, device-local "Recently Viewed" history.
//
// No login and no new table: the list lives in localStorage and is only used to
// (a) show the customer the cars they just looked at and (b) remember the price
// they last saw, so a genuine price reduction can be surfaced on the car page
// and in the homepage rail. Sold / deleted cars are filtered by intersecting the
// stored ids with live active inventory before rendering.

export interface RecentVehicleView {
  id: string;
  brand: string;
  model: string;
  variant?: string | null;
  city?: string | null;
  image?: string | null;
  /** Highest price the customer has seen for this car — the drop baseline. */
  price: number;
  viewedAt: string;
}

const KEY = "cc_recently_viewed_v1";
export const RECENTLY_VIEWED_EVENT = "cc:recently-viewed";

/** Stored (and offered to other components) — the rail renders at most 5. */
export const RECENTLY_VIEWED_LIMIT = 6;
export const RECENTLY_VIEWED_SHOWN = 5;

const EMPTY: RecentVehicleView[] = [];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function parseList(raw: string | null): RecentVehicleView[] {
  if (!raw) return EMPTY;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed
      .filter(
        (v): v is RecentVehicleView =>
          !!v &&
          typeof v === "object" &&
          typeof (v as RecentVehicleView).id === "string" &&
          Number.isFinite(Number((v as RecentVehicleView).price)),
      )
      .map((v) => ({ ...v, price: Number(v.price) }))
      .slice(0, RECENTLY_VIEWED_LIMIT);
  } catch {
    return EMPTY;
  }
}

// Cached by raw string so getSnapshot stays referentially stable between
// renders (required by useSyncExternalStore).
let cacheRaw: string | null = null;
let cacheList: RecentVehicleView[] = EMPTY;

export function getRecentlyViewedSnapshot(): RecentVehicleView[] {
  if (!isBrowser()) return EMPTY;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    cacheList = parseList(raw);
  }
  return cacheList;
}

export function getRecentlyViewedServerSnapshot(): RecentVehicleView[] {
  return EMPTY;
}

export function subscribeRecentlyViewed(cb: () => void): () => void {
  if (!isBrowser()) return () => {};
  window.addEventListener(RECENTLY_VIEWED_EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(RECENTLY_VIEWED_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function readRecentlyViewed(): RecentVehicleView[] {
  return getRecentlyViewedSnapshot();
}

function write(list: RecentVehicleView[]) {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    // storage unavailable (private mode) — the list just won't persist
  }
  window.dispatchEvent(new CustomEvent<RecentVehicleView[]>(RECENTLY_VIEWED_EVENT, { detail: list }));
}

/**
 * Records a car view. The stored price is the *highest* price seen so a drop
 * stays visible until the dealer raises the price back above it.
 */
export function recordVehicleView(view: {
  id: string;
  brand: string;
  model: string;
  variant?: string | null;
  city?: string | null;
  image?: string | null;
  price: number;
}): void {
  if (!isBrowser() || !view.id) return;
  const price = Number(view.price);
  if (!Number.isFinite(price) || price <= 0) return;

  const current = getRecentlyViewedSnapshot();
  const previous = current.find((v) => v.id === view.id);
  const seenPrice = previous && previous.price > price ? previous.price : price;

  write(
    [
      {
        id: view.id,
        brand: view.brand,
        model: view.model,
        variant: view.variant ?? null,
        city: view.city ?? null,
        image: view.image ?? null,
        price: seenPrice,
        viewedAt: new Date().toISOString(),
      },
      ...current.filter((v) => v.id !== view.id),
    ].slice(0, RECENTLY_VIEWED_LIMIT),
  );
}

export function removeVehicleView(id: string): void {
  const current = getRecentlyViewedSnapshot();
  if (!current.some((v) => v.id === id)) return;
  write(current.filter((v) => v.id !== id));
}

export function clearRecentlyViewed(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent<RecentVehicleView[]>(RECENTLY_VIEWED_EVENT, { detail: [] }));
}

export function getSeenPrice(id: string): number | null {
  const found = getRecentlyViewedSnapshot().find((v) => v.id === id);
  return found ? found.price : null;
}

/** True when the live price is genuinely lower than the price last seen. */
export function isPriceDrop(seenPrice: number | null | undefined, currentPrice: number): boolean {
  if (seenPrice == null) return false;
  const current = Number(currentPrice);
  return Number.isFinite(current) && current > 0 && seenPrice > current;
}

/**
 * Primitive snapshot for useSyncExternalStore: "from:to" while a drop is live,
 * "" otherwise. Stable for unchanged storage, so no render loops.
 */
export function priceDropSnapshot(id: string, currentPrice: number): string {
  const seen = getSeenPrice(id);
  return isPriceDrop(seen, currentPrice) ? `${Number(seen)}:${Number(currentPrice)}` : "";
}
