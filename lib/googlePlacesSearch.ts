import { supabase } from "./supabase";

const GOOGLE_PLACES_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const ONE_MONTH_DAYS = 30;

export type GooglePlaceSearchResult = {
  id: string;
  name: string;
  formattedAddress: string | null;
  businessStatus: string | null;
  latitude: number | null;
  longitude: number | null;
  googleMapsUri: string | null;
};

export class GooglePlacesSearchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GooglePlacesSearchError";
  }
}

type CacheResponse = {
  success?: boolean;
  payload?: unknown;
};

const normalizeQuery = (query: string) => query.trim().toLowerCase();

function normalizeResults(raw: unknown): GooglePlaceSearchResult[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      const p = item as Record<string, unknown>;
      const displayName = p.displayName as Record<string, unknown> | undefined;
      const location = p.location as Record<string, unknown> | undefined;
      const lat = typeof location?.latitude === "number" ? location.latitude : null;
      const lng = typeof location?.longitude === "number" ? location.longitude : null;
      return {
        id: typeof p.id === "string" ? p.id : "",
        name: typeof displayName?.text === "string" ? displayName.text : "",
        formattedAddress: typeof p.formattedAddress === "string" ? p.formattedAddress : null,
        businessStatus: typeof p.businessStatus === "string" ? p.businessStatus : null,
        latitude: lat,
        longitude: lng,
        googleMapsUri: typeof p.googleMapsUri === "string" ? p.googleMapsUri : null,
      };
    })
    .filter((x) => x.id && x.name);
}

async function readCache(query: string, region: string): Promise<GooglePlaceSearchResult[] | null> {
  const { data, error } = await supabase.rpc("get_od_place_search_cache", {
    p_query: normalizeQuery(query),
    p_region: region.toLowerCase(),
  });
  if (error || !data) return null;
  const payload = data as CacheResponse;
  if (!payload.success) return null;
  return normalizeResults(payload.payload);
}

async function writeCache(query: string, region: string, payload: unknown): Promise<void> {
  await supabase.rpc("upsert_od_place_search_cache", {
    p_query: normalizeQuery(query),
    p_region: region.toLowerCase(),
    p_payload: payload,
    p_ttl_days: ONE_MONTH_DAYS,
  });
}

export async function searchGooglePlacesText(
  query: string,
  apiKey: string,
  region = "MY"
): Promise<GooglePlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const cached = await readCache(trimmed, region);
  if (cached && cached.length > 0) return cached;

  const response = await fetch(GOOGLE_PLACES_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask":
        "places.id,places.displayName,places.formattedAddress,places.location,places.businessStatus,places.googleMapsUri",
    },
    body: JSON.stringify({
      textQuery: trimmed,
      // languageCode: "en",
      regionCode: region.toUpperCase(),
      maxResultCount: 8,
      // isOpenNow: false,
      minRating: 0,
    }),
  });

  if (!response.ok) {
    let details = "";
    try {
      const err = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      details = err.error?.message ?? err.error?.status ?? "";
    } catch {
      // ignore parse failure
    }
    throw new GooglePlacesSearchError(
      details || `Google Places request failed (${response.status}).`
    );
  }

  const data = (await response.json()) as { places?: unknown[] };
  const places = normalizeResults(data.places ?? []);
  if (places.length > 0) {
    await writeCache(trimmed, region, data.places ?? []);
  }
  return places;
}
