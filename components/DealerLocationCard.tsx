import { addressFull } from "@/lib/location";
import { googleMapsUrl } from "@/lib/google-maps";

/**
 * The single location UI on a listing: the dealer's saved office address plus a
 * Google Maps link built from the exact stored pin. This replaces the embedded
 * map on the car detail page, so a customer sees one clear, compact block that
 * loads no map library and no tiles.
 */
export function DealerLocationCard({
  dealer,
  className,
}: {
  dealer: {
    dealership_name?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    lat?: number | null;
    lng?: number | null;
  };
  className?: string;
}) {
  const address = addressFull(dealer);
  const mapsUrl = googleMapsUrl(dealer.lat, dealer.lng);
  const name = (dealer.dealership_name ?? "").trim();
  if (!name && !address && !mapsUrl) return null;

  return (
    <div
      className={
        className ?? "mt-4 rounded-xl border border-stone-200 bg-white p-4"
      }
    >
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
        <span aria-hidden>📍</span>
        Dealer Location
      </p>
      {name && <p className="mt-2 text-sm font-bold text-stone-900">{name}</p>}
      {address && (
        <p className="mt-1 break-words text-sm leading-relaxed text-stone-600">{address}</p>
      )}
      {mapsUrl ? (
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:w-auto sm:px-5"
        >
          <span aria-hidden>🗺</span>
          Open in Google Maps
        </a>
      ) : (
        <p className="mt-2 text-[11px] text-stone-400">
          Dealer ne exact office pin abhi share nahi kiya.
        </p>
      )}
    </div>
  );
}
