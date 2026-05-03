/**
 * Server-side [WAHA](https://waha.devlike.pro/docs/overview/) client for WhatsApp (e.g. TAC / OTP via `POST /api/sendText`).
 * Do not import from browser bundles — keep `WAHA_API_KEY` server-only (`.env.local` / hosting secrets).
 */

import { digitsOnlyPhone, normalizeMalaysiaMsisdnDigits } from "./memberPhoneDigits.js";

export type WahaEnv = {
  /** Origin only, e.g. `https://api.dynamicdigital.guru` */
  apiBase: string;
  apiKey: string;
  /** WhatsApp session name configured in WAHA (default `default`). */
  session: string;
};

function normalizeApiBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Env:
 * - `WAHA_API_BASE` | `WAHA_BASE_URL` — WAHA HTTP origin (no trailing slash required)
 * - `WAHA_API_KEY` — value for `X-Api-Key` header
 * - `WAHA_SESSION` — optional session name (default `default`)
 */
export function readWahaEnv(): WahaEnv | null {
  const raw =
    process.env.WAHA_API_BASE?.trim() ||
    process.env.WAHA_BASE_URL?.trim() ||
    process.env.WAHA_URL?.trim();
  const apiKey = process.env.WAHA_API_KEY?.trim();
  if (!raw || !apiKey) return null;

  return {
    apiBase: normalizeApiBase(raw),
    apiKey,
    session: process.env.WAHA_SESSION?.trim() || "default",
  };
}

export type SendWahaTextInput = {
  session?: string;
  /** Private chat id, e.g. `60123456789@c.us` — use {@link phoneDigitsToWahaChatId}. */
  chatId: string;
  text: string;
  linkPreview?: boolean;
};

export type WahaResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; detail?: string };

function joinApiPath(base: string, path: string): string {
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

async function readBodySnippet(res: Response): Promise<string | undefined> {
  const raw = await res.text();
  const t = raw.trim();
  if (!t) return undefined;
  return t.length > 800 ? `${t.slice(0, 800)}…` : t;
}

/**
 * Sends a plain text message via WAHA ([docs](https://waha.devlike.pro/docs/how-to/send-messages/)).
 */
export async function sendWahaText(env: WahaEnv, input: SendWahaTextInput): Promise<WahaResult<unknown>> {
  const session = input.session ?? env.session;
  const url = joinApiPath(env.apiBase, "/api/sendText");
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Api-Key": env.apiKey,
      },
      body: JSON.stringify({
        session,
        chatId: input.chatId,
        text: input.text,
        ...(input.linkPreview === undefined ? {} : { linkPreview: input.linkPreview }),
      }),
    });
  } catch (e) {
    return {
      ok: false,
      status: 0,
      error: "Network error calling WAHA.",
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  const snippet = await readBodySnippet(res);
  let parsed: unknown = undefined;
  if (snippet) {
    try {
      parsed = JSON.parse(snippet) as unknown;
    } catch {
      parsed = undefined;
    }
  }

  if (!res.ok) {
    const msg =
      parsed && typeof parsed === "object" && parsed !== null && "message" in parsed
        ? String((parsed as { message?: unknown }).message ?? "")
        : "";
    return {
      ok: false,
      status: res.status,
      error: msg || res.statusText || "WAHA request failed.",
      detail: snippet,
    };
  }

  return { ok: true, status: res.status, data: parsed ?? {} };
}

export { digitsOnlyPhone, normalizeMalaysiaMsisdnDigits } from "./memberPhoneDigits.js";

/**
 * Builds `chatId` for a one-to-one WhatsApp chat (`{digits}@c.us`).
 * Pass full international digits without `+`, e.g. Malaysia `60123456789`.
 */
export function phoneDigitsToWahaChatId(digits: string): string {
  const d = digitsOnlyPhone(digits);
  if (!d) {
    throw new Error("Phone number has no digits.");
  }
  return `${d}@c.us`;
}

export type WahaTacMessageOptions = {
  /** Shown in the message body, e.g. your product name */
  brandName?: string;
  /** Shown as “expires in N minutes” when set */
  ttlMinutes?: number;
};

/** First WhatsApp message only; {@link formatWahaTacCodeMessage} is sent immediately after. */
export function formatWahaTacPreamble(options?: WahaTacMessageOptions): string {
  const brand = options?.brandName?.trim();
  const header = brand ? `TAC Code: ${brand}:` : "TAC Code:";
  const ttlPart =
    options?.ttlMinutes != null && options.ttlMinutes > 0
      ? `code expires ${options.ttlMinutes} min code is 👇`
      : "code is 👇";
  const body = `Your verification Do not share this code with anyone. ${ttlPart}`;
  return [header, "", body].join("\n");
}

/** Second WhatsApp message: the TAC digits only. */
export function formatWahaTacCodeMessage(code: string): string {
  return code.trim();
}

export type SendTacWhatsAppInput = {
  /** Raw phone string; for MY local numbers see {@link normalizeMalaysiaMsisdnDigits}. */
  toPhone: string;
  tacCode: string;
  brandName?: string;
  ttlMinutes?: number;
  session?: string;
  linkPreview?: boolean;
};

/**
 * Convenience: normalizes MSISDN (Malaysia heuristic), formats TAC text, sends via WAHA.
 */
export async function sendTacWhatsApp(
  env: WahaEnv,
  input: SendTacWhatsAppInput,
): Promise<WahaResult<unknown>> {
  const digits = normalizeMalaysiaMsisdnDigits(input.toPhone);
  const chatId = phoneDigitsToWahaChatId(digits);
  const opts = { brandName: input.brandName, ttlMinutes: input.ttlMinutes };
  const preamble = formatWahaTacPreamble(opts);
  const codeText = formatWahaTacCodeMessage(input.tacCode);
  const base = {
    session: input.session,
    chatId,
    linkPreview: input.linkPreview ?? false,
  };
  const first = await sendWahaText(env, { ...base, text: preamble });
  if (!first.ok) return first;
  return sendWahaText(env, { ...base, text: codeText });
}
