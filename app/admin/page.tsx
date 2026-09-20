import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { AdminPanel } from "./AdminPanel";

export const metadata: Metadata = { title: "Admin Panel" };

export default async function AdminPage() {
  await requireAdmin();
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="mb-1 text-2xl font-extrabold text-stone-900">🛡️ Admin Panel</h1>
      <p className="mb-6 text-sm text-stone-500">Dealers verify karo, cars manage karo, aur platform manage karo.</p>
      <AdminPanel />
    </div>
  );
}