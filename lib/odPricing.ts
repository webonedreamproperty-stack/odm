/**
 * OD member renewal (Malaysia). Amounts match Bayarcash when `VITE_OD_BAYARCASH_RENEWAL` or `VITE_OD_PAYMENTS_ENABLED` is true.
 * Serverless checkout amounts must match `api/od/bayarcash/lib/renewalPackages.ts`.
 */

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
