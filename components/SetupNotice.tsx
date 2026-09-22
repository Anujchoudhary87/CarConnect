import Link from "next/link";
import { isSupabaseConfigured } from "@/lib/env";

export function SetupNotice() {
  if (isSupabaseConfigured()) return null;

  return (
    <div className="border-b border-amber-300 bg-amber-50 px-4 py-3">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p>
          <strong>Setup zaroori hai:</strong> Supabase abhi connected nahi hai. Apni keys{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">.env.local</code> mein daalo aur{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5">supabase/schema.sql</code> ka SQL run karo.
        </p>
        <p>
          <Link href="/docs/setup" className="font-semibold text-amber-800 underline underline-offset-2">
            Supabase kaise connect karein →
          </Link>
        </p>
      </div>
    </div>
  );
}