import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, PartyPopper, Sparkles, Tag } from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { Label } from "./ui/label";
import { OdGooglePlaceSearch } from "./OdGooglePlaceSearch";
import { useAuth } from "./AuthProvider";
import { VendorPublicPlaceCard } from "./VendorPublicPlaceCard";
import type { PublicVendorHandle } from "../lib/db/publicHandle";
import { fetchGooglePlaceDetails } from "../lib/googlePlaceDetails";
import { normalizeOdListingAreaValue } from "../lib/odListingAreaLocations";
import { supabase } from "../lib/supabase";
import { cn } from "../lib/utils";

function normalizeOdMapsUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const rest = t.replace(/^\/\//, "");
  if (rest.includes("maps.google") || rest.includes("goo.gl") || rest.includes("g.page") || rest.includes("maps.app")) {
    return `https://${rest}`;
  }
  return rest.includes(".") ? `https://${rest}` : t;
}

const STEP_META = [
  { label: "Google", title: "Link on Google", description: "Search for your shop and select the correct listing." },
  { label: "Discount", title: "Member discount", description: "Set the offer line shown to OD members." },
  { label: "Preview", title: "Member preview", description: "See the Google-style card members get on your listing." },
] as const;

export const VendorDashboardOnboarding: React.FC = () => {
  const { currentOwner, currentUser, refreshProfile } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const initStepRef = useRef(false);

  const [odListingArea, setOdListingArea] = useState("");
  const [odListingLat, setOdListingLat] = useState<number | null>(null);
  const [odListingLng, setOdListingLng] = useState<number | null>(null);
  const [odMapsUrl, setOdMapsUrl] = useState("");
  const [odGooglePlaceId, setOdGooglePlaceId] = useState("");
  const [odDiscountSummary, setOdDiscountSummary] = useState("");
  const [listingLoaded, setListingLoaded] = useState(false);

  const [placePayload, setPlacePayload] = useState<Record<string, unknown> | null>(null);
  const [placeLoading, setPlaceLoading] = useState(false);
  const [placeErr, setPlaceErr] = useState<string | null>(null);

  const [stepBusy, setStepBusy] = useState(false);
  const [stepErr, setStepErr] = useState<string | null>(null);
  const [finishBusy, setFinishBusy] = useState(false);

  const ownerId = currentOwner?.id;
  const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  const googleLinked = Boolean(currentOwner?.odGooglePlaceId?.trim());
  const hasOffer = Boolean(currentOwner?.odDiscountSummary?.trim());

  const onboardingDone = currentOwner?.vendorOnboardingCompleted === true;

  useEffect(() => {
    if (!ownerId) return;
    let cancelled = false;
    void (async () => {
      const { data: row, error } = await supabase
        .from("profiles")
        .select(
          "od_listing_area, od_listing_lat, od_listing_lng, od_maps_url, od_google_place_id, od_discount_summary"
        )
        .eq("id", ownerId)
        .maybeSingle();
      if (cancelled || error || !row) {
        if (!cancelled) setListingLoaded(true);
        return;
      }
      const r = row as {
        od_listing_area?: string | null;
        od_listing_lat?: number | null;
        od_listing_lng?: number | null;
        od_maps_url?: string | null;
        od_google_place_id?: string | null;
        od_discount_summary?: string | null;
      };
      setOdListingArea(normalizeOdListingAreaValue(r.od_listing_area ?? ""));
      const lat = r.od_listing_lat;
      const lng = r.od_listing_lng;
      setOdListingLat(typeof lat === "number" && Number.isFinite(lat) ? lat : null);
      setOdListingLng(typeof lng === "number" && Number.isFinite(lng) ? lng : null);
      setOdMapsUrl(r.od_maps_url ?? "");
      setOdGooglePlaceId((r.od_google_place_id ?? "").trim());
      setOdDiscountSummary(r.od_discount_summary ?? "");
      setListingLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  useEffect(() => {
    if (!listingLoaded || !currentOwner || initStepRef.current) return;
    initStepRef.current = true;
    if (!googleLinked) setActiveStep(0);
    else if (!hasOffer) setActiveStep(1);
    else setActiveStep(2);
  }, [listingLoaded, currentOwner, googleLinked, hasOffer]);

  const previewVendor = useMemo((): PublicVendorHandle => {
    const slug = (currentOwner?.slug ?? "").trim() || "preview";
    return {
      kind: "vendor",
      slug,
      business_name: (currentOwner?.businessName ?? "").trim() || "Your business",
      listing_area: currentOwner?.odListingArea
        ? normalizeOdListingAreaValue(currentOwner.odListingArea)
        : null,
      discount_summary: currentOwner?.odDiscountSummary?.trim() || null,
      maps_url: currentOwner?.odMapsUrl && /^https?:\/\//i.test(currentOwner.odMapsUrl) ? currentOwner.odMapsUrl : null,
      logo_url: (currentOwner?.odLogoUrl ?? "").trim() || null,
      shop_photo_url: (currentOwner?.odShopPhotoUrl ?? "").trim() || null,
      business_category: currentOwner?.odBusinessCategory ?? null,
      directory_visible: true,
      google_place_id: currentOwner?.odGooglePlaceId?.trim() || null,
      place_details: null,
    };
  }, [currentOwner]);

  useEffect(() => {
    const pid = currentOwner?.odGooglePlaceId?.trim();
    if (!pid || !mapsKey) {
      setPlacePayload(null);
      setPlaceErr(!pid ? null : "Add VITE_GOOGLE_MAPS_API_KEY to preview place details locally.");
      setPlaceLoading(false);
      return;
    }
    let cancelled = false;
    setPlaceLoading(true);
    setPlaceErr(null);
    void fetchGooglePlaceDetails(pid, mapsKey)
      .then((d) => {
        if (!cancelled) setPlacePayload(d);
      })
      .catch(() => {
        if (!cancelled) {
          setPlaceErr("Could not load Google place details for preview.");
          setPlacePayload(null);
        }
      })
      .finally(() => {
        if (!cancelled) setPlaceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentOwner?.odGooglePlaceId, mapsKey]);

  useEffect(() => {
    if (onboardingDone) setDialogOpen(false);
  }, [onboardingDone]);

  const saveStep1 = useCallback(async () => {
    if (!ownerId) return;
    const pid = odGooglePlaceId.trim();
    if (!pid) {
      setStepErr("Search and select your shop from the results.");
      return;
    }
    setStepBusy(true);
    setStepErr(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          od_listing_area: normalizeOdListingAreaValue(odListingArea) || null,
          od_listing_lat: odListingLat,
          od_listing_lng: odListingLng,
          od_maps_url: normalizeOdMapsUrl(odMapsUrl),
          od_google_place_id: pid,
        })
        .eq("id", ownerId);
      if (error) throw new Error("Could not save listing.");
      if (mapsKey) {
        try {
          const details = await fetchGooglePlaceDetails(pid, mapsKey);
          await supabase.rpc("upsert_od_place_details_cache", {
            p_place_id: pid,
            p_payload: details,
            p_ttl_days: 30,
          });
        } catch {
          /* cache optional */
        }
      }
      await refreshProfile();
      setActiveStep(1);
    } catch (e) {
      setStepErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setStepBusy(false);
    }
  }, [
    ownerId,
    odGooglePlaceId,
    odListingArea,
    odListingLat,
    odListingLng,
    odMapsUrl,
    mapsKey,
    refreshProfile,
  ]);

  const saveStep2 = useCallback(async () => {
    if (!ownerId) return;
    const t = odDiscountSummary.trim();
    if (!t) {
      setStepErr("Enter a short discount or offer for members.");
      return;
    }
    setStepBusy(true);
    setStepErr(null);
    try {
      const { error } = await supabase.from("profiles").update({ od_discount_summary: t }).eq("id", ownerId);
      if (error) throw new Error("Could not save offer.");
      await refreshProfile();
      setActiveStep(2);
    } catch (e) {
      setStepErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setStepBusy(false);
    }
  }, [ownerId, odDiscountSummary, refreshProfile]);

  const handleFinish = useCallback(async () => {
    if (!ownerId) return;
    setFinishBusy(true);
    setStepErr(null);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ vendor_onboarding_completed: true })
        .eq("id", ownerId);
      if (error) throw new Error("Could not finish setup.");
      await refreshProfile();
      setDialogOpen(false);
    } catch (e) {
      setStepErr(e instanceof Error ? e.message : "Could not finish.");
    } finally {
      setFinishBusy(false);
    }
  }, [ownerId, refreshProfile]);

  if (!currentOwner || currentUser?.role !== "owner" || onboardingDone) {
    return null;
  }

  const step1Done = googleLinked;
  const step2Done = hasOffer;

  return (
    <>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className={cn(
            "max-h-[min(90dvh,880px)] w-[calc(100vw-1.5rem)] max-w-4xl gap-0 overflow-hidden p-0 sm:rounded-[28px]",
            "top-[48%] translate-y-[-48%] sm:top-[50%] sm:translate-y-[-50%]"
          )}
        >
          <DialogTitle className="sr-only">Partner setup — link Google, set discount, preview</DialogTitle>
          <div className="max-h-[min(90dvh,880px)] overflow-y-auto overscroll-contain">
            <Card className="border-0 shadow-none sm:rounded-[28px]">
              <CardHeader className="border-b border-border/70 bg-gradient-to-br from-muted/40 to-background pb-4">
                <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background">
                      <PartyPopper className="h-5 w-5" aria-hidden />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Welcome to your partner dashboard</CardTitle>
                      <CardDescription className="mt-1.5 text-sm leading-relaxed">
                        Complete the steps below. You can edit everything later in Shop setup.
                      </CardDescription>
                    </div>
                  </div>
                </div>

                <nav aria-label="Setup steps" className="mt-4">
                  <ol className="flex items-center justify-center gap-0 sm:gap-1">
                    {STEP_META.map((s, i) => {
                      const isActive = activeStep === i;
                      const done = i === 0 ? step1Done : i === 1 ? step2Done : false;
                      const past = activeStep > i || done;
                      const canJump =
                        i <= activeStep || (i === 1 && step1Done) || (i === 2 && step1Done && step2Done);
                      return (
                        <li key={s.label} className="flex items-center">
                          {i > 0 ? (
                            <div
                              className={cn(
                                "mx-1 h-px w-6 sm:w-10",
                                activeStep >= i ? "bg-emerald-500" : "bg-border"
                              )}
                              aria-hidden
                            />
                          ) : null}
                          <button
                            type="button"
                            className={cn(
                              "flex min-w-[4.5rem] flex-col items-center gap-1 rounded-xl px-2 py-2 text-center transition-colors sm:min-w-[6rem]",
                              isActive && "bg-foreground/5 ring-1 ring-border",
                              !isActive && "opacity-90 hover:bg-muted/50"
                            )}
                            disabled={!canJump && i > activeStep}
                            onClick={() => {
                              if (canJump) {
                                setActiveStep(i);
                                setStepErr(null);
                              }
                            }}
                          >
                            <span
                              className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold",
                                past || done
                                  ? "bg-emerald-600 text-white"
                                  : isActive
                                    ? "bg-foreground text-background"
                                    : "bg-muted text-muted-foreground"
                              )}
                            >
                              {past || done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                            </span>
                            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">
                              {s.label}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ol>
                </nav>
              </CardHeader>

              <CardContent className="space-y-6 px-4 pb-6 pt-5 sm:px-6">
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">{STEP_META[activeStep].title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{STEP_META[activeStep].description}</p>
                </div>

                {stepErr && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                    {stepErr}
                  </div>
                )}

                {activeStep === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="onb-place-search">Search your shop name</Label>
                      <OdGooglePlaceSearch
                        id="onb-place-search"
                        value={odListingArea}
                        onChange={setOdListingArea}
                        listingLat={odListingLat}
                        listingLng={odListingLng}
                        onCoordinatesChange={(lat, lng) => {
                          setOdListingLat(lat);
                          setOdListingLng(lng);
                        }}
                        onMapsUrlChange={setOdMapsUrl}
                        onGooglePlaceIdChange={(id) => setOdGooglePlaceId(id ?? "")}
                        disabled={stepBusy}
                      />
                      <p className="text-xs text-muted-foreground">
                        Type your business name, tap Search, then pick the row that matches your Google listing.
                      </p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-2 border-t border-border/60 pt-4">
                      <Button
                        type="button"
                        className="rounded-full"
                        disabled={stepBusy || !odGooglePlaceId.trim()}
                        onClick={() => void saveStep1()}
                      >
                        {stepBusy ? "Saving…" : "Save & continue"}
                        {!stepBusy && <ChevronRight className="ml-1 h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="onb-discount">OD member offer</Label>
                      <textarea
                        id="onb-discount"
                        value={odDiscountSummary}
                        onChange={(e) => setOdDiscountSummary(e.target.value)}
                        placeholder='e.g. "10% off bill" or "Buy 2 get 1 on selected items"'
                        rows={4}
                        disabled={stepBusy}
                        className="flex w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                    <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full"
                        disabled={stepBusy}
                        onClick={() => {
                          setActiveStep(0);
                          setStepErr(null);
                        }}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="rounded-full"
                        disabled={stepBusy || !odDiscountSummary.trim()}
                        onClick={() => void saveStep2()}
                      >
                        {stepBusy ? "Saving…" : "Save & continue"}
                        {!stepBusy && <ChevronRight className="ml-1 h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Sparkles className="h-4 w-4 shrink-0 text-violet-600" aria-hidden />
                      <span className="text-sm">This is the same Google-style card members see when your place is linked.</span>
                    </div>
                    {!googleLinked ? (
                      <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        Complete step 1 to load the preview.
                      </p>
                    ) : placeLoading ? (
                      <div className="flex justify-center py-14">
                        <div className="h-9 w-9 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                      </div>
                    ) : placeErr ? (
                      <p className="text-sm text-destructive">{placeErr}</p>
                    ) : placePayload && Object.keys(placePayload).length > 0 ? (
                      <div className="mx-auto max-w-md overflow-hidden rounded-xl shadow-lg ring-1 ring-border">
                        <VendorPublicPlaceCard vendor={previewVendor} placeDetails={placePayload} />
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">No place details yet. Go back and save your Google listing.</p>
                    )}
                    <div className="flex flex-wrap justify-between gap-2 border-t border-border/60 pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full"
                        disabled={finishBusy}
                        onClick={() => {
                          setActiveStep(1);
                          setStepErr(null);
                        }}
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="button"
                        className="rounded-full"
                        disabled={finishBusy || !step1Done || !step2Done}
                        onClick={() => void handleFinish()}
                      >
                        {finishBusy ? "Finishing…" : "Finish setup"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {!dialogOpen && (
        <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2 sm:bottom-8 sm:right-8">
          <Button type="button" size="sm" className="rounded-full shadow-lg" onClick={() => setDialogOpen(true)}>
            Finish shop setup
          </Button>
        </div>
      )}
    </>
  );
};
