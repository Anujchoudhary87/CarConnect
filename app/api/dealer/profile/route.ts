import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface DealerInput {
  dealership_name?: string;
  owner_name?: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  business_type?: string;
  gstin?: string;
  city?: string;
  state?: string;
  address?: string;
  lat?: number | null;
  lng?: number | null;
  bio?: string;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await request.json()) as DealerInput;
  const dealership_name = (body.dealership_name ?? "").trim();
  if (!dealership_name) {
    return Response.json({ error: "Dealership name is required" }, { status: 400 });
  }

  const profile = { ...body, dealership_name };

  // Check if profile already exists (upsert).
  const { data: existing } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("dealers")
      .update({ ...profile, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
  } else {
    result = await supabase
      .from("dealers")
      .insert([{ ...profile, user_id: user.id }])
      .select("*")
      .single();
  }

  if (result.error) {
    return Response.json({ error: result.error.message }, { status: 500 });
  }
  return Response.json({ dealer: result.data });
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data } = await supabase
    .from("dealers")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return Response.json({ dealer: data ?? null });
}