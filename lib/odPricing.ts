/**
 * OD Gold member renewal (Malaysia). Amounts match Bayarcash when `VITE_OD_BAYARCASH_RENEWAL` or `VITE_OD_PAYMENTS_ENABLED` is true.
 * Serverless checkout amounts must match `api/od/bayarcash/lib/renewalPackages.ts`.
 */

export type OdRenewalPlanKey = "month" | "year" | "hour";

export type OdRenewalPackage = {
  plan: OdRenewalPlanKey;
  title: string;
  /** Ringgit */
  priceRm: number;
  blurb: string;
};

export const OD_RENEWAL_PACKAGES: readonly OdRenewalPackage[] = [
  // {
  //   plan: "hour",
  //   title: "1 hour (test)",
  //   priceRm: 5,
  //   blurb: "Short test access for QA / sandbox",
  // },
  {
    plan: "month",
    title: "1 month",
    priceRm: 9.90,
    blurb: "Flexible monthly access",
  },
  {
    plan: "year",
    title: "1 year",
    priceRm: 59.00,
    blurb: "Best value for regular members",
  },
] as const;

export function formatRm(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    // minimumFractionDigits: 0,
    // maximumFractionDigits: 0,
  }).format(amount);
}

/** Display label for a stored membership plan value. */
export function odPlanLabel(plan: string | null | undefined): string {
  switch (plan) {
    // case "hour":
    //   return "1 hour (test)";
    case "month":
      return "1 month";
    case "year":
      return "1 year";
    default:
      return "No plan";
  }
}
