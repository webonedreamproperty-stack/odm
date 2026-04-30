/**
 * OD renewal amounts for Bayarcash serverless routes.
 * Must match `lib/odPricing.ts` — colocated with Bayarcash route handlers for Vercel.
 */
export type OdRenewalPlanKey = "month" | "year" | "hour";

export type OdRenewalPackage = {
  plan: OdRenewalPlanKey;
  title: string;
  priceRm: number;
  blurb: string;
};

export const OD_RENEWAL_PACKAGES: readonly OdRenewalPackage[] = [
  // { plan: "hour", title: "1 hour (test)", priceRm: 5, blurb: "Short test access for QA / sandbox" },
  { plan: "month", title: "1 month", priceRm: 9.90, blurb: "Flexible monthly access" },
  { plan: "year", title: "1 year", priceRm: 59.00, blurb: "Best value for regular members" },
] as const;
