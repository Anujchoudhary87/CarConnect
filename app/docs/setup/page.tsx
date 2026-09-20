import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Setup Guide" };

const steps = [
  {
    title: "1. Supabase project banao",
    body: (
      <p>
        <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-brand-dark underline">supabase.com</a>{" "}
        pe free project banao aur SQL Editor kholo.
      </p>
    ),
  },
  {
    title: "2. Database schema chalao",
    body: (
      <p>
        Repo ke <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">supabase/schema.sql</code> ka poora
        content SQL Editor mein paste karke <strong>Run</strong> dabao. Isse saare tables, RLS policies, storage aur
        admin functions ban jayenge.
      </p>
    ),
  },
  {
    title: "3. Admin account banao",
    body: (
      <p>
        Pehle kisi email se signup karo (Ur app se). Phir schema.sql ke sabse end wala UPDATE command apne user
        ke <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">id</code> ke saath bharo aur SQL Editor mein
        chalao — isse wo user admin ban jaayega.
      </p>
    ),
  },
  {
    title: "4. Storage bucket",
    body: (
      <p>
        Schema mein <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">vehicle-images</code> bucket ka
        policy SQL bhi included hai; agar bucket nahi bana, to Storage → New bucket → name{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">vehicle-images</code> banao.
      </p>
    ),
  },
  {
    title: "5. Environment variables",
    body: (
      <p>
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">.env.local.example</code> ko copy karke{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">.env.local</code> banao aur{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_URL</code> (Settings →
        API) aur <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
        bharo.
      </p>
    ),
  },
  {
    title: "6. Chalao",
    body: (
      <p>
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">npm install</code> phir{" "}
        <code className="rounded bg-stone-100 px-1.5 py-0.5 text-xs">npm run dev</code> — phir{" "}
        <Link href="/marketplace" className="text-brand-dark underline">Gaadi Kharido</Link>{" "}
        aur <Link href="/sell" className="text-brand-dark underline">Apni Gaadi Becho</Link> kholo.
      </p>
    ),
  },
];

export default function SetupDocPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-stone-900">Setup Guide 🔧</h1>
      <p className="mt-1 text-sm text-stone-500">Car Connect ko chalaane ke liye ye 6 steps follow karo.</p>
      <ol className="mt-6 space-y-4">
        {steps.map((s) => (
          <li key={s.title} className="rounded-xl border border-stone-200 bg-white p-4 shadow-sm">
            <p className="font-semibold text-stone-900">{s.title}</p>
            <div className="mt-1 text-sm text-stone-600">{s.body}</div>
          </li>
        ))}
      </ol>
      <div className="mt-6 rounded-xl bg-brand-light p-4 text-sm text-brand-dark">
        💡 Repo mein <code className="rounded bg-white/60 px-1.5 py-0.5 text-xs">scripts/seed.mjs</code> bhi hai —
        demo data (users, dealers, cars) seed karne ke liye service role key se chala sakte ho.
      </div>
    </div>
  );
}