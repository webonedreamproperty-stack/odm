import type { OdDirectoryShop } from "./db/odDirectory";
import { OD_INDUSTRY_FILTER_LABEL } from "./odMemberDirectoryFilters";
import type { OdPlaceSearchExtras } from "./odPlaceSearchCacheExtras";

export function mergeDirectoryPlaceDisplay(
  shop: OdDirectoryShop,
  extra: OdPlaceSearchExtras | undefined
): { categoryLine: string | null; openNow: boolean | null; openingLine: string | null } {
  const odCat =
    shop.business_category != null
      ? (OD_INDUSTRY_FILTER_LABEL[shop.business_category] ?? shop.business_category)
      : null;
  return {
    categoryLine:
      shop.place_google_category?.trim() ||
      extra?.categoryLabel?.trim() ||
      odCat ||
      null,
    openNow: shop.place_open_now !== null ? shop.place_open_now : extra?.openNow ?? null,
    openingLine: shop.place_opening_line?.trim() || extra?.openingLine?.trim() || null,
  };
}

/**
 * One label per shop for filter chips: prefers Google/search cache category, else vendor industry (e.g. F&B).
 */
export function getShopCategoryFilterLabel(shop: OdDirectoryShop, extra: OdPlaceSearchExtras | undefined): string {
  const m = mergeDirectoryPlaceDisplay(shop, extra);
  if (m.categoryLine?.trim()) return m.categoryLine.trim();
  if (shop.business_category) {
    return OD_INDUSTRY_FILTER_LABEL[shop.business_category] ?? shop.business_category;
  }
  return "Other";
}
