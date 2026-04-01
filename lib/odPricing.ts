/** OD member renewal (Malaysia, manual payment — no gateway in app). */

export type OdRenewalPlanKey = "month" | "year";

export type OdRenewalPackage = {
  plan: OdRenewalPlanKey;
  title: string;
  /** Ringgit */
  priceRm: number;
  blurb: string;
};

export const OD_RENEWAL_PACKAGES: readonly OdRenewalPackage[] = [
  {
    plan: "month",
    title: "1 month",
    priceRm: 19,
    blurb: "Flexible monthly access",
  },
  {
    plan: "year",
    title: "1 year",
    priceRm: 144,
    blurb: "Best value for regular members",
  },
] as const;

export function formatRm(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
