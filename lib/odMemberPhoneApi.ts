import { supabase } from "./supabase";

function paymentApiUrl(path: string): string {
  const root = import.meta.env.VITE_PAYMENT_API_URL?.trim().replace(/\/+$/, "") ?? "";
  const p = path.startsWith("/") ? path : `/${path}`;
  return root ? `${root}${p}` : p;
}

async function bearerHeaders(): Promise<{ Authorization: string } | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return null;
  return { Authorization: `Bearer ${accessToken}` };
}

export async function requestMemberPhoneTac(rawPhone: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await bearerHeaders();
  if (!auth) {
    return { ok: false, error: "Sign in required." };
  }

  const res = await fetch(paymentApiUrl("/api/od/member/phone/send-tac"), {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone: rawPhone }),
  });

  const raw = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (!res.ok) {
    const msg = typeof raw?.error === "string" ? raw.error : `Request failed (${res.status}).`;
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function verifyMemberPhoneTac(code: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await bearerHeaders();
  if (!auth) {
    return { ok: false, error: "Sign in required." };
  }

  const res = await fetch(paymentApiUrl("/api/od/member/phone/verify-tac"), {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ code }),
  });

  const raw = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (!res.ok) {
    const msg = typeof raw?.error === "string" ? raw.error : `Request failed (${res.status}).`;
    return { ok: false, error: msg };
  }
  return { ok: true };
}

export async function clearMemberPhoneServer(): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await bearerHeaders();
  if (!auth) {
    return { ok: false, error: "Sign in required." };
  }

  const res = await fetch(paymentApiUrl("/api/od/member/phone/clear"), {
    method: "POST",
    headers: {
      ...auth,
      "Content-Type": "application/json",
    },
  });

  const raw = (await res.json().catch(() => null)) as { error?: unknown } | null;
  if (!res.ok) {
    const msg = typeof raw?.error === "string" ? raw.error : `Request failed (${res.status}).`;
    return { ok: false, error: msg };
  }
  return { ok: true };
}
