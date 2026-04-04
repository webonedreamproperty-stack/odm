import { supabase } from "./supabase";
import type { OdRenewPlan } from "./db/members";

export async function startOdRenewalViaBayarcash(
  plan: OdRenewPlan
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) {
    return { ok: false, error: "Sign in required." };
  }

  const apiRoot = import.meta.env.VITE_PAYMENT_API_URL?.trim().replace(/\/+$/, "") ?? "";
  const createIntentUrl = apiRoot
    ? `${apiRoot}/api/od/bayarcash/create-intent`
    : "/api/od/bayarcash/create-intent";

  const res = await fetch(createIntentUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ plan }),
  });

  const raw = (await res.json().catch(() => null)) as { url?: unknown; error?: unknown } | null;
  if (!res.ok) {
    const msg =
      typeof raw?.error === "string"
        ? raw.error
        : `Checkout failed (${res.status}).`;
    return { ok: false, error: msg };
  }

  const url = typeof raw?.url === "string" ? raw.url : "";
  if (!url) {
    return { ok: false, error: "No checkout URL returned." };
  }

  window.location.assign(url);
  return { ok: true };
}
