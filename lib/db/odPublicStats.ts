import { isSupabaseConfigured, supabase } from "../supabase";

export type OdPublicLandingStats = {
  shopCount: number;
  memberCount: number;
};

/**
 * Aggregate counts for marketing (security definer RPC; callable by anon).
 * Returns null if Supabase is not configured, RPC is missing, or the call fails.
 */
export async function fetchOdPublicLandingStats(): Promise<OdPublicLandingStats | null> {
  if (!isSupabaseConfigured) return null;

  const { data, error } = await supabase.rpc("get_od_public_landing_stats");

  if (error || data == null || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const row = data as Record<string, unknown>;
  const shop = Number(row.shop_count);
  const member = Number(row.member_count);
  if (!Number.isFinite(shop) || !Number.isFinite(member)) {
    return null;
  }

  return { shopCount: Math.max(0, shop), memberCount: Math.max(0, member) };
}
