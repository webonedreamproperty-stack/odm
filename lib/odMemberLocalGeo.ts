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

function getCurrentPositionAsync(options: PositionOptions): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, options);
  });
}

/**
 * Safari/macOS often returns POSITION_UNAVAILABLE / kCLErrorLocationUnknown for a “high accuracy” GPS-style fix
 * on desktop. A second attempt with network/Wi‑Fi positioning (`enableHighAccuracy: false`) usually succeeds.
 */
export async function getCurrentPositionWithAccuracyFallback(): Promise<GeolocationPosition> {
  const high: PositionOptions = { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 };
  const low: PositionOptions = { enableHighAccuracy: false, timeout: 28_000, maximumAge: 120_000 };

  try {
    return await getCurrentPositionAsync(high);
  } catch (first) {
    const e = first as GeolocationPositionError;
    if (e.code === e.PERMISSION_DENIED) throw first;
    if (e.code === e.POSITION_UNAVAILABLE || e.code === e.TIMEOUT) {
      return await getCurrentPositionAsync(low);
    }
    throw first;
  }
}

export function isGeolocationPositionError(e: unknown): e is GeolocationPositionError {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    typeof (e as GeolocationPositionError).code === "number" &&
    [1, 2, 3].includes((e as GeolocationPositionError).code)
  );
}

/** User-facing copy; avoids raw WebKit strings like “Position update is unavailable”. */
export function formatGeolocationUserMessage(e: GeolocationPositionError): string {
  if (e.code === e.PERMISSION_DENIED) {
    return "Location access was denied. Allow location for this site in your browser or system settings, then tap “Use my location” again.";
  }
  if (e.code === e.TIMEOUT) {
    return "Location timed out. Try again with a stable network, or wait a few seconds and retry.";
  }
  if (e.code === e.POSITION_UNAVAILABLE) {
    return (
      "We couldn’t determine your position (common on Mac/Safari over Wi‑Fi only or indoors). " +
      "Leave Wi‑Fi turned on for assisted location, check System Settings → Privacy & Security → Location Services for Safari, then try again."
    );
  }
  return "Could not read your location. Please try again in a moment.";
}
