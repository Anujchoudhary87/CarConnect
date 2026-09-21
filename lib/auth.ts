import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/env";
import type { UserProfile, Dealer } from "@/lib/types";

export async function getCurrentUser() {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

export async function getProfile(): Promise<UserProfile | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();
  return (data as UserProfile) ?? null;
}

export async function getDealerByUser(userId: string): Promise<Dealer | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("dealers")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as Dealer) ?? null;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth/login");
  return user;
}

export async function requireDealer() {
  const user = await requireAuth();
  const profile = await getProfile();
  const dealer = profile?.role === "dealer" ? await getDealerByUser(user.id) : null;
  if (!dealer) redirect("/become-dealer");
  return { user, profile: profile!, dealer };
}

export async function requireAdmin() {
  const user = await requireAuth();
  const profile = await getProfile();
  if (!profile?.is_admin) return null;
  return { user, profile };
}

export async function requireAdminApi() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (!profile?.is_admin) return null;
  return { user, profile: profile as import("@/lib/types").UserProfile, supabase };
}