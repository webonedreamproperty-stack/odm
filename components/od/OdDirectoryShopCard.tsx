import React from "react";
import { Star } from "lucide-react";
import type { OdDirectoryShop } from "../../lib/db/odDirectory";
import { googlePlacePhotoMediaUrl } from "../../lib/googlePlaceDetails";
import { odDirectoryShopVtNames } from "../../lib/odDirectoryShopViewTransition";
import { mergeDirectoryPlaceDisplay } from "../../lib/odMemberDirectoryDisplay";
import { OD_INDUSTRY_FILTER_LABEL } from "../../lib/odMemberDirectoryFilters";
import type { OdPlaceSearchExtras } from "../../lib/odPlaceSearchCacheExtras";

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

function OdDirectoryVendorHeroSurface({ shop, apiKey }: { shop: OdDirectoryShop; apiKey: string }) {
  const [imgFailed, setImgFailed] = React.useState(false);
  const heroUrl = React.useMemo(() => resolveOdDirectoryHeroUrl(shop, apiKey), [shop, apiKey]);
  const showImg = Boolean(heroUrl) && !imgFailed;

  if (showImg && heroUrl) {
    return (
      <img
        src={heroUrl}
        alt=""
        className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-[1.02]"
        loading="lazy"
        onError={() => setImgFailed(true)}
      />
    );
  }
  return (
    <div className="h-full w-full" style={{ background: getShopPosterGradient(shop.business_category) }} />
  );
}

export type OdDirectoryShopCardProps = {
  shop: OdDirectoryShop;
  placeExtra?: OdPlaceSearchExtras;
  googleMapsApiKey: string;
  className?: string;
  /** Opens detail view; card becomes keyboard-focusable and clickable. */
  onSelect?: () => void;
};

export const OdDirectoryShopCard: React.FC<OdDirectoryShopCardProps> = ({
  shop,
  placeExtra,
  googleMapsApiKey,
  className,
  onSelect,
}) => {
  const vt = odDirectoryShopVtNames(shop.owner_id);
  const interactive = Boolean(onSelect);

  return (
    <article
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={interactive ? () => onSelect?.() : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
      className={`group overflow-hidden rounded-[1.2rem] bg-[#202124] text-[#e8eaed] shadow-[0_6px_24px_rgba(0,0,0,0.22)] ring-1 ring-black/20 ${interactive ? "cursor-pointer transition-transform duration-200 hover:scale-[1.01] active:scale-[0.995]" : ""} ${className ?? ""}`}
    >
      <div
        className="relative aspect-[4/5] min-h-[168px] w-full overflow-hidden sm:aspect-[16/10] sm:min-h-[200px]"
        style={{ viewTransitionName: vt.hero } as React.CSSProperties}
      >
        <OdDirectoryVendorHeroSurface shop={shop} apiKey={googleMapsApiKey} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3
            className="truncate text-[18px] font-semibold tracking-tight text-white"
            style={{ viewTransitionName: vt.title } as React.CSSProperties}
          >
            {shop.business_name}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-[12px] text-[#d5d7da]">
            <Star
              className="h-3.5 w-3.5 fill-[#fdd663] text-[#fdd663]"
              aria-hidden
              style={{ viewTransitionName: vt.star } as React.CSSProperties}
            />
            <span>
              {shop.rating != null ? shop.rating.toFixed(1) : "—"}
              {shop.rating_count != null ? ` (${shop.rating_count})` : ""}
            </span>
            {/* {shop.business_category ? (
              <>
                <span>·</span>
                <span className="truncate">
                  {OD_INDUSTRY_FILTER_LABEL[shop.business_category] ?? shop.business_category}
                </span>
              </>
            ) : null} */}
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {(() => {
          const place = mergeDirectoryPlaceDisplay(shop, placeExtra);
          const hasPlaceInfo =
            place.categoryLine != null || place.openNow !== null || Boolean(place.openingLine);
          return (
            <>
              {hasPlaceInfo && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#9aa0a6]">
                    Category and hours
                  </p>
                  {place.categoryLine ? (
                    <p className="mt-1.5 text-[13px] font-medium leading-snug text-[#e8eaed]">{place.categoryLine}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {place.openNow === true && (
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[11px] font-semibold text-emerald-300 ring-1 ring-emerald-400/30">
                        Open now
                      </span>
                    )}
                    {place.openNow === false && (
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-[#d5d7da] ring-1 ring-white/15">
                        Closed now
                      </span>
                    )}
                    {place.openingLine ? (
                      <span className="text-[12px] leading-snug text-[#bdc1c6]">{place.openingLine}</span>
                    ) : null}
                  </div>
                </div>
              )}
              <div>
                {shop.services && shop.services.length > 0 && (
                  <>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-[#9aa0a6]">Services</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {shop.services.slice(0, 6).map((svc) => (
                        <span
                          key={svc.id}
                          className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] text-[#e8eaed] ring-1 ring-white/10"
                        >
                          {svc.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          );
        })()}
      </div>
    </article>
  );
};
