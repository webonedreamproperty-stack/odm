/** Aligned with TemplatesGallery template groupings (OD Gold Member models). */
export const OD_BUSINESS_CATEGORIES = [
  "Food & Drink",
  "Retail",
  "Barber & Hair",
  "Beauty & Wellness",
  "Services",
] as const;

export type OdBusinessCategory = (typeof OD_BUSINESS_CATEGORIES)[number];
