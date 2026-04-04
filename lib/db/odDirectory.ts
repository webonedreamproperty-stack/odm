import { supabase } from '../supabase';

export type OdDirectoryService = {
  id: string;
  name: string;
  description: string;
};

export type OdDirectoryShop = {
  owner_id: string;
  business_name: string;
  slug: string;
  business_category: string | null;
  discount_summary: string | null;
  area: string | null;
  maps_url: string | null;
  /** Vendor-picked listing coordinates when saved from Settings (optional). */
  listing_lat: number | null;
  listing_lng: number | null;
  services: OdDirectoryService[] | null;
};

export async function fetchOdMemberDirectory(): Promise<
  | { ok: true; shops: OdDirectoryShop[] }
  | { ok: false; error: 'not_authenticated' | 'membership_not_active' | 'rpc' | 'invalid'; message?: string }
> {
  const { data, error } = await supabase.rpc('get_od_member_directory');

  if (error) {
    return { ok: false, error: 'rpc', message: error.message };
  }

  if (data === null || data === undefined) {
    return { ok: false, error: 'invalid' };
  }

  if (typeof data === 'object' && !Array.isArray(data) && 'error' in data) {
    const err = (data as { error: string }).error;
    if (err === 'not_authenticated') return { ok: false, error: 'not_authenticated' };
    if (err === 'membership_not_active') return { ok: false, error: 'membership_not_active' };
    return { ok: false, error: 'invalid', message: err };
  }

  if (!Array.isArray(data)) {
    return { ok: false, error: 'invalid' };
  }

  const shops: OdDirectoryShop[] = data.map((row: Record<string, unknown>) => ({
    owner_id: String(row.owner_id ?? ''),
    business_name: String(row.business_name ?? ''),
    slug: String(row.slug ?? ''),
    business_category: row.business_category != null ? String(row.business_category) : null,
    discount_summary: row.discount_summary != null ? String(row.discount_summary) : null,
    area: row.area != null ? String(row.area) : null,
    maps_url: row.maps_url != null ? String(row.maps_url) : null,
    listing_lat: (() => {
      const n = row.listing_lat != null && row.listing_lat !== "" ? Number(row.listing_lat) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),
    listing_lng: (() => {
      const n = row.listing_lng != null && row.listing_lng !== "" ? Number(row.listing_lng) : NaN;
      return Number.isFinite(n) ? n : null;
    })(),
    services: Array.isArray(row.services)
      ? (row.services as Record<string, unknown>[]).map((s) => ({
          id: String(s.id ?? ''),
          name: String(s.name ?? ''),
          description: String(s.description ?? ''),
        }))
      : [],
  }));

  return { ok: true, shops };
}
