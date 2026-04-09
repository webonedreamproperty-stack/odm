import React from "react";
import { ExternalLink, MapPin, Star } from "lucide-react";
import { motion, useDragControls } from "framer-motion";
import type { OdDirectoryShop } from "../../lib/db/odDirectory";
import { mergeDirectoryPlaceDisplay } from "../../lib/odMemberDirectoryDisplay";
import type { OdPlaceSearchExtras } from "../../lib/odPlaceSearchCacheExtras";
import { odDirectoryShopVtNames } from "../../lib/odDirectoryShopViewTransition";
import { googlePlacePhotoMediaUrl } from "../../lib/googlePlaceDetails";
import { cn } from "../../lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";

export type OdDirectoryShopDetailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop: OdDirectoryShop;
  placeExtra?: OdPlaceSearchExtras;
  googleMapsApiKey: string;
};

/** Matches Tailwind `md:` — bottom sheet + swipe only on small viewports. */
function useMobileSheetLayout() {
  const [isMobile, setIsMobile] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);
  return isMobile;
}

export const OdDirectoryShopDetailDialog: React.FC<OdDirectoryShopDetailDialogProps> = ({
  open,
  onOpenChange,
  shop,
  placeExtra,
  googleMapsApiKey,
}) => {
  const place = React.useMemo(() => mergeDirectoryPlaceDisplay(shop, placeExtra), [shop, placeExtra]);
  const vt = odDirectoryShopVtNames(shop.owner_id);
  const isMobileSheet = useMobileSheetLayout();
  const dragControls = useDragControls();

  const onSheetDragEnd = React.useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: { offset: { y: number }; velocity: { y: number } }) => {
      if (!isMobileSheet) return;
      const { y: vy } = info.velocity;
      const { y: oy } = info.offset;
      if (oy > 72 || vy > 420) {
        onOpenChange(false);
      }
    },
    [isMobileSheet, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "overflow-hidden border-0 bg-[#202124] p-0 text-[#e8eaed] shadow-2xl",
          // Mobile: bottom sheet ~80% of viewport (iOS-style swapper)
          "max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:top-auto max-md:z-[102] max-md:h-[80dvh] max-md:max-h-[80dvh] max-md:w-full max-md:max-w-full max-md:rounded-none max-md:rounded-t-[1.25rem] max-md:!flex max-md:flex-col max-md:gap-0 max-md:overflow-hidden max-md:pb-[env(safe-area-inset-bottom,0px)]",
          "max-md:data-[state=open]:animate-sheet-in max-md:data-[state=closed]:animate-sheet-out max-md:data-[state=closed]:fade-out-0",
          // Desktop: centered card
          "md:max-h-[min(92vh,720px)] md:max-w-lg md:rounded-[1.25rem] md:data-[state=open]:animate-none md:data-[state=closed]:animate-none"
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <motion.div
          className="flex min-h-0 flex-1 flex-col md:max-h-[min(92vh,720px)]"
          drag={isMobileSheet ? "y" : false}
          dragControls={dragControls}
          dragListener={false}
          dragConstraints={isMobileSheet ? { top: 0, bottom: 480 } : undefined}
          dragElastic={0.08}
          onDragEnd={onSheetDragEnd}
        >
          {isMobileSheet && (
            <div className="flex shrink-0 cursor-grab touch-none justify-center pt-2 active:cursor-grabbing">
              <button
                type="button"
                aria-label="Drag down to close"
                className="flex w-full justify-center py-1.5 outline-none"
                onPointerDown={(e) => {
                  dragControls.start(e);
                }}
              >
                <span className="h-1 w-11 rounded-full bg-white/25 shadow-sm" />
              </button>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
            <div
              className="relative aspect-[16/10] w-full min-h-[180px] overflow-hidden sm:min-h-[220px]"
              style={{ viewTransitionName: vt.hero } as React.CSSProperties}
            >
              <OdDirectoryDetailHero shop={shop} apiKey={googleMapsApiKey} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <DialogHeader className="space-y-2 text-left">
                  <DialogTitle
                    className="text-2xl font-semibold tracking-tight text-white"
                    style={{ viewTransitionName: vt.title } as React.CSSProperties}
                  >
                    {shop.business_name}
                  </DialogTitle>
                  <DialogDescription className="sr-only">
                    {place.categoryLine ? `${place.categoryLine}. ` : ""}
                    {shop.area ? `Located in ${shop.area}. ` : ""}
                    {shop.discount_summary ? `Offer: ${shop.discount_summary}` : ""}
                  </DialogDescription>
                  <div className="flex items-center gap-2 text-[15px] text-[#e8eaed]">
                    <Star
                      className="h-8 w-8 shrink-0 fill-[#fdd663] text-[#fdd663]"
                      aria-hidden
                      style={{ viewTransitionName: vt.star } as React.CSSProperties}
                    />
                    <span>
                      {shop.rating != null ? shop.rating.toFixed(1) : "—"}
                      {shop.rating_count != null ? ` (${shop.rating_count} reviews)` : ""}
                    </span>
                  </div>
                </DialogHeader>
              </div>
            </div>

            <div className="space-y-5 px-5 pb-6 pt-5">
              {(place.categoryLine != null || place.openNow !== null || Boolean(place.openingLine)) && (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#9aa0a6]">Category and hours</p>
                  {place.categoryLine ? (
                    <p className="mt-2 text-[15px] font-medium leading-snug text-[#e8eaed]">{place.categoryLine}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {place.openNow === true && (
                      <span className="rounded-full bg-emerald-500/20 px-2.5 py-1 text-[12px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                        Open now
                      </span>
                    )}
                    {place.openNow === false && (
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold text-[#d5d7da] ring-1 ring-white/15">
                        Closed now
                      </span>
                    )}
                    {place.openingLine ? (
                      <span className="text-[13px] leading-snug text-[#bdc1c6]">{place.openingLine}</span>
                    ) : null}
                  </div>
                </section>
              )}

              {shop.area ? (
                <section className="flex gap-2 text-[14px] leading-relaxed text-[#d5d7da]">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#9aa0a6]" aria-hidden />
                  <span>{shop.area}</span>
                </section>
              ) : null}

              {shop.discount_summary ? (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#9aa0a6]">Member offer</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#e8eaed]">{shop.discount_summary}</p>
                </section>
              ) : null}

              {shop.services && shop.services.length > 0 ? (
                <section>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#9aa0a6]">Services</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {shop.services.map((svc) => (
                      <li key={svc.id}>
                        <span className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-[13px] text-[#e8eaed] ring-1 ring-white/10">
                          {svc.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {shop.services.some((s) => s.description?.trim()) ? (
                    <ul className="mt-4 space-y-3 text-[13px] leading-relaxed text-[#bdc1c6]">
                      {shop.services
                        .filter((s) => s.description?.trim())
                        .map((svc) => (
                          <li key={`${svc.id}-desc`}>
                            <span className="font-medium text-[#e8eaed]">{svc.name}</span>
                            {svc.description?.trim() ? (
                              <span className="mt-0.5 block text-[#bdc1c6]">{svc.description.trim()}</span>
                            ) : null}
                          </li>
                        ))}
                    </ul>
                  ) : null}
                </section>
              ) : null}

              {(shop.listing_lat != null && shop.listing_lng != null) || shop.maps_url ? (
                <section className="border-t border-white/10 pt-4 text-[13px] text-[#9aa0a6]">
                  {shop.listing_lat != null && shop.listing_lng != null ? (
                    <p className="font-mono text-[12px] text-[#8a9099]">
                      {shop.listing_lat.toFixed(5)}, {shop.listing_lng.toFixed(5)}
                    </p>
                  ) : null}
                  {shop.maps_url ? (
                    <a
                      href={shop.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-[14px] font-medium text-[#e8eaed] ring-1 ring-white/15 transition hover:bg-white/15"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden />
                      Open in Maps
                    </a>
                  ) : null}
                </section>
              ) : null}
            </div>
          </div>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
};

function getShopPosterGradient(category: string | null): string {
  const c = (category ?? "").toLowerCase();
  if (c.includes("food") || c.includes("drink")) {
    return "linear-gradient(145deg, #431407 0%, #9a3412 38%, #ea580c 72%, #fb923c 100%)";
  }
  if (c.includes("retail")) {
    return "linear-gradient(145deg, #0f172a 0%, #1e3a5f 45%, #475569 100%)";
  }
  if (c.includes("barber") || c.includes("hair")) {
    return "linear-gradient(145deg, #1e1b4b 0%, #3730a3 50%, #6366f1 100%)";
  }
  if (c.includes("beauty") || c.includes("wellness")) {
    return "linear-gradient(145deg, #4c1d95 0%, #7c3aed 55%, #c084fc 100%)";
  }
  if (c.includes("service")) {
    return "linear-gradient(145deg, #14532d 0%, #15803d 50%, #4ade80 100%)";
  }
  return "linear-gradient(145deg, #18181b 0%, #3f3f46 55%, #71717a 100%)";
}

function resolveOdDirectoryHeroUrl(shop: OdDirectoryShop, apiKey: string): string | null {
  const direct = shop.shop_photo_url?.trim();
  if (direct) return direct;
  const photoName = shop.google_place_photo_name?.trim();
  if (photoName && apiKey) return googlePlacePhotoMediaUrl(photoName, apiKey, 900);
  return null;
}

function OdDirectoryDetailHero({ shop, apiKey }: { shop: OdDirectoryShop; apiKey: string }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const heroUrl = React.useMemo(() => resolveOdDirectoryHeroUrl(shop, apiKey), [shop, apiKey]);
  const showImg = Boolean(heroUrl) && !imgFailed;

  if (showImg && heroUrl) {
    return (
      <img
        src={heroUrl}
        alt=""
        className="h-full w-full object-cover object-center"
        loading="eager"
        decoding="async"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return <div className="h-full w-full" style={{ background: getShopPosterGradient(shop.business_category) }} />;
}
