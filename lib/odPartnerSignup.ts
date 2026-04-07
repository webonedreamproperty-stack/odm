import { isSlugValid, normalizeSlug } from "./slug";

export function defaultBusinessNameFromEmail(email: string): string {
  const local = email.split("@")[0]?.trim() ?? "";
  const spaced = local.replace(/[._-]+/g, " ").trim();
  if (!spaced) return "My business";
  return spaced
    .split(/\s+/)
    .map((w) => w.slice(0, 1).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Build a valid slug; ensure uniqueness with isSlugAvailable (retries with suffix). */
export async function allocatePartnerSlug(
  email: string,
  isSlugAvailable: (slug: string) => Promise<boolean>
): Promise<string> {
  const local = normalizeSlug((email.split("@")[0] ?? "partner").replace(/\./g, "-"));
  let base = local.length >= 3 && isSlugValid(local) ? local : `partner-${Math.random().toString(36).slice(2, 10)}`;
  if (base.length > 26) base = base.slice(0, 26).replace(/-+$/, "");
  if (!isSlugValid(base)) base = `partner-${Math.random().toString(36).slice(2, 10)}`;

  for (let i = 0; i < 40; i++) {
    const suffix = i === 0 ? "" : `-${Math.random().toString(36).slice(2, 5)}`;
    let candidate = normalizeSlug(base + suffix).slice(0, 30);
    if (!isSlugValid(candidate)) {
      candidate = normalizeSlug(`partner-${Math.random().toString(36).slice(2, 12)}`).slice(0, 30);
    }
    if (isSlugValid(candidate) && (await isSlugAvailable(candidate))) {
      return candidate;
    }
  }
  const fallback = normalizeSlug(`p-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`).slice(0, 30);
  if (isSlugValid(fallback) && (await isSlugAvailable(fallback))) return fallback;
  throw new Error("Could not reserve a shop link. Try again.");
}
