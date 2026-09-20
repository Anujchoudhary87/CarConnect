import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_URL, SUPABASE_ANON_KEY, isSupabaseConfigured } from "@/lib/env";

const NOT_CONFIGURED = "Supabase is not configured.";

// Uses the SDK's default (loosened `any`-based) Database typing, so route handlers
// keep the same flexible result typing as a real client.
type StubClient = SupabaseClient;

function createUnconfiguredClient(): StubClient {
  const authProxy = {
    getUser: async () => ({ data: { user: null }, error: null }),
    getSession: async () => ({ data: { session: null }, error: null }),
    signOut: async () => ({ error: null }),
    signInWithPassword: async () => ({
      data: { session: null, user: null },
      error: { name: "AuthApiError", message: NOT_CONFIGURED },
    }),
    signUp: async () => ({
      data: { session: null, user: null },
      error: { name: "AuthApiError", message: NOT_CONFIGURED },
    }),
  };

  // A chainable, awaitable query builder that resolves to an empty result with an
  // error describing the missing configuration. This lets every route/page keep its
  // normal error-handling path instead of crashing on client construction.
  const builder = () =>
    new Proxy<Record<string, unknown>>(
      {},
      {
        get(_target, prop) {
          if (prop === "then") {
            return (resolve: (v: { data: null; error: { message: string } }) => void) =>
              resolve({ data: null, error: { message: NOT_CONFIGURED } });
          }
          if (prop === "toJSON") return undefined;
          return () => builder();
        },
      },
    );

  const client = new Proxy<Record<string, unknown>>(
    {},
    {
      get(_target, prop) {
        if (prop === "then") return undefined;
        if (prop === "auth") return authProxy;
        if (prop === "from") return () => builder();
        const fallback = async () => ({ data: null, error: { message: NOT_CONFIGURED } });
        return fallback;
      },
    },
  );

  return client as unknown as StubClient;
}

export async function createClient(): Promise<StubClient> {
  if (!isSupabaseConfigured()) return createUnconfiguredClient();

  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — safe to ignore when setting is not allowed.
        }
      },
    },
  });
}