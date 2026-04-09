import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MapPin,
  Navigation,
  Phone,
  Share2,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "../../lib/utils";
import {
  getDisplayName,
  getFormattedAddress,
  getMapsUrlFromPlace,
  getOpenSummary,
  getPhoneFromPlace,
  getPlaceTypes,
  getSummaryTextFromPlace,
  getWeekdayLines,
  getWebsiteFromPlace,
  parseGooglePlacePhotos,
  parseGooglePlaceReviews,
  priceLevelLabel,
  type ParsedGoogleReview,
} from "../../lib/googlePlacePayload";
import { buildAppUrl } from "../../lib/siteConfig";
import { OD_INDUSTRY_FILTER_LABEL } from "../../lib/odMemberDirectoryFilters";
import type { OdDirectoryShop } from "../../lib/db/odDirectory";

type TabId = "overview" | "photos" | "about" | "reviews";

export type OdGooglePlaceDetailTabsProps = {
  placeDetails: Record<string, unknown>;
  apiKey: string;
  shop: OdDirectoryShop;
};

export const OdGooglePlaceDetailTabs: React.FC<OdGooglePlaceDetailTabsProps> = ({ placeDetails, apiKey, shop }) => {
  const [tab, setTab] = useState<TabId>("overview");
  const [expandedReviewMap, setExpandedReviewMap] = useState<Record<string, boolean>>({});
  const reviewPhotoRowsRef = useRef<Record<string, HTMLDivElement | null>>({});
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxImages, setLightboxImages] = useState<string[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  const title = useMemo(() => getDisplayName(placeDetails, shop.business_name), [placeDetails, shop.business_name]);

  const rating = typeof placeDetails.rating === "number" ? placeDetails.rating : shop.rating;
  const reviewCount =
    typeof placeDetails.userRatingCount === "number" ? placeDetails.userRatingCount : shop.rating_count;

  const primaryType =
    placeDetails.primaryTypeDisplayName && typeof placeDetails.primaryTypeDisplayName === "object"
      ? (() => {
          const t = (placeDetails.primaryTypeDisplayName as { text?: string }).text;
          return typeof t === "string" ? t : null;
        })()
      : null;

  const categoryLabel =
    shop.business_category != null
      ? OD_INDUSTRY_FILTER_LABEL[shop.business_category] ?? shop.business_category
      : null;

  const address = getFormattedAddress(placeDetails);
  const phone = getPhoneFromPlace(placeDetails);
  const mapsUrl = getMapsUrlFromPlace(placeDetails, shop.maps_url);
  const website = getWebsiteFromPlace(placeDetails);
  const weekdayLines = useMemo(() => getWeekdayLines(placeDetails), [placeDetails]);
  const openSummary = useMemo(() => getOpenSummary(placeDetails), [placeDetails]);

  const photos = useMemo(() => parseGooglePlacePhotos(placeDetails, apiKey, 12), [placeDetails, apiKey]);

  const reviews = useMemo(() => parseGooglePlaceReviews(placeDetails, apiKey), [placeDetails, apiKey]);

  const summaryText = useMemo(() => getSummaryTextFromPlace(placeDetails), [placeDetails]);

  const types = useMemo(() => getPlaceTypes(placeDetails), [placeDetails]);

  const price = priceLevelLabel(placeDetails.priceLevel);

  const googlePlaceIdForLink = typeof placeDetails.id === "string" ? placeDetails.id : shop.google_place_id;

  const handleShare = async () => {
    const url = buildAppUrl(`/${shop.slug}`);
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      // ignore
    }
  };

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "photos", label: "Photos" },
    { id: "about", label: "About" },
    { id: "reviews", label: "Reviews" },
  ];

  const scrollReviewPhotos = useCallback((reviewKey: string, direction: "prev" | "next") => {
    const row = reviewPhotoRowsRef.current[reviewKey];
    if (!row) return;
    const delta = Math.max(180, Math.floor(row.clientWidth * 0.8));
    row.scrollBy({ left: direction === "next" ? delta : -delta, behavior: "smooth" });
  }, []);

  const openLightbox = useCallback((images: string[], index: number) => {
    if (!images.length) return;
    setLightboxImages(images);
    setLightboxIndex(Math.min(Math.max(index, 0), images.length - 1));
    setLightboxOpen(true);
  }, []);

  const goLightbox = useCallback(
    (direction: "prev" | "next") => {
      if (!lightboxImages.length) return;
      setLightboxIndex((prev) =>
        direction === "next"
          ? (prev + 1) % lightboxImages.length
          : (prev - 1 + lightboxImages.length) % lightboxImages.length
      );
    },
    [lightboxImages]
  );

  const handleLightboxSwipe = useCallback(() => {
    if (touchStartX == null || touchEndX == null) return;
    const distance = touchStartX - touchEndX;
    const threshold = 50;
    if (Math.abs(distance) < threshold) return;
    if (distance > 0) {
      goLightbox("next");
    } else {
      goLightbox("prev");
    }
    setTouchStartX(null);
    setTouchEndX(null);
  }, [touchStartX, touchEndX, goLightbox]);

  return (
    <>
      <div className="border-b border-white/10 px-2 pt-1 md:px-4 md:pt-2">
        <div className="flex gap-1 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
                tab === t.id
                  ? "bg-[#3c4043] text-white"
                  : "text-[#9aa0a6] hover:bg-white/5 hover:text-[#e8eaed]"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 sm:p-5 md:p-6">
        {tab === "overview" && (
          <div className="space-y-5">
            {photos.length > 1 ? (
              <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
                {photos.slice(0, 8).map((src, i) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => openLightbox(photos, i)}
                    className="relative h-24 w-36 shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10"
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                    {i === 7 && photos.length > 8 ? (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-sm font-medium text-white">
                        +{photos.length - 8}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-start justify-around gap-3 border-b border-white/10 pb-5 sm:justify-evenly md:justify-start md:gap-6">
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s/g, "")}`}
                  className="flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl py-2 text-center text-[11px] text-[#8ab4f8] hover:bg-white/5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20">
                    <Phone className="h-5 w-5" aria-hidden />
                  </span>
                  Call
                </a>
              ) : (
                <div className="flex min-w-[4.5rem] flex-col items-center gap-1.5 py-2 text-center text-[11px] text-[#5f6368]">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10">
                    <Phone className="h-5 w-5" aria-hidden />
                  </span>
                  Call
                </div>
              )}
              {mapsUrl ? (
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl py-2 text-center text-[11px] text-[#8ab4f8] hover:bg-white/5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20">
                    <Navigation className="h-5 w-5" aria-hidden />
                  </span>
                  Directions
                </a>
              ) : null}
              <button
                type="button"
                onClick={() => void handleShare()}
                className="flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl py-2 text-center text-[11px] text-[#8ab4f8] hover:bg-white/5"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20">
                  <Share2 className="h-5 w-5" aria-hidden />
                </span>
                Share
              </button>
              {website ? (
                <a
                  href={website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-[4.5rem] flex-col items-center gap-1.5 rounded-xl py-2 text-center text-[11px] text-[#8ab4f8] hover:bg-white/5"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20">
                    <ExternalLink className="h-5 w-5" aria-hidden />
                  </span>
                  Website
                </a>
              ) : null}
            </div>

            {address ? (
              <div className="flex gap-3 border-b border-white/10 pb-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#9aa0a6]" aria-hidden />
                <div className="min-w-0 text-sm leading-relaxed text-[#e8eaed]">{address}</div>
              </div>
            ) : shop.area ? (
              <div className="flex gap-3 border-b border-white/10 pb-4">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[#9aa0a6]" aria-hidden />
                <div className="text-sm text-[#e8eaed]">{shop.area}</div>
              </div>
            ) : null}

            {(openSummary || weekdayLines) && (
              <div className="flex gap-3 border-b border-white/10 pb-4">
                <Clock className="mt-0.5 h-5 w-5 shrink-0 text-[#9aa0a6]" aria-hidden />
                <div className="min-w-0 text-sm">
                  {openSummary ? <p className="font-medium text-[#e8eaed]">{openSummary}</p> : null}
                  {weekdayLines ? (
                    <ul className="mt-2 space-y-1 text-[13px] text-[#bdc1c6]">
                      {weekdayLines.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            )}

            {summaryText ? <p className="text-sm leading-relaxed text-[#bdc1c6]">{summaryText}</p> : null}

            {shop.discount_summary ? (
              <div className="flex gap-3 rounded-xl bg-emerald-950/40 px-4 py-3 ring-1 ring-emerald-700/40">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" aria-hidden />
                <p className="text-sm font-medium leading-snug text-emerald-100">{shop.discount_summary}</p>
              </div>
            ) : null}

            {shop.services && shop.services.length > 0 ? (
              <div>
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
              </div>
            ) : null}

            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-[#80868b]">
              {rating != null ? (
                <>
                  <span className="font-medium text-[#fdd663]">{typeof rating === "number" ? rating.toFixed(1) : rating}</span>
                  <Star className="inline h-3.5 w-3.5 fill-[#fdd663] text-[#fdd663]" aria-hidden />
                  {reviewCount != null ? <span className="text-[#8ab4f8]">({reviewCount})</span> : null}
                </>
              ) : null}
              {primaryType || categoryLabel ? (
                <span className="text-[#bdc1c6]">
                  {rating != null ? " · " : ""}
                  {primaryType ?? categoryLabel}
                  {price ? ` · ${price}` : ""}
                </span>
              ) : price ? (
                <span>· {price}</span>
              ) : null}
            </div>
          </div>
        )}

        {tab === "photos" && (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {photos.length > 0 ? (
              photos.map((src) => (
                <button
                  key={src}
                  type="button"
                  onClick={() => openLightbox(photos, photos.indexOf(src))}
                  className="aspect-[4/3] overflow-hidden rounded-lg bg-[#3c4043]"
                >
                  <img src={src} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))
            ) : (
              <p className="col-span-full text-sm text-[#9aa0a6]">No photos available for this place.</p>
            )}
          </div>
        )}

        {tab === "about" && (
          <div className="space-y-4 text-sm">
            {summaryText ? <p className="leading-relaxed text-[#bdc1c6]">{summaryText}</p> : null}
            {types.length > 0 ? (
              <div>
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-[#9aa0a6]">Categories</p>
                <div className="flex flex-wrap gap-2">
                  {types.map((ty) => (
                    <span key={ty} className="rounded-full bg-[#3c4043] px-3 py-1 text-[12px] text-[#e8eaed]">
                      {ty.replace(/_/g, " ")}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
            {price ? (
              <p>
                <span className="text-[#9aa0a6]">Price: </span>
                {price}
              </p>
            ) : null}
            {website ? (
              <a href={website} target="_blank" rel="noopener noreferrer" className="inline-flex text-[#8ab4f8] hover:underline">
                {website}
              </a>
            ) : null}
          </div>
        )}

        {tab === "reviews" && (
          <div className="space-y-4">
            {reviews.length > 0 ? (
              reviews.map((rev, idx) => (
                <ReviewBlock
                  key={`${rev.reviewKey}-${idx}`}
                  rev={rev}
                  expandedReviewMap={expandedReviewMap}
                  setExpandedReviewMap={setExpandedReviewMap}
                  reviewPhotoRowsRef={reviewPhotoRowsRef}
                  scrollReviewPhotos={scrollReviewPhotos}
                  openLightbox={openLightbox}
                />
              ))
            ) : (
              <p className="text-sm text-[#9aa0a6]">No reviews returned for this listing.</p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-white/10 px-4 py-3 md:px-6">
        <p className="text-center text-[10px] leading-relaxed text-[#80868b]">
          <a
            href={
              googlePlaceIdForLink
                ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(googlePlaceIdForLink)}`
                : mapsUrl ?? "https://maps.google.com"
            }
            className="text-[#8ab4f8] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google Maps
          </a>
          {" · "}
          Data from Google Places. Show attributions as required for your use case (
          <a
            href="https://developers.google.com/maps/documentation/javascript/place-class-data-fields"
            className="text-[#8ab4f8] hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            field policies
          </a>
          ).
        </p>
      </div>

      {lightboxOpen ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightboxOpen(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setLightboxOpen(false);
            if (e.key === "ArrowLeft") goLightbox("prev");
            if (e.key === "ArrowRight") goLightbox("next");
          }}
          tabIndex={-1}
          onTouchStart={(e) => {
            setTouchStartX(e.changedTouches[0]?.clientX ?? null);
            setTouchEndX(null);
          }}
          onTouchMove={(e) => {
            setTouchEndX(e.changedTouches[0]?.clientX ?? null);
          }}
          onTouchEnd={() => {
            handleLightboxSwipe();
          }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setLightboxOpen(false);
            }}
            className="absolute right-4 top-4 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
            aria-label="Close fullscreen photo"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>

          {lightboxImages.length > 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goLightbox("prev");
              }}
              className="absolute left-4 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
              aria-label="Previous photo"
            >
              <ChevronLeft className="h-6 w-6" aria-hidden />
            </button>
          ) : null}

          {lightboxImages[lightboxIndex] ? (
            <img
              src={lightboxImages[lightboxIndex]}
              alt=""
              className="max-h-[90vh] max-w-[95vw] rounded-lg object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          ) : null}

          {lightboxImages.length > 1 ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goLightbox("next");
              }}
              className="absolute right-4 rounded-full bg-black/55 p-2 text-white hover:bg-black/75"
              aria-label="Next photo"
            >
              <ChevronRight className="h-6 w-6" aria-hidden />
            </button>
          ) : null}

          {lightboxImages.length > 1 ? (
            <p className="absolute bottom-4 rounded-full bg-black/55 px-3 py-1 text-xs text-white/90">
              {lightboxIndex + 1} / {lightboxImages.length}
            </p>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

const ReviewBlock: React.FC<{
  rev: ParsedGoogleReview;
  expandedReviewMap: Record<string, boolean>;
  setExpandedReviewMap: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  reviewPhotoRowsRef: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  scrollReviewPhotos: (reviewKey: string, direction: "prev" | "next") => void;
  openLightbox: (images: string[], index: number) => void;
}> = ({
  rev,
  expandedReviewMap,
  setExpandedReviewMap,
  reviewPhotoRowsRef,
  scrollReviewPhotos,
  openLightbox,
}) => (
  <div className="border-b border-white/10 pb-4 last:border-0">
    <div className="flex items-start justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {rev.authorPhotoUri ? (
          <img
            src={rev.authorPhotoUri}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full ring-1 ring-white/20"
            loading="lazy"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#3c4043] text-xs font-semibold text-[#e8eaed] ring-1 ring-white/20">
            {rev.author.trim().slice(0, 1).toUpperCase() || "R"}
          </div>
        )}
        <div className="min-w-0">
          {rev.authorUri ? (
            <a
              href={rev.authorUri}
              target="_blank"
              rel="noopener noreferrer"
              className="block truncate text-sm font-medium text-[#e8eaed] hover:text-[#8ab4f8] hover:underline"
            >
              {rev.author}
            </a>
          ) : (
            <span className="block truncate text-sm font-medium text-[#e8eaed]">{rev.author}</span>
          )}
          {rev.rel ? <p className="mt-0.5 text-[11px] text-[#9aa0a6]">{rev.rel}</p> : null}
        </div>
      </div>
      {rev.ratingVal != null ? (
        <span className="shrink-0 text-[13px] text-[#fdd663]">{rev.ratingVal.toFixed(1)} ★</span>
      ) : null}
    </div>
    {rev.body ? (
      <div className="mt-2">
        {rev.body.length > 280 && !expandedReviewMap[rev.reviewKey] ? (
          <p className="text-sm leading-relaxed text-[#bdc1c6]">
            {rev.body.slice(0, 280).trimEnd()}...{" "}
            <button
              type="button"
              onClick={() => setExpandedReviewMap((prev) => ({ ...prev, [rev.reviewKey]: true }))}
              className="font-medium text-[#8ab4f8] hover:underline"
            >
              More
            </button>
          </p>
        ) : (
          <p className="text-sm leading-relaxed text-[#bdc1c6]">
            {rev.body}{" "}
            {rev.body.length > 280 ? (
              <button
                type="button"
                onClick={() => setExpandedReviewMap((prev) => ({ ...prev, [rev.reviewKey]: false }))}
                className="font-medium text-[#8ab4f8] hover:underline"
              >
                Less
              </button>
            ) : null}
          </p>
        )}
      </div>
    ) : null}
    {rev.reviewPhotos.length > 0 ? (
      <div className="mt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#9aa0a6]">Shared photos</p>
          {rev.reviewPhotos.length > 1 ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => scrollReviewPhotos(rev.reviewKey, "prev")}
                className="rounded-full border border-white/15 p-1.5 text-[#bdc1c6] hover:bg-white/10 hover:text-white"
                aria-label="Previous review photos"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => scrollReviewPhotos(rev.reviewKey, "next")}
                className="rounded-full border border-white/15 p-1.5 text-[#bdc1c6] hover:bg-white/10 hover:text-white"
                aria-label="Next review photos"
              >
                <ChevronRight className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
        <div
          ref={(el) => {
            reviewPhotoRowsRef.current[rev.reviewKey] = el;
          }}
          className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [touch-action:pan-x_pan-y]"
        >
          {rev.reviewPhotos.map((src, photoIdx) => (
            <button key={src} type="button" onClick={() => openLightbox(rev.reviewPhotos, photoIdx)}>
              <img
                src={src}
                alt=""
                className="h-24 w-24 shrink-0 snap-start rounded-lg object-cover ring-1 ring-white/15"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      </div>
    ) : null}
    {rev.reviewMapsUri ? (
      <a
        href={rev.reviewMapsUri}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex text-xs text-[#8ab4f8] hover:underline"
      >
        View on Google Maps
      </a>
    ) : null}
  </div>
);
