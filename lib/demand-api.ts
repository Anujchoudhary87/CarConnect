import type { SupabaseClient } from "@supabase/supabase-js";
import type { DemandCluster } from "@/lib/types";

// Server-side helper used by both the dealer dashboard page and
// GET /api/dealer/demand. Reads aggregated (privacy-safe) clusters via the
// security definer function, then computes how many matching active vehicles
// currently exist in inventory for each cluster.
//
// NOTE: clusters are aggregated, so they carry no per-demand location; the
// count below mirrors the SQL hard-criteria matcher as closely as the cluster
// fields allow (location criteria cannot be re-applied to an aggregate).

type AnyClient = Pick<SupabaseClient, "rpc" | "from">;

export async function fetchDemandClusters(supabase: AnyClient): Promise<DemandCluster[]> {
  const { data, error } = await supabase.rpc("get_demand_clusters");
  if (error) throw new Error(error.message ?? "Demand load fail hua");
  const clusters = (data ?? []) as DemandCluster[];
  const out: DemandCluster[] = [];
  for (const c of clusters) {
    out.push({ ...c, matching_available: await countMatchingVehicles(supabase, c) });
  }
  return out;
}

export async function countMatchingVehicles(supabase: AnyClient, cluster: DemandCluster): Promise<number> {
  let q = supabase
    .from("vehicles")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");
  if (cluster.brand) q = q.ilike("brand", cluster.brand);
  if (cluster.model) q = q.ilike("model", `%${cluster.model}%`);
  if (cluster.fuel) q = q.ilike("fuel", cluster.fuel);
  if (cluster.min_year) q = q.gte("year", cluster.min_year);
  if (cluster.max_price != null) q = q.lte("price", cluster.max_price);
  const { count } = await q;
  return count ?? 0;
}

// Runs the dealer-side matching launch point after a vehicle is created or
// relisted as active. Errors are intentionally ignored by callers — matching
// is best-effort and must never fail the vehicle operation itself.
export async function runDemandMatching(supabase: AnyClient, vehicleId: string): Promise<number> {
  const { data, error } = await supabase.rpc("run_demand_matching", { p_vehicle_id: vehicleId });
  if (error) throw new Error(error.message ?? "Demand matching fail hua");
  return (data as number) ?? 0;
}