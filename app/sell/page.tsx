import type { Metadata } from "next";
import Link from "next/link";
import { SellForm } from "@/components/SellForm";

export const metadata: Metadata = { title: "Sell My Car" };

export default function SellPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-extrabold text-stone-900">Apni Gaadi Becho 💸</h1>
      <p className="mt-1 text-sm text-stone-500">
        2 minute mein details bharo, photos add karo. Paas ke <strong>verified dealers</strong> aapko
        best offer bhejenge — free mein.
      </p>
      <p className="mt-2 text-xs text-stone-400">
        Pehle se listing hai?{" "}
        <Link href="/sell/my-listings" className="font-semibold text-brand hover:underline">
          My sell listings dekho →
        </Link>
      </p>
      <div className="mt-6">
        <SellForm />
      </div>
    </div>
  );
}