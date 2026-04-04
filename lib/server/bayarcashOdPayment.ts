import { createHmac, randomBytes } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { OD_RENEWAL_PACKAGES, type OdRenewalPlanKey } from "../odPricing";

const FPX = 1;
const DUITNOW_DOBW = 5;
const DUITNOW_QR = 6;
const CREDIT_CARD = 12;
const TOUCH_N_GO = 16;
const GRABPAY = 18;
const SHOPEE_PAY = 21;

/** Default MY checkout mix; override with BAYARCASH_PAYMENT_CHANNELS (comma-separated ints). */
const DEFAULT_CHANNELS = [FPX, DUITNOW_DOBW, DUITNOW_QR, CREDIT_CARD, TOUCH_N_GO, GRABPAY, SHOPEE_PAY] as const;

export type BayarcashEnv = {
  token: string;
  secret: string;
  sandbox: boolean;
  apiVersion: "v2" | "v3";
  /** When set (e.g. `BAYARCASH_API_BASE` in `.env.local`), all Bayarcash HTTP calls use this origin instead of derived sandbox/production URLs. */
  apiBaseOverride?: string;
  paymentChannels: number[];
  paidStatuses: string[];
  portalKey?: string;
};

function normalizeApiBase(url: string): string {
  const t = url.trim().replace(/\/+$/, "");
  return `${t}/`;
}

function inferVersionFromBase(base: string): "v2" | "v3" | null {
  const b = base.toLowerCase();
  if (b.includes("/v3") || b.includes("api.console.bayarcash") || b.includes("api.console.bayar")) {
    return "v3";
  }
  if (b.includes("/api/v2") || b.includes("console.bayarcash-sandbox.com/api") || b.includes("console.bayar.cash/api")) {
    return "v2";
  }
  return null;
}

