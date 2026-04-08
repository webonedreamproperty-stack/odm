import { supabase } from "./supabase";

export type OdPlaceSearchExtras = {
  categoryLabel: string | null;
  openNow: boolean | null;
  openingLine: string | null;
};

function normalizePlaceId(id: string): string {
  return id.replace(/^places\//, "").trim();
}

function parsePlaceRecord(place: Record<string, unknown>): OdPlaceSearchExtras {
  const ptd = place.primaryTypeDisplayName as { text?: string } | undefined;
  const primaryType = typeof place.primaryType === "string" ? place.primaryType : null;
  const categoryLabel =
    (typeof ptd?.text === "string" && ptd.text.trim()) ||
    (primaryType
      ? primaryType
          .split("_")
          .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
          .join(" ")
      : null) ||
    null;

  const coh = place.currentOpeningHours as
    | { openNow?: boolean; weekdayDescriptions?: unknown }
    | undefined;
  const roh = place.regularOpeningHours as { weekdayDescriptions?: unknown } | undefined;
  const openNow = typeof coh?.openNow === "boolean" ? coh.openNow : null;
  const wd = coh?.weekdayDescriptions ?? roh?.weekdayDescriptions;
  const openingLine =
    Array.isArray(wd) && wd.length > 0 && typeof wd[0] === "string" ? wd[0] : null;

  return { categoryLabel, openNow, openingLine };
}

/**
 * Reads cached Google Text Search results (od_place_search_cache) via RPC.
 * Matches by google_place_id when provided; otherwise uses the first result.
 */
export async function fetchOdPlaceSearchCacheExtras(
  businessName: string,
  googlePlaceId: string | null,
  region = "my"
): Promise<OdPlaceSearchExtras | null> {
  const q = businessName.trim().toLowerCase();
  if (q.length < 2) return null;

  const { data, error } = await supabase.rpc("get_od_place_search_cache", {
    p_query: q,
    p_region: region.toLowerCase(),
  });
  if (error || data == null) return null;

  const wrap = data as { success?: boolean; payload?: unknown; error?: string };
  if (wrap.success === false) return null;
  const raw = wrap.payload;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  const want = googlePlaceId ? normalizePlaceId(googlePlaceId) : "";

  if (want) {
    for (const item of raw) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const id = typeof p.id === "string" ? normalizePlaceId(p.id) : "";
      if (!id) continue;
      if (id === want || id.endsWith(want) || want.endsWith(id)) {
        return parsePlaceRecord(p);
      }
    }
  }

  const first = raw[0];
  if (first && typeof first === "object") {
    return parsePlaceRecord(first as Record<string, unknown>);
  }
  return null;
}

/** Dedupes by business name; one cache read per distinct name. */
export async function fetchOdPlaceSearchCacheExtrasBatch(
  shops: { owner_id: string; business_name: string; google_place_id: string | null }[]
): Promise<Record<string, OdPlaceSearchExtras>> {
  const out: Record<string, OdPlaceSearchExtras> = {};
  const byKey = new Map<string, { owner_ids: string[]; google_place_id: string | null }>();

  for (const s of shops) {
    const key = s.business_name.trim().toLowerCase();
    if (!key) continue;
    const cur = byKey.get(key);
    if (cur) {
      cur.owner_ids.push(s.owner_id);
      if (!cur.google_place_id && s.google_place_id) cur.google_place_id = s.google_place_id;
    } else {
      byKey.set(key, { owner_ids: [s.owner_id], google_place_id: s.google_place_id });
    }
  }

  for (const [normName, { owner_ids, google_place_id }] of byKey) {
    const extras = await fetchOdPlaceSearchCacheExtras(normName, google_place_id, "my");
    if (!extras) continue;
    for (const id of owner_ids) {
      out[id] = extras;
    }
  }

  return out;
}
