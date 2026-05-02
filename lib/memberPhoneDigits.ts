/** Normalized MSISDN digits (no + or spaces), used for member profile + WAHA. */

export function digitsOnlyPhone(raw: string): string {
  return raw.replace(/\D/g, "");
}

/**
 * Heuristic for Malaysian numbers: `01…` → `60…`; leaves `60…` as-is.
 * For other countries, pass full international digits.
 */
export function normalizeMalaysiaMsisdnDigits(input: string): string {
  const d = digitsOnlyPhone(input);
  if (d.startsWith("60")) return d;
  if (d.startsWith("0") && d.length >= 9) return `60${d.slice(1)}`;
  return d;
}

/** Normalized digits must start with `60` (Malaysia) and be 11–13 digits total. */
export function isMalaysiaSixtyMsisdn(input: string): boolean {
  const digits = digitsOnlyPhone(normalizeMalaysiaMsisdnDigits(input));
  return digits.startsWith("60") && digits.length >= 11 && digits.length <= 13;
}