function parseChannelList(raw: string | undefined): number[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

/**
 * Reads Bayarcash settings from the environment (e.g. `.env.local` loaded by `server.ts` / Vercel).
 *
 * Token: `BAYARCASH_PAT` | `BAYARCASH_API_TOKEN` | `BAYARCASH_TOKEN`
 * Secret: `BAYARCASH_SECRET` | `BAYARCASH_API_SECRET`
 * API root: optional `BAYARCASH_API_BASE` (overrides sandbox/prod URLs)
 * Channels: `BAYARCASH_PAYMENT_CHANNELS` or `BAYARCASH_PAYMENT_CHANNEL` (comma-separated ok)
 */
export function readBayarcashEnv(): BayarcashEnv | null {
  const token =
    process.env.BAYARCASH_PAT?.trim() ||
    process.env.BAYARCASH_API_TOKEN?.trim() ||
    process.env.BAYARCASH_TOKEN?.trim();
  const secret = process.env.BAYARCASH_SECRET?.trim() || process.env.BAYARCASH_API_SECRET?.trim();
  if (!token || !secret) return null;

  const sandbox = (process.env.BAYARCASH_SANDBOX ?? "").toLowerCase() === "true";

  const baseRaw = process.env.BAYARCASH_API_BASE?.trim();
  const apiBaseOverride = baseRaw ? normalizeApiBase(baseRaw) : undefined;

  let apiVersion: "v2" | "v3" = process.env.BAYARCASH_API_VERSION === "v3" ? "v3" : "v2";
  if (apiBaseOverride) {
    const inferred = inferVersionFromBase(apiBaseOverride);
    if (inferred) {
      apiVersion = inferred;
    }
  }

  const chFromPlural = parseChannelList(process.env.BAYARCASH_PAYMENT_CHANNELS);
  const chFromSingular = parseChannelList(process.env.BAYARCASH_PAYMENT_CHANNEL);
  const paymentChannels =
    chFromPlural.length > 0 ? chFromPlural : chFromSingular.length > 0 ? chFromSingular : [...DEFAULT_CHANNELS];

  const stRaw = process.env.BAYARCASH_PAID_STATUSES?.trim();
  const paidStatuses = stRaw
    ? stRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : ["3"];

  const portalKey = process.env.BAYARCASH_PORTAL_KEY?.trim() || undefined;

  return {
    token,
    secret,
    sandbox,
    apiVersion,
    apiBaseOverride,
    paymentChannels,
    paidStatuses,
    portalKey,
  };
}

export function bayarcashBaseUrl(cfg: BayarcashEnv): string {
  if (cfg.apiBaseOverride) {
    return cfg.apiBaseOverride;
  }
  if (cfg.apiVersion === "v3") {
    return cfg.sandbox ? "https://api.console.bayarcash-sandbox.com/v3/" : "https://api.console.bayar.cash/v3/";
  }
  return cfg.sandbox ? "https://console.bayarcash-sandbox.com/api/v2/" : "https://console.bayar.cash/api/v2/";
}

/** Matches Webimpian\\BayarcashSdk\\Actions\\ChecksumGenerator::createPaymentIntentChecksumValue */
export function createPaymentIntentChecksum(
  secretKey: string,
  data: {
    payment_channel: number[];
    order_number: string;
    amount: string;
    payer_name: string;
    payer_email: string;
  }
): string {
  const paymentChannel = [...data.payment_channel].sort((a, b) => a - b).join(",");
  const payload: Record<string, string> = {
    payment_channel: paymentChannel,
    order_number: data.order_number,
    amount: data.amount,
    payer_name: data.payer_name,
    payer_email: data.payer_email,
  };
  const keys = Object.keys(payload).sort() as (keyof typeof payload)[];
  const payloadString = keys.map((k) => payload[k]).join("|");
  return createHmac("sha256", secretKey).update(payloadString).digest("hex");
}

/** Matches CallbackVerifications::verifyReturnUrlCallbackData */
export function verifyReturnUrlCallback(secretKey: string, callbackData: Record<string, string>): boolean {
  const callbackChecksum = callbackData.checksum;
  if (!callbackChecksum) return false;

  const payload: Record<string, string> = {
    transaction_id: callbackData.transaction_id ?? "",
    exchange_reference_number: callbackData.exchange_reference_number ?? "",
    exchange_transaction_id: callbackData.exchange_transaction_id ?? "",
    order_number: callbackData.order_number ?? "",
    currency: callbackData.currency ?? "",
    amount: callbackData.amount ?? "",
    payer_bank_name: callbackData.payer_bank_name ?? "",
    status: callbackData.status ?? "",
    status_description: callbackData.status_description ?? "",
  };

  const keys = Object.keys(payload).sort() as (keyof typeof payload)[];
  const payloadString = keys.map((k) => payload[k]).join("|");
  const expected = createHmac("sha256", secretKey).update(payloadString).digest("hex");
  return expected === callbackChecksum;
}

function buildOrderNumber(): string {
  const t = Date.now().toString(36);
  const r = randomBytes(6).toString("hex");
  return `odm-${t}-${r}`;
}

async function bayarcashFormPost(
  cfg: BayarcashEnv,
  path: string,
  fields: Record<string, string | string[]>
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; text: string }> {
  const base = bayarcashBaseUrl(cfg);
  const url = new URL(path.replace(/^\//, ""), base).toString();
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(fields)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        body.append(`${k}[]`, item);
      }
    } else {
      body.set(k, v);
    }
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* ignore */
  }

  return { ok: res.ok, status: res.status, json, text };
}

async function bayarcashJsonGet(
  cfg: BayarcashEnv,
  path: string
): Promise<{ ok: boolean; status: number; json: Record<string, unknown> | null; text: string }> {
  const base = bayarcashBaseUrl(cfg);
  const url = new URL(path.replace(/^\//, ""), base).toString();
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/json",
    },
  });
  const text = await res.text();
  let json: Record<string, unknown> | null = null;
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    /* ignore */
  }
  return { ok: res.ok, status: res.status, json, text };
}

