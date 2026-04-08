import React, { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowLeft, Store } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { fetchOdMemberDirectory, fetchOdMemberDirectoryPreview, type OdDirectoryShop } from "../../lib/db/odDirectory";
import { fetchOdPlaceSearchCacheExtrasBatch, type OdPlaceSearchExtras } from "../../lib/odPlaceSearchCacheExtras";
import { getShopCategoryFilterLabel } from "../../lib/odMemberDirectoryDisplay";
import { cn } from "../../lib/utils";
import { startViewTransition } from "../../lib/viewTransition";
import { OdDirectoryShopDetailDialog } from "./OdDirectoryShopDetailDialog";
import { OdDirectoryShopCard } from "./OdDirectoryShopCard";

const GOOGLE_MAPS_KEY =
  typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === "string" ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY : "";

export const OdMemberDirectoryAllPage: React.FC = () => {
  const { currentMember } = useAuth();
  const [dirLoading, setDirLoading] = useState(true);
  const [dirShops, setDirShops] = useState<OdDirectoryShop[]>([]);
  const [dirPlaceExtras, setDirPlaceExtras] = useState<Record<string, OdPlaceSearchExtras>>({});
  const [dirError, setDirError] = useState<string | null>(null);
  const [previewOnly, setPreviewOnly] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<"all" | string>("all");
  const [directoryDetailShop, setDirectoryDetailShop] = useState<OdDirectoryShop | null>(null);

  const m = currentMember?.membership;
  const active =
    m?.status === "active" &&
    m.validUntil &&
    new Date(m.validUntil) > new Date() &&
    (!m.validFrom || new Date(m.validFrom) <= new Date());

  useEffect(() => {
    let cancelled = false;
    setDirLoading(true);
    setDirError(null);
    void (async () => {
      const res = active ? await fetchOdMemberDirectory() : await fetchOdMemberDirectoryPreview(6);
      if (cancelled) return;
      setDirLoading(false);
      setPreviewOnly(!active);
      if (res.ok === true) {
        setDirShops(res.shops);
      } else if (res.error === "membership_not_active") {
        setDirShops([]);
        setDirError(null);
      } else {
        setDirError(res.message ?? "Could not load directory.");
        setDirShops([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, m?.validUntil, m?.status]);

  useEffect(() => {
    if (dirShops.length === 0) {
      setDirPlaceExtras({});
      return;
    }
    const needSearch = dirShops.filter((s) => {
      const hasCat = Boolean(s.place_google_category?.trim());
      const hasOpen = s.place_open_now !== null || Boolean(s.place_opening_line?.trim());
      return !hasCat || !hasOpen;
    });
    if (needSearch.length === 0) {
      setDirPlaceExtras({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const extras = await fetchOdPlaceSearchCacheExtrasBatch(
        needSearch.map((s) => ({
          owner_id: s.owner_id,
          business_name: s.business_name,
          google_place_id: s.google_place_id,
        }))
      );
      if (!cancelled) setDirPlaceExtras(extras);
    })();
    return () => {
      cancelled = true;
    };
  }, [dirShops]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const shop of dirShops) {
      set.add(getShopCategoryFilterLabel(shop, dirPlaceExtras[shop.owner_id]));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
  }, [dirShops, dirPlaceExtras]);

  const filteredShops = useMemo(() => {
    if (categoryFilter === "all") return dirShops;
    return dirShops.filter(
      (shop) => getShopCategoryFilterLabel(shop, dirPlaceExtras[shop.owner_id]) === categoryFilter
    );
  }, [dirShops, dirPlaceExtras, categoryFilter]);

  if (!currentMember) {
    return <Navigate to="/od/member/login" replace />;
  }

  return (
    <div className="min-h-screen bg-[#f4f1ea] pb-12 pt-6">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <Link
            to="/od/account"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-[#1b1813] shadow-sm ring-1 ring-black/[0.06] transition hover:bg-[#faf9f6]"
            aria-label="Back to account"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight text-[#1b1813]">All participating shops</h1>
            <p className="mt-0.5 text-sm text-[#6d6658]">Member deals & verification</p>
          </div>
        </div>

        <div className="overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-sm">
          <div className="border-b border-black/[0.05] bg-gradient-to-b from-[#faf9f7] via-white to-white px-5 py-5 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1b1813]/[0.06] text-[#1b1813]">
                <Store className="h-5 w-5" aria-hidden />
              </div>
              <div className="min-w-0">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#8a8276]">
                  Browse by business category
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-[#3d3830]">
                  Categories combine your vendors’ industry (e.g. F&B) with Google Places data from our cache when
                  available (e.g. Restaurant, Clinic).
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-6">
            {previewOnly && dirShops.length > 0 && (
              <div className="mb-6 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm leading-relaxed text-amber-950">
                You are browsing a preview. Renew your membership on{" "}
                <Link to="/od/account" className="font-semibold underline decoration-amber-800/40">
                  Account
                </Link>{" "}
                for the full directory.
              </div>
            )}

            {dirLoading && (
              <div
                className="space-y-6"
                role="status"
                aria-busy="true"
                aria-label="Loading shops"
              >
                <span className="sr-only">Loading shops…</span>
                <div className="mb-6">
                  <div className="h-3 w-14 rounded bg-[#e8e4dc] animate-pulse" />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="h-9 w-[4.5rem] rounded-full bg-[#e8e4dc] animate-pulse" />
                    ))}
                  </div>
                </div>
                <ul className="grid list-none gap-6 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <li key={i}>
                      <div className="overflow-hidden rounded-[1.2rem] bg-[#faf9f6] shadow-[0_6px_24px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.06]">
                        <div className="aspect-[4/5] min-h-[168px] w-full bg-gradient-to-br from-[#e8e4dc] via-[#ece8e0] to-[#e0dcd4] animate-pulse sm:aspect-[16/10] sm:min-h-[200px]" />
                        <div className="space-y-3 p-4">
                          <div className="h-5 w-[72%] rounded-md bg-[#e8e4dc] animate-pulse" />
                          <div className="h-3.5 w-[40%] rounded-md bg-[#e8e4dc]/90 animate-pulse" />
                          <div className="pt-2">
                            <div className="h-2.5 w-24 rounded bg-[#e8e4dc] animate-pulse" />
                            <div className="mt-2 h-4 w-full max-w-[14rem] rounded-md bg-[#e8e4dc]/80 animate-pulse" />
                            <div className="mt-2 flex flex-wrap gap-2">
                              <div className="h-6 w-16 rounded-full bg-[#e8e4dc]/90 animate-pulse" />
                              <div className="h-6 flex-1 min-w-[8rem] rounded-md bg-[#e8e4dc]/70 animate-pulse" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {!dirLoading && dirError && <p className="text-sm text-red-600">{dirError}</p>}

            {!dirLoading && !dirError && dirShops.length === 0 && (
              <p className="rounded-2xl border border-dashed border-black/[0.1] bg-[#faf9f6] px-5 py-10 text-center text-[15px] text-[#6d6658]">
                No shops listed yet.
              </p>
            )}

            {!dirLoading && !dirError && dirShops.length > 0 && (
              <>
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Filter</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCategoryFilter("all")}
                      className={cn(
                        "rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200",
                        categoryFilter === "all"
                          ? "border-transparent bg-[#1b1813] text-white shadow-md shadow-black/15"
                          : "border-black/[0.08] bg-[#faf9f6] text-[#374151] hover:border-black/15"
                      )}
                    >
                      All
                    </button>
                    {categoryOptions.map((label) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => setCategoryFilter(label)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200",
                          categoryFilter === label
                            ? "border-transparent bg-[#1b1813] text-white shadow-md shadow-black/15"
                            : "border-black/[0.08] bg-[#faf9f6] text-[#374151] hover:border-black/15"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {filteredShops.length === 0 ? (
                  <p className="rounded-2xl border border-dashed border-black/[0.1] bg-[#faf9f6] px-5 py-8 text-center text-sm text-[#6d6658]">
                    No shops in this category. Try <strong>All</strong> or another filter.
                  </p>
                ) : (
                  <ul className="grid gap-6 sm:grid-cols-2">
                    {filteredShops.map((shop) => (
                      <li key={shop.owner_id}>
                        {directoryDetailShop?.owner_id === shop.owner_id ? (
                          <div
                            className="rounded-[1.2rem] bg-[#e8e4dc]/40 ring-1 ring-black/[0.06]"
                            style={{ minHeight: "min(420px, 72vw)" }}
                            aria-hidden
                          />
                        ) : (
                          <OdDirectoryShopCard
                            shop={shop}
                            placeExtra={dirPlaceExtras[shop.owner_id]}
                            googleMapsApiKey={GOOGLE_MAPS_KEY}
                            onSelect={() => {
                              startViewTransition(() => setDirectoryDetailShop(shop));
                            }}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {directoryDetailShop ? (
        <OdDirectoryShopDetailDialog
          open
          shop={directoryDetailShop}
          placeExtra={dirPlaceExtras[directoryDetailShop.owner_id]}
          googleMapsApiKey={GOOGLE_MAPS_KEY}
          onOpenChange={(open) => {
            if (!open) {
              startViewTransition(() => setDirectoryDetailShop(null));
            }
          }}
        />
      ) : null}
    </div>
  );
};
