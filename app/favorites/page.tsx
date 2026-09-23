import type { Metadata } from "next";
import { FavoritesList } from "./FavoritesList";

export const metadata: Metadata = { title: "Saved Cars" };

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-extrabold text-stone-900">♥️ Saved Cars</h1>
      <p className="mb-6 text-sm text-stone-500">Jo gaadiyan aapne save ki hain — wapas dekhne ke liye.</p>
      <FavoritesList />
    </div>
  );
}