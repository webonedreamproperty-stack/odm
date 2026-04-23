import { supabase } from "../supabase";

export type PublicVendorHandle = {
  kind: "vendor";
  slug: string;
  business_name: string;
  listing_area: string | null;
  discount_summary: string | null;
  maps_url: string | null;
  logo_url: string | null;
  shop_photo_url: string | null;
  business_category: string | null;
  directory_visible: boolean;
  /** Google Place ID when linked from Places search in Settings. */
  google_place_id: string | null;
  /** Cached Place Details (New) JSON from Supabase; null if not linked or cache expired. */
  place_details: Record<string, unknown> | null;
};

export type PublicMemberHandle = {
  kind: "member";
  username: string;
  display_name: string;
  membership_active: boolean;
};

export type PublicHandleResult =
  | { ok: true; data: PublicVendorHandle | PublicMemberHandle }
  | { ok: false; error: "invalid_handle" | "not_found" | "rpc" };

export async function fetchPublicHandlePage(handle: string): Promise<PublicHandleResult> {
  const trimmed = handle.trim();
  const { data, error } = await supabase.rpc("get_public_handle_page", { p_handle: trimmed });

  if (error) {
    return { ok: false, error: "rpc" };
  }

  const row = data as Record<string, unknown> | null;
  if (!row || typeof row !== "object") {
    return { ok: false, error: "not_found" };
  }

  if (row.error === "invalid_handle") {
    return { ok: false, error: "invalid_handle" };
  }
  if (row.error === "not_found") {
    return { ok: false, error: "not_found" };
  }

  const kind = row.kind;
  if (kind === "vendor") {
    const rawDetails = row.place_details;
    const placeDetails =
      rawDetails != null && typeof rawDetails === "object" && !Array.isArray(rawDetails)
        ? (rawDetails as Record<string, unknown>)
        : null;
    return {
      ok: true,
      data: {
        kind: "vendor",
        slug: String(row.slug ?? ""),
        business_name: String(row.business_name ?? ""),
        listing_area: row.listing_area != null ? String(row.listing_area) : null,
        discount_summary: row.discount_summary != null ? String(row.discount_summary) : null,
        maps_url: row.maps_url != null ? String(row.maps_url) : null,
        logo_url: row.logo_url != null ? String(row.logo_url) : null,
        shop_photo_url: row.shop_photo_url != null ? String(row.shop_photo_url) : null,
        business_category: row.business_category != null ? String(row.business_category) : null,
        directory_visible: Boolean(row.directory_visible),
        google_place_id: row.google_place_id != null ? String(row.google_place_id) : null,
        place_details: placeDetails,
      },
    };
  }

  if (kind === "member") {
    return {
      ok: true,
      data: {
        kind: "member",
        username: String(row.username ?? ""),
        display_name: String(row.display_name ?? "OD Gold Member"),
        membership_active: Boolean(row.membership_active),
      },
    };
  }

  return { ok: false, error: "not_found" };
}
