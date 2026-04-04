const GEO_LS_PREFIX = "od_account_geo_v1";
const GEO_DECLINED_PREFIX = "od_account_geo_declined_v1";

/** If a new fix is farther than this from the last saved point, we treat it as “moved” and surface a note. */
export const OD_MEMBER_GEO_MOVE_THRESHOLD_M = 90;

export type StoredMemberGeo = {
  lat: number;
  lng: number;
  accuracyM: number | null;
  address: string | null;
  capturedAt: string;
};

export function memberGeoStorageKey(memberId: string): string {
  return `${GEO_LS_PREFIX}:${memberId}`;
}

export function memberGeoDeclinedKey(memberId: string): string {
  return `${GEO_DECLINED_PREFIX}:${memberId}`;
}

export function loadMemberGeoFromLocalStorage(memberId: string): StoredMemberGeo | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(memberGeoStorageKey(memberId));
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<StoredMemberGeo>;
    if (typeof p.lat !== "number" || typeof p.lng !== "number") return null;
    return {
      lat: p.lat,
      lng: p.lng,
      accuracyM: typeof p.accuracyM === "number" ? p.accuracyM : null,
      address: typeof p.address === "string" ? p.address : null,
      capturedAt: typeof p.capturedAt === "string" ? p.capturedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function saveMemberGeoToLocalStorage(
  memberId: string,
  data: {
    lat: number;
    lng: number;
    accuracyM: number | null;
    address: string | null;
    capturedAt?: string;
  }
): void {
  if (typeof window === "undefined") return;
  const full: StoredMemberGeo = {
    lat: data.lat,
    lng: data.lng,
    accuracyM: data.accuracyM,
    address: data.address,
    capturedAt: data.capturedAt ?? new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(memberGeoStorageKey(memberId), JSON.stringify(full));
  } catch {
    /* quota / private mode */
  }
}

export function isMemberGeoPromptDeclined(memberId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(memberGeoDeclinedKey(memberId)) === "1";
  } catch {
    return false;
  }
}

export function setMemberGeoPromptDeclined(memberId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(memberGeoDeclinedKey(memberId), "1");
  } catch {
    /* ignore */
  }
}

export function clearMemberGeoPromptDeclined(memberId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(memberGeoDeclinedKey(memberId));
  } catch {
    /* ignore */
  }
}

export function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toR = (d: number) => (d * Math.PI) / 180;
  const dLat = toR(lat2 - lat1);
  const dLng = toR(lng2 - lng1);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toR(lat1)) * Math.cos(toR(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}
