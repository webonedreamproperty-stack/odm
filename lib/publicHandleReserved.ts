/**
 * Single-segment paths that must not be treated as public @/:username profiles.
 * Keep in sync with top-level routes in App.tsx.
 */
export const PUBLIC_HANDLE_RESERVED = new Set([
  "login",
  "forgot-password",
  "od",
  "dashboard",
  "campaigns",
  "gallery",
  "analytics",
  "transactions",
  "settings",
  "issued-cards",
  "customers",
  "active",
  "preview",
  "editor",
  "staff",
  "join",
  "scan",
  "api",
  "m",
  "verify",
  "sitemap",
  "robots",
  "favicon",
]);

export function isReservedPublicHandle(segment: string): boolean {
  const s = segment.trim().toLowerCase();
  return s === "" || PUBLIC_HANDLE_RESERVED.has(s);
}
