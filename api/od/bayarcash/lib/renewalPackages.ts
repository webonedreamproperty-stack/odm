/**
 * OD renewal amounts for Bayarcash serverless routes.
 * Must match `lib/odPricing.ts` — colocated with Bayarcash route handlers for Vercel.
 */
export type OdRenewalPlanKey = "month" | "year";

export type OdRenewalPackage = {
  plan: OdRenewalPlanKey;
  title: string;
  priceRm: number;
  blurb: string;
};

export const OD_RENEWAL_PACKAGES: readonly OdRenewalPackage[] = [
  { plan: "month", title: "1 month", priceRm: 19, blurb: "Flexible monthly access" },
  { plan: "year", title: "1 year", priceRm: 144, blurb: "Best value for regular members" },
] as const;
