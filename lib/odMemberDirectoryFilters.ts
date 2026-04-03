/** Short labels for filter chips (matches vendor `od_business_category` values). */
export const OD_INDUSTRY_FILTER_LABEL: Record<string, string> = {
  "Food & Drink": "F&B",
  Retail: "Retail",
  "Barber & Hair": "Barber",
  "Beauty & Wellness": "Beauty",
  Services: "Services",
};

export function shopMatchesIndustryFilter(
  businessCategory: string | null | undefined,
  filter: "all" | string
): boolean {
  if (filter === "all") return true;
  const a = (businessCategory ?? "").trim().toLowerCase();
  const b = filter.trim().toLowerCase();
  return a === b;
}
