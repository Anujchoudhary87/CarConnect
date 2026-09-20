import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { data } = await supabase
    .from("dealer_verification")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  return Response.json({ verification: data ?? null });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id_proof_path, business_proof_path, notes } = await request.json();

  const { data: dealer } = await supabase
    .from("dealers")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!dealer) {
    return Response.json({ error: "Create your dealer profile first" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("dealer_verification")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  let result;
  if (existing) {
    result = await supabase
      .from("dealer_verification")
      .update({
        dealer_id: dealer.id,
        id_proof_path: id_proof_path ?? "",
        business_proof_path: business_proof_path ?? "",
        notes: notes ?? "",
      })
      .eq("id", existing.id)
      .select("*")
      .single();
  } else {
    result = await supabase
      .from("dealer_verification")
      .insert([
        {
          dealer_id: dealer.id,
          user_id: user.id,
          id_proof_path: id_proof_path ?? "",
          business_proof_path: business_proof_path ?? "",
          notes: notes ?? "",
        },
      ])
      .select("*")
      .single();
  }

  if (result.error) {
    return Response.json({ error: result.error.message }, { status: 500 });
  }
  return Response.json({ verification: result.data });
}