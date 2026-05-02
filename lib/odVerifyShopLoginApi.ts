/** Public endpoints for `/od/verify/:slug` phone + WhatsApp TAC sign-in (no bearer token). */

function paymentApiUrl(path: string): string {
  const root = import.meta.env.VITE_PAYMENT_API_URL?.trim().replace(/\/+$/, "") ?? "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return root ? `${root}${p}` : p;
}

export async function sendVerifyShopPhoneTac(rawPhone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const res = await fetch(paymentApiUrl("/api/od/member/verify-shop/send-tac"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: rawPhone }),
  });

  const raw = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (!res.ok) {
    const msg = typeof raw?.error === "string" ? raw.error : `Request failed (${res.status}).`;
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function verifyShopPhoneAndToken(
  rawPhone: string,
  code: string,
): Promise<{ ok: true; token_hash: string } | { ok: false; error: string }> {
  const res = await fetch(paymentApiUrl("/api/od/member/verify-shop/verify-tac"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: rawPhone, code }),
  });

  const raw = (await res.json().catch(() => null)) as { error?: unknown; token_hash?: unknown } | null;
  if (!res.ok) {
    const msg = typeof raw?.error === "string" ? raw.error : `Request failed (${res.status}).`;
    return { ok: false, error: msg };
  }
  const token_hash = typeof raw?.token_hash === "string" ? raw.token_hash : "";
  if (!token_hash) {
    return { ok: false, error: "Could not complete sign-in." };
  }
  return { ok: true, token_hash };
}
