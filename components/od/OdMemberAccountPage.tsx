import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Check, CheckCircle2, ChevronLeft, ChevronRight, LogOut, MapPin, PartyPopper, RefreshCw, Store } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useAuth } from "../AuthProvider";
import { OD_RENEWAL_PACKAGES, formatRm, odPlanLabel, type OdRenewalPackage } from "../../lib/odPricing";
import { memberSelfRenewOdMembership } from "../../lib/db/members";
import { startOdRenewalViaBayarcash } from "../../lib/odRenewalCheckout";
import {
  fetchOdMemberDirectory,
  fetchOdMemberDirectoryPreview,
  type OdDirectoryShop,
} from "../../lib/db/odDirectory";
import { cn } from "../../lib/utils";
import { OD_BUSINESS_CATEGORIES } from "../../lib/odBusinessCategories";
import { OD_INDUSTRY_FILTER_LABEL, shopMatchesIndustryFilter } from "../../lib/odMemberDirectoryFilters";
import { buildAppUrl } from "../../lib/siteConfig";
import {
  fetchOdPlaceSearchCacheExtrasBatch,
  type OdPlaceSearchExtras,
} from "../../lib/odPlaceSearchCacheExtras";
import { startViewTransition } from "../../lib/viewTransition";
import { OdDirectoryShopDetailDialog } from "./OdDirectoryShopDetailDialog";
import { OdDirectoryShopCard } from "./OdDirectoryShopCard";
import { OdMembershipCard } from "./OdMembershipCard";
import {
  Map,
  MapControls,
  MapMarker,
  MarkerContent,
  MarkerLabel,
  MarkerPopup,
  MarkerTooltip,
  type MapRef,
} from "../ui/map";
import { reverseGeocodeToAreaLine } from "../../lib/reverseGeocodeArea";
import {
  OD_MEMBER_GEO_MOVE_THRESHOLD_M,
  clearMemberGeoPromptDeclined,
  formatGeolocationUserMessage,
  getCurrentPositionWithAccuracyFallback,
  haversineDistanceMeters,
  isGeolocationPositionError,
  isMemberGeoPromptDeclined,
  loadMemberGeoFromLocalStorage,
  saveMemberGeoToLocalStorage,
  setMemberGeoPromptDeclined,
} from "../../lib/odMemberLocalGeo";

const inputCls =
  "h-12 rounded-xl border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none focus-visible:ring-0";

const GOOGLE_MAPS_KEY =
  typeof import.meta.env.VITE_GOOGLE_MAPS_API_KEY === "string" ? import.meta.env.VITE_GOOGLE_MAPS_API_KEY : "";

const odPaymentsEnabled =
  import.meta.env.VITE_OD_BAYARCASH_RENEWAL === "true" || import.meta.env.VITE_OD_PAYMENTS_ENABLED === "true";

/** OpenFreeMap raster styles; `default` uses built-in Carto GL in `Map`. */
const OD_MEMBER_MAP_STYLES = {
  default: undefined as string | undefined,
  openstreetmap: "https://tiles.openfreemap.org/styles/bright",
  openstreetmap3d: "https://tiles.openfreemap.org/styles/liberty",
} as const;

type OdMemberMapStyleKey = keyof typeof OD_MEMBER_MAP_STYLES;

