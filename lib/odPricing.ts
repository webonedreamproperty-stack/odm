/**
 * OD Gold member renewal (Malaysia). Amounts match Bayarcash when `VITE_OD_BAYARCASH_RENEWAL` or `VITE_OD_PAYMENTS_ENABLED` is true.
 * Serverless checkout amounts must match `api/od/bayarcash/lib/renewalPackages.ts`.
 */

export type OdRenewalPlanKey = string;

export type OdRenewalPackage = {
  plan: string;
  title: string;
  /** Ringgit */
  priceRm: number;
  blurb: string;
  sortOrder?: number;
  oneTimePerMember?: boolean;
};

export const OD_RENEWAL_PACKAGES: readonly OdRenewalPackage[] = [
  // {
  //   plan: "hour",
  //   title: "1 hour (test)",
  //   priceRm: 5,
  //   blurb: "Short test access for QA / sandbox",
  // },
  {
    plan: "trial_year",
    title: "1 year free trial",
    priceRm: 0,
    blurb: "Complimentary first year for new members",
    sortOrder: 0,
    oneTimePerMember: true,
  },
  {
    plan: "month",
    title: "1 month",
    priceRm: 9.90,
    blurb: "Flexible monthly access",
    sortOrder: 10,
  },
  {
    plan: "year",
    title: "1 year",
    priceRm: 59.00,
    blurb: "Best value for regular members",
    sortOrder: 20,
  },
] as const;

export function isFreeOdPackage(pkg: OdRenewalPackage): boolean {
  return pkg.priceRm <= 0;
}

export function formatPackagePrice(priceRm: number): string {
  return priceRm <= 0 ? "Free" : formatRm(priceRm);
}

export function formatRm(amount: number): string {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    // minimumFractionDigits: 0,
    // maximumFractionDigits: 0,
  }).format(amount);
}

/** Display label for a stored membership plan value. */
export function odPlanLabel(
  plan: string | null | undefined,
  packages?: readonly OdRenewalPackage[]
): string {
  if (!plan) return "No plan";
  const found = packages?.find((p) => p.plan === plan);
  if (found) return found.title;
  switch (plan) {
    // case "hour":
    //   return "1 hour (test)";
    case "month":
      return "1 month";
    case "year":
      return "1 year";
    case "trial_year":
      return "1 year free trial";
    default:
      return plan.replace(/_/g, " ");
  }
}
