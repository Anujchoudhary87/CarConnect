import type { PosterImageLike } from "./types";

const POSTER_PATH_PREFIX = "/posters/";

export function isPosterImage(img: PosterImageLike): boolean {
  if (img.kind === "poster") return true;
  return img.url.includes(POSTER_PATH_PREFIX);
}

export function sortVehicleImages<T extends PosterImageLike>(images: T[]): T[] {
  const originals = images
    .filter((i) => !isPosterImage(i))
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const posters = images
    .filter(isPosterImage)
    .slice()
    .sort((a, b) => {
      const d = String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""));
      return d !== 0 ? d : (a.position ?? 0) - (b.position ?? 0);
    });
  return [...posters, ...originals];
}