export const OdMemberAccountPage: React.FC = () => {
  const { currentMember, logout, updateMemberDisplayName, updateMemberPublicUsername, refreshMemberProfile } =
    useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [name, setName] = useState(currentMember?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [renewDialogPkg, setRenewDialogPkg] = useState<OdRenewalPackage | null>(null);
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [renewError, setRenewError] = useState("");
  const [publicUsernameInput, setPublicUsernameInput] = useState("");
  const [publicUsernameMsg, setPublicUsernameMsg] = useState("");
  const [publicUsernameErr, setPublicUsernameErr] = useState("");
  const [publicUsernameBusy, setPublicUsernameBusy] = useState(false);

  const [dirLoading, setDirLoading] = useState(false);
  const [dirShops, setDirShops] = useState<OdDirectoryShop[]>([]);
  const [dirPlaceExtras, setDirPlaceExtras] = useState<Record<string, OdPlaceSearchExtras>>({});
  const [dirError, setDirError] = useState<string | null>(null);
  const [dirPreviewOnly, setDirPreviewOnly] = useState(false);
  const [industryFilter, setIndustryFilter] = useState<"all" | string>("all");
  const [directoryDetailShop, setDirectoryDetailShop] = useState<OdDirectoryShop | null>(null);
  const [statusAccordionValue, setStatusAccordionValue] = useState<string | undefined>(undefined);
  const [locationAccordionValue, setLocationAccordionValue] = useState<string | undefined>(undefined);

  const [geoDialogOpen, setGeoDialogOpen] = useState(false);
  const [geoCoords, setGeoCoords] = useState<{
    lat: number;
    lng: number;
    accuracyM: number | null;
  } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [geoAddress, setGeoAddress] = useState<string | null>(null);
  const [geoCapturedAt, setGeoCapturedAt] = useState<string | null>(null);
  const [geoLocationNote, setGeoLocationNote] = useState("");
  const [geoSilentBusy, setGeoSilentBusy] = useState(false);
  const [memberMapStyle, setMemberMapStyle] = useState<OdMemberMapStyleKey>("openstreetmap3d");
  const memberMapRef = useRef<MapRef | null>(null);
  const [memberOnboardingOpen, setMemberOnboardingOpen] = useState(false);
  const [memberOnboardingStep, setMemberOnboardingStep] = useState(0);
  const [memberOnboardingBusy, setMemberOnboardingBusy] = useState(false);
  const [memberOnboardingErr, setMemberOnboardingErr] = useState("");
  const [memberOnboardingMsg, setMemberOnboardingMsg] = useState("");

  const memberMapOpenFreeStyle = OD_MEMBER_MAP_STYLES[memberMapStyle];
  const memberMapStylesProp =
    memberMapOpenFreeStyle != null
      ? { light: memberMapOpenFreeStyle, dark: memberMapOpenFreeStyle }
      : undefined;

  useEffect(() => {
    if (!geoCoords || locationAccordionValue !== "location") return;
    const is3d = memberMapStyle === "openstreetmap3d";
    const id = window.setTimeout(() => {
      memberMapRef.current?.easeTo({ pitch: is3d ? 60 : 0, duration: 500 });
    }, 350);
    return () => window.clearTimeout(id);
  }, [memberMapStyle, geoCoords?.lat, geoCoords?.lng, locationAccordionValue]);

  const commitGeoReading = React.useCallback(async (memberId: string, pos: GeolocationPosition) => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const acc = pos.coords.accuracy != null ? Math.round(pos.coords.accuracy) : null;
    const prev = loadMemberGeoFromLocalStorage(memberId);
    const distM = prev ? haversineDistanceMeters(prev.lat, prev.lng, lat, lng) : 0;
    const moved = prev !== null && distM > OD_MEMBER_GEO_MOVE_THRESHOLD_M;

    let address: string | null = null;
    try {
      address = await reverseGeocodeToAreaLine(lat, lng);
    } catch {
      address = null;
    }

    const capturedAt = new Date().toISOString();
    saveMemberGeoToLocalStorage(memberId, { lat, lng, accuracyM: acc, address, capturedAt });

    setGeoCoords({ lat, lng, accuracyM: acc });
    setGeoAddress(address);
    setGeoCapturedAt(capturedAt);

    if (moved) {
      const distLabel =
        distM < 1000 ? `${Math.round(distM)} m` : `${(distM / 1000).toFixed(1)} km`;
      setGeoLocationNote(`Location updated — about ${distLabel} from your last saved spot on this device.`);
      window.setTimeout(() => setGeoLocationNote(""), 8000);
    }
  }, []);

  const requestMemberLocation = React.useCallback(
    async (memberId: string) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        setGeoError("Location is not supported on this device.");
        return;
      }
      setGeoLoading(true);
      setGeoError(null);
      try {
        const pos = await getCurrentPositionWithAccuracyFallback();
        await commitGeoReading(memberId, pos);
      } catch (e: unknown) {
        if (isGeolocationPositionError(e)) {
          setGeoError(formatGeolocationUserMessage(e));
        } else if (e instanceof Error && e.message === "Geolocation not supported") {
          setGeoError("Location is not supported on this device.");
        } else {
          setGeoError("Could not read your location.");
        }
      } finally {
        setGeoLoading(false);
      }
    },
    [commitGeoReading]
  );

  useEffect(() => {
    if (!currentMember) return;
    if (typeof window === "undefined") return;
    const id = currentMember.id;
    const profileReady = Boolean(currentMember.displayName?.trim()) && Boolean(currentMember.publicUsername?.trim());

    const stored = loadMemberGeoFromLocalStorage(id);
    if (stored) {
      setGeoCoords({ lat: stored.lat, lng: stored.lng, accuracyM: stored.accuracyM });
      setGeoAddress(stored.address);
      setGeoCapturedAt(stored.capturedAt);
    } else {
      setGeoCoords(null);
      setGeoAddress(null);
      setGeoCapturedAt(null);
    }

    // Prevent overlap with member onboarding modal and only prompt after profile step is complete.
    if (!profileReady || memberOnboardingOpen) return;
    if (stored || isMemberGeoPromptDeclined(id)) return;
    const t = window.setTimeout(() => setGeoDialogOpen(true), 450);
    return () => window.clearTimeout(t);
  }, [currentMember?.id, currentMember?.displayName, currentMember?.publicUsername, memberOnboardingOpen]);

  useEffect(() => {
    if (!currentMember) return;
    if (typeof window === "undefined" || !navigator.geolocation) return;
    const id = currentMember.id;
    if (!loadMemberGeoFromLocalStorage(id)) return;

    let cancelled = false;
    setGeoSilentBusy(true);
    void (async () => {
      try {
        const pos = await getCurrentPositionWithAccuracyFallback();
        if (cancelled) return;
        await commitGeoReading(id, pos);
      } catch {
        /* silent refresh — no toast; user can use “Use my location” for a message */
      } finally {
        if (!cancelled) setGeoSilentBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentMember?.id, commitGeoReading]);

  React.useEffect(() => {
    setName(currentMember?.displayName ?? "");
  }, [currentMember?.displayName]);

  React.useEffect(() => {
    setPublicUsernameInput(currentMember?.publicUsername ?? "");
  }, [currentMember?.publicUsername]);

  useEffect(() => {
    const pay = searchParams.get("od_pay");
    if (!pay) return;

    if (pay === "success") {
      setRenewError("");
      setMsg("Payment received. Your membership is now active.");
      void refreshMemberProfile();
      window.setTimeout(() => setMsg(""), 6000);
    } else if (pay === "error") {
      const reason = searchParams.get("reason");
      const detail = searchParams.get("detail");
      const reasonPart = reason ? reason.replace(/_/g, " ") : "";
      const detailPart = detail ? ` — ${detail}` : "";
      setRenewError(
        reason
          ? `Payment did not complete (${reasonPart}${detailPart}).`
          : detail
            ? `Payment did not complete. ${detail}`
            : "Payment did not complete."
      );
    }

    const next = new URLSearchParams(searchParams);
    next.delete("od_pay");
    next.delete("reason");
    next.delete("detail");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, refreshMemberProfile]);

  if (!currentMember) return null;

  const m = currentMember.membership;
  const active =
    m?.status === "active" &&
    m.validUntil &&
    new Date(m.validUntil) > new Date() &&
    (!m.validFrom || new Date(m.validFrom) <= new Date());
  const memberProfileStepDone = Boolean(currentMember.displayName.trim()) && Boolean(currentMember.publicUsername?.trim());
  const memberLocationStepDone = Boolean(geoCoords);
  const memberSubscriptionStepDone = active;
  const memberOnboardingDone = memberProfileStepDone && memberLocationStepDone && memberSubscriptionStepDone;

  useEffect(() => {
    let cancelled = false;
    setDirLoading(true);
    setDirError(null);
    setDirPreviewOnly(!active);
    void (async () => {
      const res = active ? await fetchOdMemberDirectory() : await fetchOdMemberDirectoryPreview(2);
      if (cancelled) return;
      setDirLoading(false);
      if (res.ok === true) {
        setDirShops(res.shops);
        if (!active) setDirPreviewOnly(true);
      } else if (res.error === "membership_not_active") {
        setDirShops([]);
        setDirError(null);
      } else {
        setDirError(
          active ? res.message ?? "Could not load directory." : res.message ?? "Could not load vendor preview."
        );
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

  useEffect(() => {
    if (memberOnboardingDone) {
      setMemberOnboardingOpen(false);
      return;
    }
    setMemberOnboardingOpen(true);
    if (!memberProfileStepDone) {
      setMemberOnboardingStep(0);
      return;
    }
    if (!memberLocationStepDone) {
      setMemberOnboardingStep(1);
      return;
    }
    setMemberOnboardingStep(2);
  }, [memberOnboardingDone, memberProfileStepDone, memberLocationStepDone]);

  const filteredShops = useMemo(() => {
    return dirShops.filter((shop) => shopMatchesIndustryFilter(shop.business_category, industryFilter));
  }, [dirShops, industryFilter]);
  const directoryShopsToRender = active ? filteredShops : dirShops;

  const accountQrUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/od/account`;
  }, []);

  const handleConfirmRenew = async () => {
    if (!renewDialogPkg) return;
    setRenewError("");
    setRenewSubmitting(true);
    try {
      if (odPaymentsEnabled) {
        const payOut = await startOdRenewalViaBayarcash(renewDialogPkg.plan);
        setRenewSubmitting(false);
        if (payOut.ok !== true) {
          setRenewError(payOut.error);
          return;
        }
        return;
      }

      const result = await memberSelfRenewOdMembership(renewDialogPkg.plan);
      setRenewSubmitting(false);
      if (result.ok === false) {
        setRenewError(result.error);
        return;
      }
      setRenewDialogPkg(null);
      void refreshMemberProfile();
      setMsg("Your subscription is now active for the selected period.");
      window.setTimeout(() => setMsg(""), 4000);
    } catch {
      setRenewSubmitting(false);
      setRenewError("Something went wrong. Try again.");
    }
  };

  const handleSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setErr("");
    setMsg("");
    setBusy(true);
    const result = await updateMemberDisplayName(name);
    setBusy(false);
    if (result.ok === false) {
      setErr(result.error);
      return;
    }
    setMsg("Saved.");
    void refreshMemberProfile();
    window.setTimeout(() => setMsg(""), 2500);
  };

  const handleSavePublicUsername = async (event: React.FormEvent) => {
    event.preventDefault();
    setPublicUsernameErr("");
    setPublicUsernameMsg("");
    setPublicUsernameBusy(true);
    const trimmed = publicUsernameInput.trim().toLowerCase();
    const result = await updateMemberPublicUsername(trimmed === "" ? null : trimmed);
    setPublicUsernameBusy(false);
    if (result.ok === false) {
      setPublicUsernameErr(result.error);
      return;
    }
    setPublicUsernameMsg("Saved.");
    void refreshMemberProfile();
    window.setTimeout(() => setPublicUsernameMsg(""), 3000);
  };

  const handleOnboardingSaveProfile = async () => {
    setMemberOnboardingErr("");
    setMemberOnboardingMsg("");
    const nextName = name.trim();
    const nextPublic = publicUsernameInput.trim().toLowerCase();
    if (!nextName) {
      setMemberOnboardingErr("Display name is required.");
      return;
    }
    if (!nextPublic) {
      setMemberOnboardingErr("Public profile username is required.");
      return;
    }
    setMemberOnboardingBusy(true);
    const nameResult = await updateMemberDisplayName(nextName);
    if (nameResult.ok === false) {
      setMemberOnboardingBusy(false);
      setMemberOnboardingErr(nameResult.error);
      return;
    }
    const usernameResult = await updateMemberPublicUsername(nextPublic);
    setMemberOnboardingBusy(false);
    if (usernameResult.ok === false) {
      setMemberOnboardingErr(usernameResult.error);
      return;
    }
    setMemberOnboardingMsg("Profile saved.");
    await refreshMemberProfile();
    setMemberOnboardingStep(1);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef] px-4 py-10">
      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-between">
      
      {/* show logo here */}
      <img src="/odmember.png" alt="ODMember" className="h-12 sm:h-20 w-auto" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-black/10"
          onClick={() => void handleLogout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
        <Dialog open={memberOnboardingOpen} onOpenChange={setMemberOnboardingOpen}>
          <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto rounded-[1.25rem]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-[#1b1813]">
                <PartyPopper className="h-5 w-5" aria-hidden />
                Member onboarding
              </DialogTitle>
            </DialogHeader>

            <ol className="flex items-center justify-center gap-2">
              {[
                { label: "Profile", done: memberProfileStepDone },
                { label: "Location", done: memberLocationStepDone },
                { label: "Package", done: memberSubscriptionStepDone },
              ].map((step, idx) => {
                const activeStep = memberOnboardingStep === idx;
                const unlocked =
                  idx === 0 || (idx === 1 && memberProfileStepDone) || (idx === 2 && memberProfileStepDone && memberLocationStepDone);
                return (
                  <li key={step.label} className="flex items-center gap-2">
                    {idx > 0 && <span className={cn("h-px w-6", memberOnboardingStep >= idx ? "bg-emerald-500" : "bg-black/10")} />}
                    <button
                      type="button"
                      className={cn(
                        "rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.08em]",
                        activeStep ? "bg-[#1b1813] text-white" : "bg-[#f4f1ea] text-[#6d6658]",
                        !unlocked && "opacity-50"
                      )}
                      disabled={!unlocked}
                      onClick={() => setMemberOnboardingStep(idx)}
                    >
                      {step.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : idx + 1} {step.label}
                    </button>
                  </li>
                );
              })}
            </ol>

            {memberOnboardingErr && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{memberOnboardingErr}</div>
            )}
            {memberOnboardingMsg && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{memberOnboardingMsg}</div>
            )}

            {memberOnboardingStep === 0 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-[#1b1813]">1. Update basic profile</p>
                  <p className="text-sm text-[#6d6658]">Set your display name and public username so your member profile can be shared.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6B7280]">Display name</label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-[#6B7280]">Public username</label>
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 text-sm text-[#6d6658]">{buildAppUrl("/").replace(/\/$/, "")}/</span>
                    <Input
                      value={publicUsernameInput}
                      onChange={(e) => setPublicUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                      className={cn(inputCls, "flex-1")}
                      placeholder="mykluang"
                      autoComplete="off"
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="button" disabled={memberOnboardingBusy} className="rounded-full bg-[#1b1813] hover:bg-[#11100d]" onClick={() => void handleOnboardingSaveProfile()}>
                    {memberOnboardingBusy ? "Saving…" : <>Save & continue <ChevronRight className="ml-1 h-4 w-4" /></>}
                  </Button>
                </div>
              </div>
            )}

            {memberOnboardingStep === 1 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-[#1b1813]">2. Location request</p>
                  <p className="text-sm text-[#6d6658]">Allow location so we can show nearby participating shops.</p>
                </div>
                {geoCoords ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Location captured: {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
                  </div>
                ) : (
                  <div className="rounded-xl border border-black/[0.08] bg-[#faf9f7] px-3 py-2 text-sm text-[#6d6658]">
                    We only store this on your device (localStorage).
                  </div>
                )}
                <div className="flex flex-wrap justify-between gap-2">
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setMemberOnboardingStep(0)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full bg-[lightgreen] hover:bg-[lightgreen/80]"
                      disabled={geoLoading || geoSilentBusy}
                      onClick={() => void requestMemberLocation(currentMember.id)}
                    >
                      {geoLoading || geoSilentBusy ? "Getting location…" : "Use my location"}
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full bg-[#1b1813] hover:bg-[#11100d]"
                      disabled={!geoCoords}
                      onClick={() => setMemberOnboardingStep(2)}
                    >
                      Continue <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {memberOnboardingStep === 2 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-[#1b1813]">3. Subscription package</p>
                  <p className="text-sm text-[#6d6658]">Select your package to activate full OD member benefits.</p>
                </div>
                {active ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Active package: {m?.plan ? odPlanLabel(m.plan) : "Active"}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {OD_RENEWAL_PACKAGES.map((pkg) => (
                      <div key={pkg.plan} className="rounded-xl border border-black/[0.08] bg-[#fafbfa] p-3">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8276]">{pkg.title}</p>
                        <p className="mt-1 text-xl font-semibold text-[#1b1813]">{formatRm(pkg.priceRm)}</p>
                        <p className="mt-1 text-sm text-[#6d6658]">{pkg.blurb}</p>
                        <Button
                          type="button"
                          className="mt-3 w-full rounded-full bg-[#1b1813] hover:bg-[#11100d]"
                          disabled={renewSubmitting}
                          onClick={() => {
                            setRenewError("");
                            setRenewDialogPkg(pkg);
                          }}
                        >
                          Choose {pkg.title}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => setMemberOnboardingStep(1)}>
                    <ChevronLeft className="mr-1 h-4 w-4" /> Back
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full bg-[#1b1813] hover:bg-[#11100d]"
                    disabled={!memberOnboardingDone}
                    onClick={() => setMemberOnboardingOpen(false)}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Finish
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {!memberOnboardingDone && !memberOnboardingOpen && (
          <div className="fixed bottom-5 right-5 z-50 sm:bottom-8 sm:right-8">
            <Button type="button" size="sm" className="rounded-full shadow-lg" onClick={() => setMemberOnboardingOpen(true)}>
              Continue onboarding
            </Button>
          </div>
        )}

        <div className="overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-sm">
          <Accordion
            type="single"
            collapsible
            value={locationAccordionValue}
            onValueChange={setLocationAccordionValue}
            className="w-full"
          >
            <AccordionItem value="location" className="border-0">
              <AccordionTrigger className="px-5 py-5 hover:no-underline sm:px-6">
                <div className="flex min-w-0 flex-1 items-start gap-3 text-left">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1b1813]/[0.06] text-[#1b1813]">
                    <MapPin className="h-5 w-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#8a8276]">
                      Your location
                    </span>
                    <p className="mt-1 text-[14px] leading-snug text-[#6d6658]">
                      {geoCoords
                        ? `${geoCoords.lat.toFixed(4)}, ${geoCoords.lng.toFixed(4)} · expand for map`
                        : "Saved on this device only · expand for details"}
                    </p>
                    {geoSilentBusy && (
                      <p className="mt-1 text-[12px] text-[#8a8276]">Comparing with your last saved location…</p>
                    )}
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-0 sm:px-6">
                <div className="space-y-4 border-t border-black/[0.05] pt-4">
                  <p className="text-[14px] leading-relaxed text-[#6d6658]">
                    Saved in this browser only (localStorage) — not on our servers. When you open this page we compare
                    your current position with the last saved point and refresh if you have moved (about{" "}
                    {OD_MEMBER_GEO_MOVE_THRESHOLD_M}&nbsp;m or more).
                  </p>
                  {geoLocationNote && (
                    <p className="rounded-xl border border-emerald-200/80 bg-emerald-50/90 px-3 py-2 text-[13px] leading-snug text-emerald-900">
                      {geoLocationNote}
                    </p>
                  )}
                  {geoCoords && locationAccordionValue === "location" && (
                    <div className="overflow-hidden rounded-2xl ring-1 ring-black/[0.08]">
                      <div className="relative h-[min(280px,42vh)] w-full min-h-[200px]">
                        <div className="pointer-events-none absolute right-2 top-2 z-10">
                          <label className="sr-only" htmlFor="od-member-map-style">
                            Map style
                          </label>
                          <select
                            id="od-member-map-style"
                            value={memberMapStyle}
                            onChange={(e) => setMemberMapStyle(e.target.value as OdMemberMapStyleKey)}
                            className="pointer-events-auto max-w-[min(200px,calc(100%-1rem))] rounded-xl border border-black/12 bg-white/95 px-2.5 py-2 text-[12px] font-medium text-[#1b1813] shadow-sm backdrop-blur-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b1813]/25"
                          >
                            <option value="default">Default (Carto)</option>
                            <option value="openstreetmap">OpenStreetMap</option>
                            <option value="openstreetmap3d">OpenStreetMap 3D</option>
                          </select>
                        </div>
                        <Map
                          ref={memberMapRef}
                          key={`${geoCoords.lat.toFixed(5)}-${geoCoords.lng.toFixed(5)}`}
                          theme="light"
                          center={[geoCoords.lng, geoCoords.lat]}
                          zoom={15}
                          className="absolute inset-0 h-full w-full"
                          attributionControl={{ compact: false }}
                          styles={memberMapStylesProp}
                        >
                          <MapControls
                            position="bottom-right"
                            showZoom
                            showCompass
                            showLocate
                            showFullscreen
                          />
                          <MapMarker longitude={geoCoords.lng} latitude={geoCoords.lat}>
                            <MarkerContent>
                              <MarkerLabel
                                position="top"
                                className="max-w-[200px] truncate rounded-md bg-[#1b1813]/90 px-2 py-0.5 text-[10px] font-medium text-white shadow-sm"
                              >
                                {geoAddress ?? "Your position"}
                              </MarkerLabel>
                              <div className="size-4 rounded-full border-2 border-white bg-[#1b1813] shadow-lg" />
                            </MarkerContent>
                            <MarkerTooltip>{geoAddress ?? "Your saved position"}</MarkerTooltip>
                            <MarkerPopup>
                              <div className="max-w-[240px] space-y-1 rounded-xl bg-white px-3 py-2.5 text-[13px] shadow-lg ring-1 ring-black/10">
                                <p className="font-medium text-[#1b1813]">{geoAddress ?? "Your location"}</p>
                                <p className="font-mono text-[11px] text-[#6d6658]">
                                  {geoCoords.lat.toFixed(5)}, {geoCoords.lng.toFixed(5)}
                                </p>
                              </div>
                            </MarkerPopup>
                          </MapMarker>
                        </Map>
                      </div>
                    </div>
                  )}
                  {geoCoords && (
                    <div className="space-y-2 rounded-2xl bg-[#faf9f7] px-4 py-3 ring-1 ring-black/[0.05]">
                      <p className="font-mono text-[13px] leading-relaxed text-[#1b1813]">
                        {geoCoords.lat.toFixed(6)}, {geoCoords.lng.toFixed(6)}
                      </p>
                      {geoCoords.accuracyM != null && (
                        <p className="text-[12px] text-[#6d6658]">Accuracy about ±{geoCoords.accuracyM} m</p>
                      )}
                      {geoAddress && <p className="text-[13px] leading-snug text-[#5c554a]">{geoAddress}</p>}
                      {geoCapturedAt && (
                        <p className="text-[11px] text-[#8a8276]">
                          Last saved here:{" "}
                          {new Date(geoCapturedAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      )}
                    </div>
                  )}
                  {!geoCoords && (
                    <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-black/[0.1] bg-[#faf9f7] px-4 py-8 text-center text-[13px] text-[#8a8276]">
                      Map will appear here after you allow location and we have coordinates to show.
                    </div>
                  )}
                  {geoError && <p className="text-[13px] leading-snug text-red-600">{geoError}</p>}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-full border-black/12"
                      disabled={geoLoading || geoSilentBusy}
                      onClick={() => void requestMemberLocation(currentMember.id)}
                    >
                      <RefreshCw
                        className={`mr-2 h-4 w-4 ${geoLoading || geoSilentBusy ? "animate-spin" : ""}`}
                        aria-hidden
                      />
                      {geoLoading || geoSilentBusy
                        ? "Getting location…"
                        : geoCoords
                          ? "Refresh location"
                          : "Use my location"}
                    </Button>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <Dialog open={geoDialogOpen} onOpenChange={setGeoDialogOpen}>
          <DialogContent className="rounded-[1.25rem] sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-[#1b1813]">Share your location?</DialogTitle>
            </DialogHeader>
            <p className="text-sm leading-relaxed text-[#6d6658]">
              We read your position in the browser and keep the last reading in localStorage on this device only — not
              in our database. Each visit we can compare with that saved point and update when you have moved.
            </p>
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-black/15"
                onClick={() => {
                  setMemberGeoPromptDeclined(currentMember.id);
                  setGeoDialogOpen(false);
                }}
              >
                Not now
              </Button>
              <Button
                type="button"
                className="rounded-full bg-[#1b1813] hover:bg-[#11100d]"
                onClick={() => {
                  clearMemberGeoPromptDeclined(currentMember.id);
                  setGeoDialogOpen(false);
                  requestMemberLocation(currentMember.id);
                }}
              >
                Share location
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <div className="overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-sm">
          <Accordion
            type="single"
            collapsible
            value={statusAccordionValue}
            onValueChange={setStatusAccordionValue}
            className="w-full"
          >
            <AccordionItem value="status-details" className="border-0">
              <AccordionTrigger className="px-6 py-5 hover:no-underline">
                <div className="flex min-w-0 flex-1 flex-col gap-2 text-left">
                  <span className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Status</span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex h-3 w-3 shrink-0 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" : "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]"}`}
                    />
                    <span className="text-lg font-medium text-[#1b1813]">{active ? "Active" : "Inactive"}</span>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-0">
                <div className="space-y-4">
                  {active && accountQrUrl && (
                    <OdMembershipCard
                      className="mt-0"
                      memberCode={currentMember.memberCode}
                      validUntilLabel={
                        m?.validUntil
                          ? new Date(m.validUntil).toLocaleDateString(undefined, { dateStyle: "medium" })
                          : "—"
                      }
                      qrUrl={accountQrUrl}
                    />
                  )}

                  <p className="text-sm text-[#6d6658]">
                    {active
                      ? "Browse participating shops below, then show verification at the counter when you visit."
                      : "Renew in this section to unlock the member directory and shop discounts."}
                  </p>
                  {m?.validUntil && (
                    <p className="text-sm text-[#374151]">
                      <span className="font-medium">Current period ends:</span>{" "}
                      {new Date(m.validUntil).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                  {m?.plan && (
                    <p className="text-sm text-[#6d6658]">
                      Plan: <span className="font-medium"> {odPlanLabel(m.plan)}</span>
                    </p>
                  )}

                  {!active && (
                    <div className="space-y-4 border-t border-black/[0.06] pt-5">
                      <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">
                        Renew subscription
                      </h3>
                      <p className="text-sm text-[#6d6658]">
                        Malaysia · Prices in MYR.{" "}
                        {odPaymentsEnabled
                          ? "You will complete payment on Bayarcash, then return here when paid."
                          : "Confirming applies your membership immediately in this app."}
                      </p>
                      <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/80 px-4 py-3 text-sm leading-relaxed text-emerald-900">
                        Renew to unlock full OD privileges: all participating vendors, member-only discounts, and easier
                        trip planning with maps and service details. Member pricing can save your costs across frequent
                        visits.
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {OD_RENEWAL_PACKAGES.map((pkg) => (
                          <div
                            key={pkg.plan}
                            className="flex flex-col rounded-2xl border border-black/[0.08] bg-[#fafbfa] p-4 transition hover:border-black/15"
                          >
                            <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8276]">
                              {pkg.title}
                            </div>
                            <div className="mt-2 text-2xl font-semibold tabular-nums text-[#1b1813]">
                              {formatRm(pkg.priceRm)}
                            </div>
                            <p className="mt-1 flex-1 text-sm text-[#6d6658]">{pkg.blurb}</p>
                            <Button
                              type="button"
                              className="mt-4 w-full rounded-full bg-[#1b1813] hover:bg-[#11100d] disabled:opacity-60"
                              disabled={renewSubmitting}
                              onClick={() => {
                                setRenewError("");
                                setRenewDialogPkg(pkg);
                              }}
                            >
                              Renew {pkg.title}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {(active || dirLoading || dirShops.length > 0) && (
          <div className="rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_2px_40px_rgba(0,0,0,0.04)]">
            <div className="overflow-hidden rounded-t-[1.5rem] border-b border-black/[0.05] bg-gradient-to-b from-[#faf9f7] via-white to-white px-5 pb-5 pt-6 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1b1813]/[0.06] text-[#1b1813]">
                  <Store className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#8a8276]">
                      OD Partners
                    </h2>
                    {!dirLoading && dirShops.length > 0 && active && (
                      <Button variant="default" size="sm" className="rounded-full border-black/15">
                        <Link
                          to="/shops"
                          className="shrink-0 text-[13px] font-semibold text-white underline-offset-4 transition hover:underline"
                        >
                          View all
                        </Link>
                      </Button>
                    )}
                  </div>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#3d3830]">
                    {active
                      ? "At counter, scan ODMember QR Code for verification and get discounts"
                      : "Preview a few participating vendors. Renew to unlock the full directory, discounts, and all OD member perks."}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-6 pt-5 sm:px-6">
              {/* {!active && !dirLoading && !dirError && dirPreviewOnly && dirShops.length > 0 && (
                <div className="mb-5 rounded-2xl border border-amber-200/80 bg-amber-50/80 px-4 py-3">
                  <p className="text-sm leading-relaxed text-amber-900">
                    You are seeing a preview of {dirShops.length} partner{dirShops.length > 1 ? "s" : ""}. Renew now to
                    access the full OD directory and save more with member-only deals.
                  </p>
                </div>
              )} */}

              {!dirLoading && !dirError && !active && dirShops.length > 0 && (
                <div className="mb-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Browse by industry</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setIndustryFilter("all")}
                      className={cn(
                        "rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200",
                        industryFilter === "all"
                          ? "border-transparent bg-[#1b1813] text-white shadow-md shadow-black/15"
                          : "border-black/[0.08] bg-white/70 text-[#374151] backdrop-blur-md hover:border-black/15 hover:bg-white"
                      )}
                    >
                      All
                    </button>
                    {OD_BUSINESS_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setIndustryFilter(cat)}
                        className={cn(
                          "rounded-full border px-4 py-2 text-[13px] font-medium transition-all duration-200",
                          industryFilter === cat
                            ? "border-transparent bg-[#1b1813] text-white shadow-md shadow-black/15"
                            : "border-black/[0.08] bg-white/70 text-[#374151] backdrop-blur-md hover:border-black/15 hover:bg-white"
                        )}
                      >
                        {OD_INDUSTRY_FILTER_LABEL[cat] ?? cat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {dirLoading && (
                <div className="flex justify-center py-16">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1b1813]/20 border-t-[#1b1813]" />
                </div>
              )}

              {!dirLoading && dirError && <p className="text-sm text-red-600">{dirError}</p>}

              {!dirLoading && !dirError && dirShops.length === 0 && (
                <p className="rounded-2xl border border-dashed border-black/[0.1] bg-[#faf9f6] px-5 py-10 text-center text-[15px] leading-relaxed text-[#6d6658]">
                  No shops listed yet. Vendors set their OD offer in Settings → OD member directory.
                </p>
              )}

              {!dirLoading && !dirError && active && dirShops.length > 0 && filteredShops.length === 0 && (
                <p className="rounded-2xl border border-dashed border-black/[0.1] bg-[#faf9f6] px-5 py-10 text-center text-[15px] leading-relaxed text-[#6d6658]">
                  No shops in this category. Try{" "}
                  <button
                    type="button"
                    className="font-semibold text-[#1b1813] underline decoration-[#1b1813]/30 underline-offset-2"
                    onClick={() => setIndustryFilter("all")}
                  >
                    All
                  </button>{" "}
                  or another industry.
                </p>
              )}

              {!dirLoading && directoryShopsToRender.length > 0 && (
                <ul
                  role="list"
                  aria-label="Participating vendors, swipe horizontally for more"
                  className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth scroll-pl-5 scroll-pr-[max(1.25rem,5vw)] pb-2 pl-5 pr-[max(1.25rem,5vw)] [touch-action:pan-x_pan-y] [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:gap-4 sm:scroll-pl-6 sm:scroll-pr-[max(1.5rem,5vw)] sm:pl-6 sm:pr-[max(1.5rem,5vw)] md:mx-0 md:grid md:max-w-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 md:pl-0 md:pr-0 md:scroll-pl-0 md:scroll-pr-0 [&::-webkit-scrollbar]:hidden"
                >
                  {directoryShopsToRender.map((shop: OdDirectoryShop) => (
                    <li
                      key={shop.owner_id}
                      className="w-[70vw] shrink-0 snap-start md:w-full md:min-w-0 md:snap-none"
                    >
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
            </div>
          </div>
        )}

        {!active && (
          <Dialog
            open={renewDialogPkg !== null}
            onOpenChange={(open) => {
              if (!open && !renewSubmitting) {
                setRenewDialogPkg(null);
                setRenewError("");
              }
            }}
          >
            {renewDialogPkg && (
              <DialogContent className="rounded-[1.25rem] sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-lg font-semibold text-[#1b1813]">
                    {odPaymentsEnabled ? `Pay for ${renewDialogPkg.title}?` : `Activate ${renewDialogPkg.title}?`}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-3 text-sm text-[#6d6658]">
                  <p>
                    <span className="font-semibold text-[#1b1813]">{renewDialogPkg.title}</span> ·{" "}
                    <span className="font-semibold text-[#1b1813]">{formatRm(renewDialogPkg.priceRm)}</span>
                  </p>
                  <p>
                    {odPaymentsEnabled ? (
                      <>
                        You will be redirected to <span className="font-medium text-[#1b1813]">Bayarcash</span> to pay.
                        When payment succeeds, your OD membership becomes{" "}
                        <span className="font-medium text-emerald-700">active</span> for this period.
                      </>
                    ) : (
                      <>
                        Your OD membership will turn <span className="font-medium text-emerald-700">active</span> for
                        this period right away.
                      </>
                    )}
                  </p>
                  {renewError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                      {renewError}
                    </div>
                  )}
                </div>
                <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full border-black/15"
                    disabled={renewSubmitting}
                    onClick={() => setRenewDialogPkg(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="rounded-full bg-[#1b1813] hover:bg-[#11100d]"
                    disabled={renewSubmitting}
                    onClick={() => void handleConfirmRenew()}
                  >
                    {renewSubmitting
                      ? odPaymentsEnabled
                        ? "Redirecting…"
                        : "Activating…"
                      : odPaymentsEnabled
                        ? "Continue to payment"
                        : "Confirm & activate"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            )}
          </Dialog>
        )}

        <div className="rounded-[1.5rem] border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Your details</h2>
          <p className="mt-2 font-mono text-sm text-[#111827]">{currentMember.memberCode}</p>
          <p className="mt-1 text-sm text-[#6d6658]">{currentMember.email}</p>

          <form className="mt-6 space-y-3" onSubmit={handleSaveName}>
            <label className="text-xs font-medium text-[#6B7280]">Display name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            {err && <p className="text-sm text-red-600">{err}</p>}
            {msg && <p className="text-sm text-emerald-700">{msg}</p>}
            <Button type="submit" disabled={busy} className="rounded-full bg-[#1b1813] hover:bg-[#11100d]">
              {busy ? "Saving…" : "Save"}
            </Button>
          </form>

          <form className="mt-8 space-y-3 border-t border-black/[0.06] pt-8" onSubmit={(e) => void handleSavePublicUsername(e)}>
            <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8276]">Public profile link</h3>
            <p className="text-sm text-[#6d6658]">
              Choose a short username for a shareable page (same style as business URLs). Lowercase letters, numbers,
              hyphen and underscore; 2–62 characters; must not match an existing business slug.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="shrink-0 text-sm text-[#6d6658]">{buildAppUrl("/").replace(/\/$/, "")}/</span>
              <Input
                value={publicUsernameInput}
                onChange={(e) => setPublicUsernameInput(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                className={cn(inputCls, "max-w-[220px] flex-1")}
                placeholder="mykluang"
                autoComplete="off"
              />
            </div>
            {currentMember.publicUsername ? (
              <p className="text-[11px] font-mono text-[#8a8276]">
                Live: {buildAppUrl(`/${currentMember.publicUsername}`)}
              </p>
            ) : null}
            {publicUsernameErr && <p className="text-sm text-red-600">{publicUsernameErr}</p>}
            {publicUsernameMsg && <p className="text-sm text-emerald-700">{publicUsernameMsg}</p>}
            <Button
              type="submit"
              disabled={publicUsernameBusy}
              variant="outline"
              className="rounded-full border-black/12"
            >
              {publicUsernameBusy ? "Saving…" : "Save username"}
            </Button>
          </form>
        </div>

        {/* <p className="text-center text-sm text-[#8a8276]">
          Business owner?{" "}
          <Link className="font-medium text-[#1b1813] underline-offset-2 hover:underline" to="/login">
            Business Login
          </Link>
        </p> */}

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
    </div>
  );
};
