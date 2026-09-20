import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <p className="text-xs font-bold uppercase tracking-wide text-brand">Legal</p>
      <h1 className="mt-1 text-3xl font-extrabold text-stone-900">Privacy Policy</h1>
      <p className="mt-2 text-sm text-stone-400">Last updated: September 2026</p>

      <div className="mt-8 space-y-6 text-sm leading-relaxed text-stone-600">
        <div>
          <h2 className="text-base font-bold text-stone-900">1. What we collect</h2>
          <p className="mt-1">
            Account details (name, email, phone) you provide at signup, plus information you add when
            listing a car or contacting a dealer — such as your car&apos;s details, photos and contact
            information. Location (city or GPS) is used only to show nearby cars.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">2. How we use it</h2>
          <p className="mt-1">
            To authenticate you, show relevant listings, connect buyers with dealers, process sell-your-car
            listings and offers, and improve our AI recommendations. We do not sell your personal data.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">3. What we don&apos;t fabricate</h2>
          <p className="mt-1">
            Verification badges, prices, vehicle details and dealer information shown on the platform
            come from the database only. Where information is missing, the app says it is unavailable
            rather than guessing.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">4. Storage & security</h2>
          <p className="mt-1">
            Data is stored in Supabase (PostgreSQL) with row-level security so users can only see and
            manage their own records. Passwords are handled by Supabase Auth — we never store them.
          </p>
        </div>
        <div>
          <h2 className="text-base font-bold text-stone-900">5. Your rights</h2>
          <p className="mt-1">
            You can request a copy or deletion of your data at any time by contacting{" "}
            <span className="font-medium text-stone-800">support@carconnect.in</span>.
          </p>
        </div>
      </div>
    </div>
  );
}