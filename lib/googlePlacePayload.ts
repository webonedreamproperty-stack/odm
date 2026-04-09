import { googlePlacePhotoMediaUrl } from "./googlePlaceDetails";

export function textFromLocalized(obj: unknown): string {
  if (!obj || typeof obj !== "object") return "";
  const t = (obj as { text?: string }).text;
  return typeof t === "string" ? t : "";
}

export function getDisplayName(payload: Record<string, unknown>, fallback: string): string {
  const dn = payload.displayName;
  if (dn && typeof dn === "object") {
    const t = textFromLocalized(dn);
    if (t) return t;
  }
  return fallback;
}

export function priceLevelLabel(level: unknown): string | null {
  if (typeof level !== "string") return null;
  const map: Record<string, string> = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };
  return map[level] ?? null;
}

export type ParsedGoogleReview = {
  author: string;
  body: string;
  ratingVal: number | null;
  rel: string;
  reviewKey: string;
  authorUri: string | null;
  authorPhotoUri: string | null;
  reviewMapsUri: string | null;
  reviewPhotos: string[];
};

export function parseGooglePlacePhotos(
  placeDetails: Record<string, unknown>,
  apiKey: string,
  max = 12
): string[] {
  const raw = placeDetails.photos;
  if (!Array.isArray(raw) || !apiKey) return [];
  const urls: string[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const name = (p as { name?: string }).name;
    if (typeof name === "string" && name.length > 0) {
      urls.push(googlePlacePhotoMediaUrl(name, apiKey, 900));
    }
    if (urls.length >= max) break;
  }
  return urls;
}

export function parseGooglePlaceReviews(
  placeDetails: Record<string, unknown>,
  apiKey: string
): ParsedGoogleReview[] {
  const raw = placeDetails.reviews;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => {
      if (!r || typeof r !== "object") return null;
      const o = r as Record<string, unknown>;
      const ratingVal = typeof o.rating === "number" ? o.rating : null;
      const textObj = o.text;
      const body =
        textObj && typeof textObj === "object"
          ? textFromLocalized(textObj)
          : typeof o.text === "string"
            ? o.text
            : "";
      const rel =
        typeof o.relativePublishTimeDescription === "string" ? o.relativePublishTimeDescription : "";
      const auth = o.authorAttribution;
      const author =
        auth && typeof auth === "object" && typeof (auth as { displayName?: string }).displayName === "string"
          ? (auth as { displayName: string }).displayName
          : "Reviewer";
      const authorUri =
        auth && typeof auth === "object" && typeof (auth as { uri?: string }).uri === "string"
          ? (auth as { uri: string }).uri
          : null;
      const authorPhotoUri =
        auth && typeof auth === "object" && typeof (auth as { photoUri?: string }).photoUri === "string"
          ? (auth as { photoUri: string }).photoUri
          : null;
      const reviewMapsUri = typeof o.googleMapsUri === "string" ? o.googleMapsUri : null;
      const reviewKey = typeof o.name === "string" ? o.name : `${author}-${rel}-${ratingVal ?? "na"}`;
      const reviewPhotos = Array.isArray(o.photos)
        ? o.photos
            .map((p) => {
              if (!p || typeof p !== "object") return null;
              const photoName = (p as { name?: string }).name;
              if (typeof photoName !== "string" || !photoName || !apiKey) return null;
              return googlePlacePhotoMediaUrl(photoName, apiKey, 640);
            })
            .filter((u): u is string => typeof u === "string")
            .slice(0, 6)
        : [];
      if (!body && ratingVal == null) return null;
      return {
        author,
        body,
        ratingVal,
        rel,
        reviewKey,
        authorUri,
        authorPhotoUri,
        reviewMapsUri,
        reviewPhotos,
      };
    })
    .filter((x): x is ParsedGoogleReview => x != null);
}

export function getSummaryTextFromPlace(placeDetails: Record<string, unknown>): string | null {
  const gen = placeDetails.generativeSummary;
  if (gen && typeof gen === "object") {
    const t = textFromLocalized(gen);
    if (t) return t;
  }
  const ed = placeDetails.editorialSummary;
  if (ed && typeof ed === "object") {
    const t = textFromLocalized(ed);
    if (t) return t;
  }
  return null;
}

export function getPlaceTypes(placeDetails: Record<string, unknown>): string[] {
  const raw = placeDetails.types;
  if (!Array.isArray(raw)) return [];
  return raw.filter((x): x is string => typeof x === "string").slice(0, 8);
}

export function getWeekdayLines(placeDetails: Record<string, unknown>): string[] | null {
  const roh = placeDetails.regularOpeningHours;
  if (!roh || typeof roh !== "object") return null;
  const wd = (roh as { weekdayDescriptions?: unknown }).weekdayDescriptions;
  return Array.isArray(wd) ? wd.filter((x): x is string => typeof x === "string") : null;
}

export function getOpenSummary(placeDetails: Record<string, unknown>): string | null {
  const coh = placeDetails.currentOpeningHours;
  if (!coh || typeof coh !== "object") return null;
  const openNow = (coh as { openNow?: boolean }).openNow;
  const wd = (coh as { weekdayDescriptions?: unknown }).weekdayDescriptions;
  const first = Array.isArray(wd) && wd.length > 0 && typeof wd[0] === "string" ? wd[0] : null;
  if (typeof openNow === "boolean") {
    return openNow ? `Open · ${first ?? ""}` : `Closed · ${first ?? ""}`;
  }
  return first;
}

export function getPhoneFromPlace(placeDetails: Record<string, unknown>): string | null {
  if (typeof placeDetails.internationalPhoneNumber === "string") return placeDetails.internationalPhoneNumber;
  if (typeof placeDetails.nationalPhoneNumber === "string") return placeDetails.nationalPhoneNumber;
  return null;
}

export function getMapsUrlFromPlace(placeDetails: Record<string, unknown>, fallbackMapsUrl: string | null): string | null {
  if (typeof placeDetails.googleMapsUri === "string") return placeDetails.googleMapsUri;
  if (fallbackMapsUrl && /^https?:\/\//i.test(fallbackMapsUrl)) return fallbackMapsUrl;
  return null;
}

export function getWebsiteFromPlace(placeDetails: Record<string, unknown>): string | null {
  return typeof placeDetails.websiteUri === "string" ? placeDetails.websiteUri : null;
}

export function getFormattedAddress(placeDetails: Record<string, unknown>): string | null {
  return typeof placeDetails.formattedAddress === "string" ? placeDetails.formattedAddress : null;
}