function pickUrlFromIntentResponse(json: Record<string, unknown> | null): string | null {
  if (!json) return null;
  const data = json.data;
  if (data && typeof data === "object" && data !== null && "url" in data) {
    const u = (data as { url?: unknown }).url;
    return typeof u === "string" && u.length > 0 ? u : null;
  }
  const u = json.url;
  return typeof u === "string" && u.length > 0 ? u : null;
}

export function readSupabaseServerEnv(): {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  appOrigin: string;
} | null {
  const url = process.env.SUPABASE_URL?.trim() || process.env.VITE_SUPABASE_URL?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() || process.env.VITE_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const vercelHost = process.env.VERCEL_URL?.trim();
  const vercelOrigin = vercelHost ? `https://${vercelHost.replace(/^https?:\/\//, "")}` : "";
  const appOrigin =
    process.env.APP_BASE_URL?.trim() ||
    process.env.APP_ORIGIN?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    vercelOrigin ||
    "http://localhost:3001";
  if (!url || !anonKey || !serviceRoleKey) return null;
  return { url, anonKey, serviceRoleKey, appOrigin };
}

export function paymentsConfigured(): boolean {
  return readBayarcashEnv() !== null && readSupabaseServerEnv() !== null;
}

export async function handleCreateOdRenewalIntent(opts: {
  accessToken: string;
  plan: string;
}): Promise<{ ok: true; url: string } | { ok: false; status: number; error: string }> {
  const bc = readBayarcashEnv();
  const sb = readSupabaseServerEnv();
  if (!bc || !sb) {
    return { ok: false, status: 503, error: "Payment server is not configured." };
  }

  if (opts.plan !== "month" && opts.plan !== "year") {
    return { ok: false, status: 400, error: "Invalid plan." };
  }
  const plan = opts.plan as OdRenewalPlanKey;

  const userClient = createClient(sb.url, sb.anonKey);
  const { data: userData, error: userErr } = await userClient.auth.getUser(opts.accessToken);
  if (userErr || !userData.user) {
    return { ok: false, status: 401, error: "Sign in required." };
  }
  const user = userData.user;

  const admin: SupabaseClient = createClient(sb.url, sb.serviceRoleKey);
  const { data: profile, error: pErr } = await admin
    .from("member_profiles")
    .select("id, display_name, email")
    .eq("id", user.id)
    .maybeSingle();

  if (pErr || !profile) {
    return { ok: false, status: 403, error: "OD member account required." };
  }

  const pkg = OD_RENEWAL_PACKAGES.find((p) => p.plan === plan);
  if (!pkg) {
    return { ok: false, status: 400, error: "Unknown package." };
  }

  const amount = pkg.priceRm.toFixed(2);
  const orderNumber = buildOrderNumber();
  const payerEmail = (typeof profile.email === "string" && profile.email) || user.email || "";
  const payerName =
    (typeof profile.display_name === "string" && profile.display_name.trim()) ||
    payerEmail.split("@")[0] ||
    "Member";

  if (!payerEmail) {
    return { ok: false, status: 400, error: "Missing payer email on your account." };
  }

  const { error: insErr } = await admin.from("od_checkout_sessions").insert({
    order_number: orderNumber,
    member_id: user.id,
    plan,
    amount_rm: Number(amount),
  });

  if (insErr) {
    return { ok: false, status: 500, error: insErr.message || "Could not start checkout." };
  }

  const checksum = createPaymentIntentChecksum(bc.secret, {
    payment_channel: bc.paymentChannels,
    order_number: orderNumber,
    amount,
    payer_name: payerName,
    payer_email: payerEmail,
  });

  const returnUrl = `${sb.appOrigin.replace(/\/+$/, "")}/api/od/bayarcash/return`;

  const fields: Record<string, string | string[]> = {
    order_number: orderNumber,
    amount,
    currency: "MYR",
    payer_name: payerName,
    payer_email: payerEmail,
    return_url: returnUrl,
    checksum,
    payment_channel: bc.paymentChannels.map(String),
  };

  if (bc.portalKey) {
    fields.portal_key = bc.portalKey;
  }

  const res = await bayarcashFormPost(bc, "payment-intents", fields);
  const redirectUrl = pickUrlFromIntentResponse(res.json);

  if (!res.ok || !redirectUrl) {
    await admin.from("od_checkout_sessions").delete().eq("order_number", orderNumber);
    const detail =
      (res.json && (String((res.json as { message?: unknown }).message) || JSON.stringify(res.json))) || res.text;
    return {
      ok: false,
      status: res.status >= 400 ? res.status : 502,
      error: detail || "Bayarcash did not return a checkout URL.",
    };
  }

  return { ok: true, url: redirectUrl };
}

