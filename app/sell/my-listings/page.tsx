import type { Metadata } from "next";
import { MyListings } from "./MyListings";

export const metadata: Metadata = { title: "My Listings" };

export default function MyListingsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-stone-900">My Listings</h1>
      <p className="mt-1 text-sm text-stone-500">
        Yahan aapko dealers ke offers milenge. Offer accept karne se pehle sab dekho.
      </p>
      <div className="mt-6">
        <MyListings />
      </div>
    </div>
  );
}