import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SERVICE_ROLE_KEY } from "@/lib/env";

let cached: SupabaseClient | null | undefined;

// Server-only client. Bypasses RLS by design (service-role key), so it must only
// ever be used inside API routes AFTER requireAdminApi() has verified the caller
// is an admin. Used purely to read things RLS cannot: auth.users emails and
// favorites counts (no admin-friendly RLS policy exists for the latter).
export function createServiceClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  if (cached !== undefined) return cached;
  cached = createSupabaseClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}

export async function authUserEmails(): Promise<Map<string, string>> {
  const svc = createServiceClient();
  if (!svc) return new Map();
  try {
    const { data } = await svc.from("auth.users").select("id, email");
    return new Map((data ?? []).map((u) => [u.id as string, (u.email as string) ?? ""]));
  } catch {
    return new Map();
  }
}