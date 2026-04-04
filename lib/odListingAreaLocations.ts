import { allPostcodes } from "malaysia-postcodes";

/**
 * Extra area lines merged into the vendor searchable list when missing from `malaysia-postcodes`.
 * Use the same format as the package: "City, State" (any casing; stored values are lowercased).
 * Edit this array in code — no env or DB required.
 */
export const EXTRA_OD_LISTING_AREAS: readonly string[] = [
  "Puchong, Selangor",
  // e.g. "Bangsar, Wp Kuala Lumpur",
];

let cachedLabels: string[] | null = null;

/** All city + state labels from the npm dataset plus {@link EXTRA_OD_LISTING_AREAS}, sorted. */
export function getOdListingAreaLabels(): string[] {
  if (cachedLabels) return cachedLabels;
  const set = new Set<string>();
  for (const state of allPostcodes) {
    const stateName = state.name;
    for (const city of state.city) {
      set.add(`${city.name}, ${stateName}`);
    }
  }
  for (const line of EXTRA_OD_LISTING_AREAS) {
    const t = line.trim();
    if (t) set.add(t);
  }
  cachedLabels = Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  return cachedLabels;
}

/** Stored + compared value: trimmed and lowercased (e.g. `majidee`, `kuala lumpur, selangor`). */
export function normalizeOdListingAreaValue(raw: string): string {
  return raw.trim().toLowerCase();
}
