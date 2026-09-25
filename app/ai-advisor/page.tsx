import type { Metadata } from "next";
import { AiAssistant } from "@/components/AiAssistant";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Car Advisor | Car Connect",
  description:
    "Conversational AI advisor — tell us your budget, family needs, fuel preference, and get personalised used-car recommendations from real CarConnect dealer inventory.",
};

export default function AiAdvisorPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      {/* Page header */}
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <nav className="mb-3 flex items-center gap-2 text-xs text-stone-500">
            <Link href="/" className="hover:text-brand">
              Home
            </Link>
            <span aria-hidden>/</span>
            <span className="font-medium text-stone-700">AI Car Advisor</span>
          </nav>

          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex size-9 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm">
                  🤖
                </span>
                <div>
                  <h1 className="text-xl font-extrabold tracking-tight text-stone-900 sm:text-2xl">
                    AI Car Advisor
                  </h1>
                  <p className="text-xs text-stone-500">
                    Powered by real CarConnect inventory
                  </p>
                </div>
              </div>
              <p className="mt-3 max-w-xl text-sm text-stone-600">
                Apni zaroorat batao — budget, family size, fuel preference,
                city ya highway use. Advisor ek-ek sawal poochta hai, already batayi
                cheezein dobara nahi poochh­ega, aur sirf real available cars recommend karta hai.
              </p>
            </div>

            <Link
              href="/marketplace"
              className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-4 py-2 text-sm font-semibold text-stone-700 shadow-sm transition-colors hover:border-brand hover:text-brand"
            >
              🔍 Browse All Cars
            </Link>
          </div>

          {/* Feature chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {[
              "💬 Conversational",
              "🎯 One question at a time",
              "📦 Real inventory only",
              "🔔 Notify Me on no-match",
              "⚖️ Car comparisons",
            ].map((chip) => (
              <span
                key={chip}
                className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        <AiAssistant />
      </div>
    </div>
  );
}
