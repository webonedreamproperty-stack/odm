import { GooglePlacesSearchError } from "./googlePlacesSearch";

/** Fields for Place Details (New) REST — see Place data fields. */
const PLACE_DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "rating",
  "userRatingCount",
  "nationalPhoneNumber",
  "internationalPhoneNumber",
  "websiteUri",
  "googleMapsUri",
  "location",
  "regularOpeningHours",
  "currentOpeningHours",
  "utcOffsetMinutes",
  "businessStatus",
  "priceLevel",
  "types",
  "primaryTypeDisplayName",
  "primaryType",
  "photos",
  "editorialSummary",
  "generativeSummary",
  "reviews",
  "accessibilityOptions",
].join(",");

export async function fetchGooglePlaceDetails(
  placeId: string,
  apiKey: string
): Promise<Record<string, unknown>> {
  const id = placeId.trim();
  if (!id) {
    throw new GooglePlacesSearchError("Missing place id.");
  }
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": PLACE_DETAILS_FIELD_MASK,
    },
  });

  if (!response.ok) {
    let details = "";
    try {
      const err = (await response.json()) as {
        error?: { message?: string; status?: string };
      };
      details = err.error?.message ?? err.error?.status ?? "";
    } catch {
      // ignore
    }
    throw new GooglePlacesSearchError(details || `Place details failed (${response.status}).`);
  }

  return (await response.json()) as Record<string, unknown>;
}

/** Photo resource name from Place Details, e.g. `places/ChIJ…/photos/AWn5…` */
export function googlePlacePhotoMediaUrl(
  photoResourceName: string,
  apiKey: string,
  maxHeightPx = 800
): string {
  const base = `https://places.googleapis.com/v1/${photoResourceName}/media`;
  const u = new URL(base);
  u.searchParams.set("maxHeightPx", String(maxHeightPx));
  u.searchParams.set("key", apiKey);
  return u.toString();
}
