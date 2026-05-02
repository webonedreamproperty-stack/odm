import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseServerEnv } from "../../bayarcash/lib/bayarcashOdPayment.js";
import { digitsOnlyPhone, normalizeMalaysiaMsisdnDigits } from "../../../../lib/memberPhoneDigits.js";
import { readWahaEnv, sendTacWhatsApp } from "../../../../lib/wahaClient.js";

const TAC_TTL_MS = 10 * 60 * 1000;

function tacSecret(): string {
  const s = process.env.PHONE_TAC_SECRET?.trim();
  if (s) return s;
  const w = process.env.WAHA_API_KEY?.trim();
  if (w) return w;
  return "";
}

function hashPhoneTac(userId: string, code: string): string {
  const secret = tacSecret();
  if (!secret) {
    throw new Error("PHONE_TAC_SECRET or WAHA_API_KEY is required for phone verification.");
  }
  return createHash("sha256").update(`${secret}:${userId}:${code}`).digest("hex");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

/** Malaysia OD flow: international digits must start with 60 after normalization. */
export function assertMalaysiaSixtyMsisdn(raw: string): { ok: true; digits: string; numeric: number } | { ok: false; error: string } {
  const normalized = normalizeMalaysiaMsisdnDigits(raw.trim());
  const digits = digitsOnlyPhone(normalized);
  if (!digits.startsWith("60")) {
    return {
      ok: false,
      error: "Mobile number must start with country code 60 (e.g. 60123456789). Use 01… for local Malaysia numbers.",
    };
  }
  if (digits.length < 11 || digits.length > 13) {
    return { ok: false, error: "Enter a valid Malaysia mobile number (60 + 9–10 digits)." };
  }
  const numeric = Number(digits);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return { ok: false, error: "Invalid phone number." };
  }
  return { ok: true, digits, numeric };
}

async function clearPendingTac(admin: SupabaseClient, userId: string): Promise<void> {
  await admin
    .from("member_profiles")
    .update({
      phone_pending_msisdn: null,
      phone_tac_hash: null,
      phone_tac_expires_at: null,
    })
    .eq("id", userId);
}

