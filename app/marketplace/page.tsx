import type { Metadata } from "next";
import { Marketplace } from "@/components/Marketplace";

export const metadata: Metadata = { title: "Buy Used Cars" };

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  const sp = await searchParams;
  return <Marketplace initial={sp} />;
}