import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readSupabaseServerEnv } from "../../bayarcash/lib/bayarcashOdPayment";
import { digitsOnlyPhone } from "../../../../lib/memberPhoneDigits";
import { assertMalaysiaSixtyMsisdn } from "./memberPhoneTac";
import { readWahaEnv, sendTacWhatsApp } from "../../../../lib/wahaClient";

const TAC_TTL_MS = 10 * 60 * 1000;

function tacSecret(): string {
  const s = process.env.PHONE_TAC_SECRET?.trim();
  if (s) return s;
  const w = process.env.WAHA_API_KEY?.trim();
  if (w) return w;
  return "";
}

function hashVerifyShopTac(userId: string, code: string): string {
  const secret = tacSecret();
  if (!secret) {
    throw new Error("PHONE_TAC_SECRET or WAHA_API_KEY is required.");
  }
  return createHash("sha256").update(`${secret}:verify_shop:${userId}:${code}`).digest("hex");
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

async function clearVerifyShopTac(admin: SupabaseClient, userId: string): Promise<void> {
  await admin
    .from("member_profiles")
    .update({
      verify_shop_tac_msisdn: null,
      verify_shop_tac_hash: null,
      verify_shop_tac_expires_at: null,
    })
    .eq("id", userId);
}

export async function handleVerifyShopSendTac(opts: {
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
  if (!parsed.ok) {
    return { ok: false, status: 400, error: parsed.error };
  }

  const admin = createClient(sb.url, sb.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row, error: qErr } = await admin
    .from("member_profiles")
    .select("id, email")
    .eq("phone_no", parsed.numeric)
    .maybeSingle();

  if (qErr) {
    return { ok: false, status: 500, error: "Could not look up member." };
  }
  if (!row?.id) {
    return {
      ok: false,
      status: 404,
      error: "No OD Gold member account found with this mobile number. Save your number on your account page first.",
    };
  }

  const code = String(randomInt(100000, 999999));
  let hash: string;
  try {
    hash = hashVerifyShopTac(row.id, code);
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

  if (!send.ok) {
    return {
      ok: false,
      status: send.status === 0 ? 502 : send.status >= 400 ? send.status : 502,
      error: send.error || "Could not send WhatsApp message.",
    };
  }

  const { error: upErr } = await admin
    .from("member_profiles")
    .update({
      verify_shop_tac_msisdn: parsed.numeric,
      verify_shop_tac_hash: hash,
      verify_shop_tac_expires_at: expiresAt,
    })
    .eq("id", row.id);

  if (upErr) {
    return { ok: false, status: 500, error: upErr.message || "Could not save verification state." };
  }

  return { ok: true };
}

export async function handleVerifyShopVerifyTac(opts: {
  rawPhone: string;
  rawCode: string;
}): Promise<{ ok: true; token_hash: string } | { ok: false; status: number; error: string }> {
  const sb = readSupabaseServerEnv();
  if (!sb) {
    return { ok: false, status: 503, error: "Server is not configured (Supabase)." };
  }

  const parsed = assertMalaysiaSixtyMsisdn(opts.rawPhone);
  if (!parsed.ok) {
    return { ok: false, status: 400, error: parsed.error };
  }

  const code = digitsOnlyPhone(opts.rawCode.trim());
  if (code.length !== 6) {
    return { ok: false, status: 400, error: "Enter the 6-digit code from WhatsApp." };
  }

  const admin = createClient(sb.url, sb.serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: row, error: qErr } = await admin
    .from("member_profiles")
    .select("id, email, verify_shop_tac_hash, verify_shop_tac_expires_at, verify_shop_tac_msisdn")
    .eq("verify_shop_tac_msisdn", parsed.numeric)
    .maybeSingle();

  if (qErr || !row?.id) {
    return { ok: false, status: 400, error: "No pending verification for this number. Send a new WhatsApp code." };
  }

  const storedHash = typeof row.verify_shop_tac_hash === "string" ? row.verify_shop_tac_hash : "";
  const expiresAt = row.verify_shop_tac_expires_at ? new Date(String(row.verify_shop_tac_expires_at)).getTime() : 0;

  if (!storedHash) {
    return { ok: false, status: 400, error: "No pending verification. Send a new WhatsApp code." };
  }
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    await clearVerifyShopTac(admin, row.id);
    return { ok: false, status: 400, error: "That code has expired. Send a new WhatsApp code." };
  }

  let computed: string;
  try {
    computed = hashVerifyShopTac(row.id, code);
  } catch {
    return { ok: false, status: 503, error: "Verification not configured." };
  }

  if (!timingSafeEqualHex(computed, storedHash)) {
    return { ok: false, status: 400, error: "Incorrect code. Check WhatsApp and try again." };
  }

  const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
  if (!email) {
    await clearVerifyShopTac(admin, row.id);
    return { ok: false, status: 500, error: "Member profile has no email; contact support." };
  }

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });

  if (linkErr || !linkData?.properties?.hashed_token) {
    await clearVerifyShopTac(admin, row.id);
    return {
      ok: false,
      status: 500,
      error: linkErr?.message || "Could not create sign-in session.",
    };
  }

  await clearVerifyShopTac(admin, row.id);

  return { ok: true, token_hash: linkData.properties.hashed_token };
}
