/** Stable `view-transition-name` ids for directory card → detail morph (hero, star, title). */
export function odDirectoryShopVtNames(ownerId: string) {
  return {
    hero: `od-shop-hero-${ownerId}`,
    star: `od-shop-star-${ownerId}`,
    title: `od-shop-title-${ownerId}`,
  } as const;
}
