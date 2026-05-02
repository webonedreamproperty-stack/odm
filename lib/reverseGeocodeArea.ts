/**
 * Reverse geocode coordinates to a “City, State” style line for the OD listing area field.
 * Uses Photon (Komoot) — works from the browser (CORS). Falls back to Nominatim if needed.
 */

function formatPhotonProperties(p: Record<string, unknown>): string | null {
  const state = typeof p.state === "string" ? p.state : "";
  const place =
    (typeof p.city === "string" && p.city) ||
    (typeof p.county === "string" && p.county) ||
    (typeof p.district === "string" && p.district) ||
    (typeof p.locality === "string" && p.locality) ||
    "";
  if (place && state) return `${place}, ${state}`;
  if (place) return place;
  if (state) return state;
  return null;
}

async function reverseViaPhoton(lat: number, lon: number): Promise<string | null> {
  const url = `https://photon.komoot.io/reverse?lat=${encodeURIComponent(String(lat))}&lon=${encodeURIComponent(String(lon))}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { features?: { properties?: Record<string, unknown> }[] };
  const p = data.features?.[0]?.properties;
  if (!p) return null;
  return formatPhotonProperties(p);
}

async function reverseViaNominatim(lat: number, lon: number): Promise<string | null> {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://odgoldmember.com";
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("zoom", "14");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": `OD Gold Member/1.0 (${origin})`,
    },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as { address?: Record<string, string> };
  const addr = data.address;
  if (!addr) return null;

  const state = addr.state || addr.region || "";
  const place =
    addr.city ||
    addr.town ||
    addr.municipality ||
    addr.county ||
    addr.suburb ||
    addr.village ||
    addr.hamlet ||
    "";

  if (place && state) return `${place}, ${state}`;
  if (place) return place;
  if (state) return state;
  return null;
}

export async function reverseGeocodeToAreaLine(lat: number, lon: number): Promise<string | null> {
  try {
    const line = await reverseViaPhoton(lat, lon);
    if (line) return line;
  } catch {
    // try Nominatim (may fail CORS in some browsers)
  }
  try {
    return await reverseViaNominatim(lat, lon);
  } catch {
    return null;
  }
}