function firstString(v: unknown): string {
  if (typeof v === "string") return v;
  if (Array.isArray(v) && typeof v[0] === "string") return v[0];
  return "";
}

function unwrapBayarcashEntity(json: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!json || typeof json !== "object") return null;
  const d = json.data;
  if (d && typeof d === "object" && !Array.isArray(d)) {
    return d as Record<string, unknown>;
  }
  if (Array.isArray(d) && d[0] && typeof d[0] === "object") {
    return d[0] as Record<string, unknown>;
  }
  return json;
}

export async function handleOdRenewalReturn(query: Record<string, unknown>): Promise<
  | { outcome: "success" }
  | { outcome: "failed"; reason: string }
> {
  const bc = readBayarcashEnv();
  const sb = readSupabaseServerEnv();
  if (!bc || !sb) {
    return { outcome: "failed", reason: "not_configured" };
  }

  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(query)) {
    flat[k] = firstString(v);
  }

  if (!verifyReturnUrlCallback(bc.secret, flat)) {
    return { outcome: "failed", reason: "invalid_checksum" };
  }

  const orderNumber = flat.order_number;
  const transactionId = flat.transaction_id;
  if (!orderNumber || !transactionId) {
    return { outcome: "failed", reason: "missing_params" };
  }

  const admin = createClient(sb.url, sb.serviceRoleKey);
  const { data: session, error: sErr } = await admin
    .from("od_checkout_sessions")
    .select("order_number, amount_rm, completed_at")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (sErr || !session) {
    return { outcome: "failed", reason: "unknown_order" };
  }

  const txRes = await bayarcashJsonGet(bc, `transactions/${encodeURIComponent(transactionId)}`);
  const raw = txRes.json;
  const data = unwrapBayarcashEntity(raw);

  const txOrder =
    typeof data?.orderNumber === "string"
      ? data.orderNumber
      : typeof data?.order_number === "string"
        ? data.order_number
        : "";
  const amountRaw = data?.amount;
  const txAmount = typeof amountRaw === "number" ? amountRaw : Number(amountRaw);
  const statusRaw = data?.status;
  const txStatus = typeof statusRaw === "string" ? statusRaw : String(statusRaw ?? "");

  if (txOrder && txOrder !== orderNumber) {
    return { outcome: "failed", reason: "order_mismatch" };
  }

  if (!Number.isFinite(txAmount) || Math.abs(txAmount - Number(session.amount_rm)) > 0.01) {
    return { outcome: "failed", reason: "amount_mismatch" };
  }

  if (!bc.paidStatuses.includes(txStatus)) {
    return { outcome: "failed", reason: "not_paid" };
  }

  const { data: rpcData, error: rpcErr } = await admin.rpc("service_complete_od_checkout", {
    p_order_number: orderNumber,
  });

  if (rpcErr) {
    return { outcome: "failed", reason: "renew_failed" };
  }

  const payload = rpcData as Record<string, unknown> | null;
  if (!payload || payload.success !== true) {
    return { outcome: "failed", reason: "renew_failed" };
  }

  return { outcome: "success" };
}