export async function handleMemberPhoneSendTac(opts: {
  accessToken: string;
  rawPhone: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const sb = readSupabaseServerEnv();
  const waha = readWahaEnv();
  if (!sb) {
    return { ok: false, status: 503, error: "Server is not configured (Supabase)." };
  }
  if (!waha) {
    return { ok: false, status: 503, error: "WhatsApp (WAHA) is not configured on the server." };
  }

  if (!tacSecret()) {
    return { ok: false, status: 503, error: "Phone verification secret is not configured (PHONE_TAC_SECRET or WAHA_API_KEY)." };
  }

  const parsed = assertMalaysiaSixtyMsisdn(opts.rawPhone);
  if (parsed.ok === false) {
    return { ok: false, status: 400, error: parsed.error };
  }

  const userClient = createClient(sb.url, sb.anonKey);
  const { data: userData, error: userErr } = await userClient.auth.getUser(opts.accessToken);
  if (userErr || !userData.user) {
    return { ok: false, status: 401, error: "Login required." };
  }
  const user = userData.user;

  const admin = createClient(sb.url, sb.serviceRoleKey);
  const { data: profile, error: pErr } = await admin
    .from("member_profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr || !profile) {
    return { ok: false, status: 403, error: "OD Gold member account required." };
  }

  const code = String(randomInt(100000, 999999));
  let hash: string;
  try {
    hash = hashPhoneTac(user.id, code);
  } catch (e) {
    return { ok: false, status: 503, error: e instanceof Error ? e.message : "Verification not configured." };
  }

  const expiresAt = new Date(Date.now() + TAC_TTL_MS).toISOString();

  const send = await sendTacWhatsApp(waha, {
    toPhone: parsed.digits,
    tacCode: code,
    brandName: "OD Gold Member",
    ttlMinutes: 10,
  });

  if (send.ok === false) {
    return {
      ok: false,
      status: send.status === 0 ? 502 : send.status >= 400 ? send.status : 502,
      error: send.error || "Could not send WhatsApp message.",
    };
  }

  const { error: upErr } = await admin
    .from("member_profiles")
    .update({
      phone_pending_msisdn: parsed.numeric,
      phone_tac_hash: hash,
      phone_tac_expires_at: expiresAt,
    })
    .eq("id", user.id);

  if (upErr) {
    return { ok: false, status: 500, error: upErr.message || "Could not save verification state." };
  }

  return { ok: true };
}

export async function handleMemberPhoneVerifyTac(opts: {
  accessToken: string;
  rawCode: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const sb = readSupabaseServerEnv();
  if (!sb) {
    return { ok: false, status: 503, error: "Server is not configured (Supabase)." };
  }

  const code = digitsOnlyPhone(opts.rawCode.trim());
  if (code.length !== 6) {
    return { ok: false, status: 400, error: "Enter the 6-digit code from WhatsApp." };
  }

  const userClient = createClient(sb.url, sb.anonKey);
  const { data: userData, error: userErr } = await userClient.auth.getUser(opts.accessToken);
  if (userErr || !userData.user) {
    return { ok: false, status: 401, error: "Login required." };
  }
  const user = userData.user;

  const admin = createClient(sb.url, sb.serviceRoleKey);
  const { data: row, error: rErr } = await admin
    .from("member_profiles")
    .select("id, phone_pending_msisdn, phone_tac_hash, phone_tac_expires_at")
    .eq("id", user.id)
    .maybeSingle();

  if (rErr || !row) {
    return { ok: false, status: 403, error: "OD Gold member account required." };
  }

  const pending = row.phone_pending_msisdn;
  const storedHash = typeof row.phone_tac_hash === "string" ? row.phone_tac_hash : "";
  const expiresAt = row.phone_tac_expires_at ? new Date(String(row.phone_tac_expires_at)).getTime() : 0;

  if (pending == null || !storedHash) {
    return { ok: false, status: 400, error: "No pending verification. Send a new WhatsApp code first." };
  }
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    await clearPendingTac(admin, user.id);
    return { ok: false, status: 400, error: "That code has expired. Send a new WhatsApp code." };
  }

  let computed: string;
  try {
    computed = hashPhoneTac(user.id, code);
  } catch {
    return { ok: false, status: 503, error: "Verification not configured." };
  }

  if (!timingSafeEqualHex(computed, storedHash)) {
    return { ok: false, status: 400, error: "Incorrect code. Check WhatsApp and try again." };
  }

  const numeric = typeof pending === "number" ? pending : Number(pending);
  if (!Number.isFinite(numeric)) {
    await clearPendingTac(admin, user.id);
    return { ok: false, status: 500, error: "Invalid pending phone state." };
  }

  const { error: finErr } = await admin
    .from("member_profiles")
    .update({
      phone_no: numeric,
      phone_pending_msisdn: null,
      phone_tac_hash: null,
      phone_tac_expires_at: null,
    })
    .eq("id", user.id);

  if (finErr) {
    const msg = (finErr.message || "").toLowerCase();
    const code23505 = (finErr as { code?: string }).code === "23505" || msg.includes("unique") || msg.includes("duplicate");
    if (code23505) {
      await clearPendingTac(admin, user.id);
      return { ok: false, status: 409, error: "This number is already linked to another account." };
    }
    return { ok: false, status: 500, error: finErr.message || "Could not save phone number." };
  }

  return { ok: true };
}

export async function handleMemberPhoneClear(opts: {
  accessToken: string;
}): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const sb = readSupabaseServerEnv();
  if (!sb) {
    return { ok: false, status: 503, error: "Server is not configured (Supabase)." };
  }

  const userClient = createClient(sb.url, sb.anonKey);
  const { data: userData, error: userErr } = await userClient.auth.getUser(opts.accessToken);
  if (userErr || !userData.user) {
    return { ok: false, status: 401, error: "Login required." };
  }

  const admin = createClient(sb.url, sb.serviceRoleKey);
  const { error } = await admin
    .from("member_profiles")
    .update({
      phone_no: null,
      phone_pending_msisdn: null,
      phone_tac_hash: null,
      phone_tac_expires_at: null,
    })
    .eq("id", userData.user.id);

  if (error) {
    return { ok: false, status: 500, error: error.message || "Could not clear phone number." };
  }

  return { ok: true };
}
