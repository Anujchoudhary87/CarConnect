import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { AdminPortal } from "./AdminPortal";

export const metadata: Metadata = { title: "Admin Portal" };

export default async function AdminPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <span className="text-5xl">🔒</span>
        <h1 className="mt-4 text-xl font-extrabold text-stone-900">Access Denied</h1>
        <p className="mt-2 text-sm text-stone-500">
          Yah section sirf Car Connect admin users ke liye hai. Aapke paas admin access nahi hai.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-brand px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-dark"
        >
          Home jaayein
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-5 flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold text-stone-900">🛡️ Admin Portal</h1>
        <p className="text-sm text-stone-500">
          Pura platform yahan se manage karo — dealers, customers, vehicles, sell requests aur offers.
        </p>
      </div>
      <AdminPortal />
    </div>
  );
}