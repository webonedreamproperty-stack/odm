import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Printer, Trash2 } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { useAuth } from "./AuthProvider";
import { buildOdVerifyUrl, buildStaffPortalUrl } from "../lib/links";
import { buildAppUrl } from "../lib/siteConfig";
import { OD_BUSINESS_CATEGORIES, type OdBusinessCategory } from "../lib/odBusinessCategories";
import { OD_INDUSTRY_FILTER_LABEL } from "../lib/odMemberDirectoryFilters";
import { normalizeOdListingAreaValue } from "../lib/odListingAreaLocations";
import { printOdVerifySheet } from "../lib/printOdVerifySheet";
import { fetchGooglePlaceDetails } from "../lib/googlePlaceDetails";
import { supabase } from "../lib/supabase";
import QRCode from "react-qr-code";
import { Link, useNavigate } from "react-router-dom";
import { useSubscriptionContext } from "./SubscriptionContext";
import { OdGooglePlaceSearch } from "./OdGooglePlaceSearch";
import { VendorPublicPlaceCard } from "./VendorPublicPlaceCard";
import type { PublicVendorHandle } from "../lib/db/publicHandle";
import { getSlugHint, isSlugValid, normalizeSlug } from "../lib/slug";

const DELETE_CONFIRMATION = "DELETE";

function buildReachableSlugCandidate(raw: string): string {
  const normalized = normalizeSlug(raw);
  if (normalized.length >= 3) return normalized.slice(0, 30);
  if (!normalized) return "";
  return normalized;
}

/** Persist Google Maps share links with a scheme so member “Directions” opens reliably. */
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

export const SettingsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const navigate = useNavigate();
  const { staffAccounts, createStaff, updateStaffPin, setStaffAccess, deleteStaff, currentOwner, currentUser, deleteAccount, updateProfileInfo, updatePassword, isSlugAvailable } = useAuth();
  useSubscriptionContext();

  const [profileForm, setProfileForm] = useState<{
    businessName: string;
    email: string;
    slug: string;
    odBusinessCategory: OdBusinessCategory;
  }>({
    businessName: currentUser?.businessName ?? "",
    email: currentUser?.email ?? "",
    slug: currentOwner?.slug ?? "",
    odBusinessCategory: OD_BUSINESS_CATEGORIES[0],
  });
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileBusy, setProfileBusy] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(true);
  const [slugChecking, setSlugChecking] = useState(false);
  const [slugCheckFailed, setSlugCheckFailed] = useState(false);

  useEffect(() => {
    const rawCat = currentUser?.odBusinessCategory;
    const validCat: OdBusinessCategory =
      rawCat && (OD_BUSINESS_CATEGORIES as readonly string[]).includes(rawCat)
        ? (rawCat as OdBusinessCategory)
        : OD_BUSINESS_CATEGORIES[0];
    setProfileForm({
      businessName: currentUser?.businessName ?? "",
      email: currentUser?.email ?? "",
      slug: currentOwner?.slug ?? "",
      odBusinessCategory: validCat,
    });
  }, [currentUser, currentOwner]);

  const normalizedSlug = normalizeSlug(profileForm.slug);
  const slugValid = isSlugValid(normalizedSlug);
  const slugHint = getSlugHint(normalizedSlug);
  const slugChanged = normalizedSlug !== (currentOwner?.slug ?? "");

  useEffect(() => {
    if (currentUser?.role !== "owner") return;
    if (!slugChanged) {
      setSlugAvailable(true);
      setSlugChecking(false);
      setSlugCheckFailed(false);
      return;
    }
    if (!slugValid) {
      setSlugAvailable(false);
      setSlugChecking(false);
      setSlugCheckFailed(false);
      return;
    }
    let cancelled = false;
    setSlugChecking(true);
    const timer = window.setTimeout(async () => {
      try {
        const available = await isSlugAvailable(normalizedSlug);
        if (!cancelled) {
          setSlugAvailable(available);
          setSlugCheckFailed(false);
          setSlugChecking(false);
        }
      } catch {
        if (!cancelled) {
          setSlugAvailable(false);
          setSlugCheckFailed(true);
          setSlugChecking(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setSlugChecking(false);
    };
  }, [currentUser?.role, slugChanged, slugValid, normalizedSlug, isSlugAvailable]);

  const [passwordForm, setPasswordForm] = useState({ next: "", confirm: "" });
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", pin: "" });
  const [error, setError] = useState("");
  const [staffBusy, setStaffBusy] = useState(false);
  const [staffActionBusyId, setStaffActionBusyId] = useState<string | null>(null);
  const [staffActionError, setStaffActionError] = useState("");
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [deleteStaffTarget, setDeleteStaffTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteStaffError, setDeleteStaffError] = useState("");
  const [deleteStaffBusy, setDeleteStaffBusy] = useState(false);
  const [isDeleteStepOneOpen, setIsDeleteStepOneOpen] = useState(false);
  const [isDeleteStepTwoOpen, setIsDeleteStepTwoOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleteAccountBusy, setDeleteAccountBusy] = useState(false);

  const [odDirVisible, setOdDirVisible] = useState(true);
  const [odDiscountSummary, setOdDiscountSummary] = useState("");
  const [odListingArea, setOdListingArea] = useState("");
  const [odMapsUrl, setOdMapsUrl] = useState("");
  const [odServices, setOdServices] = useState<{ id: string; name: string; description: string }[]>([]);
  const [newSvcName, setNewSvcName] = useState("");
  const [newSvcDesc, setNewSvcDesc] = useState("");
  const [odListingBusy, setOdListingBusy] = useState(false);
  const [odListingSaveBusy, setOdListingSaveBusy] = useState(false);
  const [odListingMsg, setOdListingMsg] = useState("");
  const [odListingLat, setOdListingLat] = useState<number | null>(null);
  const [odListingLng, setOdListingLng] = useState<number | null>(null);
  const [odGooglePlaceId, setOdGooglePlaceId] = useState<string>("");
  const [odShopPhotoUrl, setOdShopPhotoUrl] = useState<string | null>(null);
  const [odLogoUrl, setOdLogoUrl] = useState<string | null>(null);
  const [odPlacePreviewPayload, setOdPlacePreviewPayload] = useState<Record<string, unknown> | null>(null);
  const [odPlacePreviewLoading, setOdPlacePreviewLoading] = useState(false);
  const [odPlacePreviewErr, setOdPlacePreviewErr] = useState<string | null>(null);

  const odVerifyQrRef = useRef<HTMLDivElement>(null);

  // Default slug from Google/cached place name (listing area), then business name.
  // Only applies when slug is currently empty so we don't overwrite manual edits.
  useEffect(() => {
    if (currentUser?.role !== "owner") return;
    const sourceName = odListingArea.trim() || profileForm.businessName.trim();
    if (!sourceName) return;
    const candidate = buildReachableSlugCandidate(sourceName);
    if (!candidate) return;
    setProfileForm((prev) => {
      if (prev.slug.trim()) return prev;
      return { ...prev, slug: candidate };
    });
  }, [currentUser?.role, odListingArea, profileForm.businessName]);

  const handlePrintOdVerifySheet = useCallback(() => {
    if (!currentOwner?.slug) return;
    const verifyUrl = buildOdVerifyUrl(currentOwner.slug);
    const svg = odVerifyQrRef.current?.querySelector("svg");
    const shopName = (profileForm.businessName || currentUser?.businessName || "").trim();
    const discountLine = odDiscountSummary.trim();
    printOdVerifySheet({
      verifyUrl,
      qrSvgOuterHTML: svg?.outerHTML,
      ...(shopName ? { shopName } : {}),
      ...(discountLine ? { discountLine } : {}),
    });
  }, [currentOwner?.slug, profileForm.businessName, currentUser?.businessName, odDiscountSummary]);

  const loadOdListing = useCallback(async () => {
    if (!currentOwner?.id || currentUser?.role !== "owner") return;
    setOdListingBusy(true);
    const { data: row, error } = await supabase
      .from("profiles")
      .select(
        "od_directory_visible, od_discount_summary, od_listing_area, od_listing_lat, od_listing_lng, od_maps_url, od_google_place_id, od_shop_photo_url, od_logo_url"
      )
      .eq("id", currentOwner.id)
      .maybeSingle();
    if (!error && row) {
      const r = row as {
        od_directory_visible?: boolean;
        od_discount_summary?: string;
        od_listing_area?: string | null;
        od_listing_lat?: number | null;
        od_listing_lng?: number | null;
        od_maps_url?: string | null;
        od_google_place_id?: string | null;
        od_shop_photo_url?: string | null;
        od_logo_url?: string | null;
      };
      setOdDirVisible(r.od_directory_visible !== false);
      setOdDiscountSummary(r.od_discount_summary ?? "");
      setOdListingArea(normalizeOdListingAreaValue(r.od_listing_area ?? ""));
      const lat = r.od_listing_lat;
      const lng = r.od_listing_lng;
      setOdListingLat(typeof lat === "number" && Number.isFinite(lat) ? lat : null);
      setOdListingLng(typeof lng === "number" && Number.isFinite(lng) ? lng : null);
      setOdMapsUrl(r.od_maps_url ?? "");
      setOdGooglePlaceId((r.od_google_place_id ?? "").trim());
      const sp = (r.od_shop_photo_url ?? "").trim();
      const lg = (r.od_logo_url ?? "").trim();
      setOdShopPhotoUrl(sp || null);
      setOdLogoUrl(lg || null);
    }
    const { data: svc } = await supabase
      .from("od_shop_services")
      .select("id, name, description")
      .eq("owner_id", currentOwner.id)
      .order("sort_order", { ascending: true });
    setOdServices((svc ?? []) as { id: string; name: string; description: string }[]);
    setOdListingBusy(false);
  }, [currentOwner?.id, currentUser?.role]);

  useEffect(() => {
    void loadOdListing();
  }, [loadOdListing]);

  useEffect(() => {
    const pid = odGooglePlaceId.trim();
    const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
    if (!pid) {
      setOdPlacePreviewPayload(null);
      setOdPlacePreviewErr(null);
      setOdPlacePreviewLoading(false);
      return;
    }
    if (!mapsKey) {
      setOdPlacePreviewPayload(null);
      setOdPlacePreviewErr("Set VITE_GOOGLE_MAPS_API_KEY in your env to load the member-facing preview.");
      setOdPlacePreviewLoading(false);
      return;
    }
    let cancelled = false;
    setOdPlacePreviewLoading(true);
    setOdPlacePreviewErr(null);
    void fetchGooglePlaceDetails(pid, mapsKey)
      .then((d) => {
        if (!cancelled) setOdPlacePreviewPayload(d);
      })
      .catch(() => {
        if (!cancelled) {
          setOdPlacePreviewErr("Could not load Google place details for this preview.");
          setOdPlacePreviewPayload(null);
        }
      })
      .finally(() => {
        if (!cancelled) setOdPlacePreviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [odGooglePlaceId]);

  const odListingPreviewVendor = useMemo((): PublicVendorHandle => {
    const slug = (profileForm.slug || currentOwner?.slug || "").trim() || "preview";
    return {
      kind: "vendor",
      slug,
      business_name: (profileForm.businessName || currentUser?.businessName || "").trim() || "Your business",
      listing_area: normalizeOdListingAreaValue(odListingArea) || null,
      discount_summary: odDiscountSummary.trim() || null,
      maps_url: normalizeOdMapsUrl(odMapsUrl),
      logo_url: odLogoUrl,
      shop_photo_url: odShopPhotoUrl,
      business_category: profileForm.odBusinessCategory,
      directory_visible: odDirVisible,
      google_place_id: odGooglePlaceId.trim() || null,
      place_details: null,
    };
  }, [
    profileForm.slug,
    profileForm.businessName,
    profileForm.odBusinessCategory,
    currentOwner?.slug,
    currentUser?.businessName,
    odListingArea,
    odDiscountSummary,
    odMapsUrl,
    odLogoUrl,
    odShopPhotoUrl,
    odDirVisible,
    odGooglePlaceId,
  ]);

  const handleSaveOdListing = async () => {
    if (!currentOwner?.id) return;
    setOdListingMsg("");
    setOdListingSaveBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        od_directory_visible: odDirVisible,
        od_discount_summary: odDiscountSummary.trim(),
        od_listing_area: normalizeOdListingAreaValue(odListingArea) || null,
        od_listing_lat: odListingLat,
        od_listing_lng: odListingLng,
        od_maps_url: normalizeOdMapsUrl(odMapsUrl),
        od_google_place_id: odGooglePlaceId.trim() || null,
      })
      .eq("id", currentOwner.id);
    setOdListingSaveBusy(false);
    if (error) {
      setOdListingMsg("Could not save OD listing. Try again.");
      return;
    }
    const mapsKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();
    const pid = odGooglePlaceId.trim();
    if (pid && mapsKey) {
      try {
        const details = await fetchGooglePlaceDetails(pid, mapsKey);
        setOdPlacePreviewPayload(details);
        setOdPlacePreviewErr(null);
        const { error: cacheErr } = await supabase.rpc("upsert_od_place_details_cache", {
          p_place_id: pid,
          p_payload: details,
          p_ttl_days: 30,
        });
        if (cacheErr) {
          setOdListingMsg("Listing saved. Place details cache update failed — public card may update on next save.");
          window.setTimeout(() => setOdListingMsg(""), 5000);
          return;
        }
      } catch {
        setOdListingMsg("Listing saved. Could not refresh Google place details for the public card.");
        window.setTimeout(() => setOdListingMsg(""), 5000);
        return;
      }
    } else if (!pid) {
      setOdPlacePreviewPayload(null);
      setOdPlacePreviewErr(null);
    }
    setOdListingMsg("OD listing saved.");
    window.setTimeout(() => setOdListingMsg(""), 3000);
  };

  const handleAddOdService = async () => {
    if (!currentOwner?.id || !newSvcName.trim()) return;
    setOdListingMsg("");
    const { error } = await supabase.from("od_shop_services").insert({
      owner_id: currentOwner.id,
      name: newSvcName.trim(),
      description: newSvcDesc.trim(),
      sort_order: odServices.length,
    });
    if (error) {
      setOdListingMsg("Could not add service.");
      return;
    }
    setNewSvcName("");
    setNewSvcDesc("");
    void loadOdListing();
  };

  const handleRemoveOdService = async (serviceId: string) => {
    if (!currentOwner?.id) return;
    const { error } = await supabase
      .from("od_shop_services")
      .delete()
      .eq("id", serviceId)
      .eq("owner_id", currentOwner.id);
    if (error) return;
    void loadOdListing();
  };

  const handleProfileSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileError("");
    setProfileSuccess("");
    if (currentUser?.role === "owner") {
      if (!slugValid) {
        setProfileError("Public URL slug is invalid. Use lowercase letters, numbers, and hyphens.");
        return;
      }
      if (slugChanged && !slugAvailable && !slugCheckFailed) {
        setProfileError("That public URL slug is already taken.");
        return;
      }
    }
    setProfileBusy(true);
    const result = await updateProfileInfo({
      businessName: profileForm.businessName,
      email: profileForm.email,
      ...(currentUser?.role === "owner" ? { slug: normalizedSlug } : {}),
      ...(currentUser?.role === "owner" ? { odBusinessCategory: profileForm.odBusinessCategory } : {}),
    });
    setProfileBusy(false);
    if (result.ok === false) {
      setProfileError(result.error);
    } else {
      setProfileSuccess("Profile updated successfully.");
      setTimeout(() => setProfileSuccess(""), 3000);
    }
  };

  const handlePasswordSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    const result = await updatePassword(passwordForm.next);
    setPasswordBusy(false);
    if (result.ok === false) {
      setPasswordError(result.error);
    } else {
      setPasswordSuccess("Password changed successfully.");
      setPasswordForm({ next: "", confirm: "" });
      setTimeout(() => setPasswordSuccess(""), 3000);
    }
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setStaffActionError("");
    setStaffBusy(true);
    const result = await createStaff(form);
    setStaffBusy(false);
    if (result.ok === false) {
      setError(result.error);
      return;
    }
    setForm({ name: "", email: "", pin: "" });
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setResetError("");
    setResetBusy(true);
    const result = await updateStaffPin(resetTarget.id, resetPin);
    setResetBusy(false);
    if (result.ok === false) {
      setResetError(result.error);
      return;
    }
    setResetPin("");
    setResetTarget(null);
  };

  const handleSetStaffAccess = async (staffId: string, access: "active" | "disabled") => {
    setStaffActionError("");
    setStaffActionBusyId(staffId);
    const result = await setStaffAccess(staffId, access);
    setStaffActionBusyId(null);
    if (result.ok === false) {
      setStaffActionError(result.error);
    }
  };

  const handleDeleteFinal = async () => {
    setDeleteError("");
    if (deleteConfirmText.trim().toUpperCase() !== DELETE_CONFIRMATION) {
      setDeleteError(`Type ${DELETE_CONFIRMATION} to confirm account deletion.`);
      return;
    }

    setDeleteAccountBusy(true);
    const result = await deleteAccount();
    setDeleteAccountBusy(false);
    if (result.ok === false) {
      setDeleteError(result.error);
      return;
    }

    setIsDeleteStepTwoOpen(false);
    setDeleteConfirmText("");
    navigate("/register");
  };

  const handleDeleteStaff = async () => {
    if (!deleteStaffTarget) return;
    setDeleteStaffError("");
    setDeleteStaffBusy(true);
    const result = await deleteStaff(deleteStaffTarget.id);
    setDeleteStaffBusy(false);
    if (result.ok === false) {
      setDeleteStaffError(result.error);
      return;
    }
    setDeleteStaffTarget(null);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 animate-fade-in h-full overflow-y-auto flex flex-col bg-gray-50/50">
      <div className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
          {embedded ? "Shop setup" : "Settings"}
        </h1>
        <p className="text-sm text-muted-foreground">
          {embedded
            ? "Profile, password, and OD tools for your business. Use full settings for campaigns and staff."
            : "Manage your profile, password, team, and account."}
        </p>
        {embedded && currentUser?.role === "owner" && (
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Business type</span>
            <Badge variant="secondary" className="rounded-full font-medium">
              {OD_INDUSTRY_FILTER_LABEL[profileForm.odBusinessCategory] ?? profileForm.odBusinessCategory}
            </Badge>
          </div>
        )}
      </div>


      {currentOwner?.slug && currentUser?.role === "owner" && (
        <section className="rounded-2xl md:rounded-3xl border bg-white p-4 md:p-6 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">OD Membership verification</h2>
            <p className="text-sm text-muted-foreground">
              Members scan this QR in your shop while signed in to OD. Green means active membership; red means not
              qualified for OD discounts.
            </p>
          </div>
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <div ref={odVerifyQrRef} className="rounded-2xl border border-border/80 bg-muted/20 p-4">
              <QRCode value={buildOdVerifyUrl(currentOwner.slug)} size={176} />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <Label>Verification URL</Label>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  readOnly
                  value={buildOdVerifyUrl(currentOwner.slug)}
                  className="min-w-0 flex-1 font-mono text-[11px] bg-muted/40"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => navigator.clipboard.writeText(buildOdVerifyUrl(currentOwner.slug!))}
                >
                  Copy
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => handlePrintOdVerifySheet()}
                  aria-label="Print QR sheet with OD Member logo"
                >
                  <Printer className="mr-1.5 h-4 w-4" aria-hidden />
                  Print QR
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Opens a print-ready flyer (logo, QR, shop name, and your OD offer if set) — save as PDF or print for your
                counter.
              </p>
            </div>
          </div>

          <div id="od-vendor-listing" className="scroll-mt-28 border-t border-border/60 pt-6 space-y-4">
            <div>
              <h3 className="text-base font-semibold">OD member directory</h3>
              <p className="text-sm text-muted-foreground">
                Active OD members see your shop, discount, and services on their account page. Toggle off to hide your
                shop from the list.
              </p>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
              <div>
                <div className="text-sm font-medium">Show in directory</div>
                <div className="text-xs text-muted-foreground">Visible when account access is active</div>
              </div>
              <Switch checked={odDirVisible} onCheckedChange={setOdDirVisible} disabled={odListingBusy} />
            </div>
            <div className="space-y-1.5">
              <Label>OD discount / offer (shown to members)</Label>
              <textarea
                value={odDiscountSummary}
                onChange={(e) => setOdDiscountSummary(e.target.value)}
                placeholder='e.g. "10% off bill" or "Buy 2 get 1 on selected services"'
                rows={3}
                disabled={odListingBusy}
                className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="od-listing-area">Area / neighbourhood (optional)</Label>
              <p className="text-xs text-muted-foreground">
                Search with Google Places. We cache results in Supabase for 1 month to reduce API calls. Pick a result
                to auto-fill area, coordinates, and Google Maps link.
              </p>
              <OdGooglePlaceSearch
                id="od-listing-area"
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
                disabled={odListingBusy}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="od-maps-url">Google Maps link (optional)</Label>
              <p className="text-xs text-muted-foreground">
                In Google Maps: find your shop → Share → Copy link. Members use this for the Directions button on their
                OD account so they can open navigation to your door.
              </p>
              <Input
                id="od-maps-url"
                type="url"
                inputMode="url"
                autoComplete="off"
                value={odMapsUrl}
                onChange={(e) => setOdMapsUrl(e.target.value)}
                placeholder="https://maps.app.goo.gl/… or maps.google.com/…"
                disabled={odListingBusy}
                className="font-mono text-[12px]"
              />
            </div>

            <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4 md:p-5">
              <div>
                <Label className="text-sm">Member-facing preview</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Same Google-style card members see on your public link. It combines the place you selected, your
                  discount above, and your shop photo / logo from branding.
                </p>
              </div>
              {!odGooglePlaceId.trim() ? (
                <p className="text-sm text-muted-foreground">Pick a result from Google search above to load the preview.</p>
              ) : odPlacePreviewLoading ? (
                <div className="flex justify-center py-12">
                  <div className="h-9 w-9 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
                </div>
              ) : odPlacePreviewErr ? (
                <p className="text-sm text-destructive">{odPlacePreviewErr}</p>
              ) : odPlacePreviewPayload && Object.keys(odPlacePreviewPayload).length > 0 ? (
                <div className="mx-auto max-w-md overflow-hidden rounded-xl shadow-lg ring-1 ring-border">
                  <VendorPublicPlaceCard vendor={odListingPreviewVendor} placeDetails={odPlacePreviewPayload} />
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No place details to preview yet.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Services (optional)</Label>
              <p className="text-xs text-muted-foreground">List what OD members can redeem or use a discount on.</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Input
                    value={newSvcName}
                    onChange={(e) => setNewSvcName(e.target.value)}
                    placeholder="Service name"
                    disabled={odListingBusy}
                  />
                </div>
                <div className="min-w-0 flex-[1.2] space-y-1.5">
                  <Input
                    value={newSvcDesc}
                    onChange={(e) => setNewSvcDesc(e.target.value)}
                    placeholder="Short note (optional)"
                    disabled={odListingBusy}
                  />
                </div>
                <Button type="button" variant="secondary" onClick={() => void handleAddOdService()} disabled={odListingBusy}>
                  Add
                </Button>
              </div>
              <ul className="space-y-2">
                {odServices.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-start justify-between gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm"
                  >
                    <div>
                      <div className="font-medium">{s.name}</div>
                      {s.description ? (
                        <div className="text-xs text-muted-foreground">{s.description}</div>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => void handleRemoveOdService(s.id)}
                      disabled={odListingBusy}
                      aria-label="Remove service"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" onClick={() => void handleSaveOdListing()} disabled={odListingSaveBusy || odListingBusy}>
                {odListingSaveBusy ? "Saving…" : "Save directory listing"}
              </Button>
              {odListingMsg && <span className="text-sm text-muted-foreground">{odListingMsg}</span>}
            </div>
          </div>
        </section>
      )}


      {/* Edit Profile */}
      <section className="rounded-2xl md:rounded-3xl border bg-white p-4 md:p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg md:text-xl font-semibold">Edit Profile</h2>
          <p className="text-sm text-muted-foreground">Update your business name and email address.</p>
        </div>
        <form className="space-y-4" onSubmit={handleProfileSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Business / Display Name</Label>
              <Input
                value={profileForm.businessName}
                onChange={(e) => setProfileForm({ ...profileForm, businessName: e.target.value })}
                placeholder="Your Business"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email Address</Label>
              <Input
                value={profileForm.email}
                onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                type="email"
                placeholder="you@brand.com"
                required
              />
            </div>
            {currentUser?.role === "owner" && (
              <>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="settings-business-type">Business type</Label>
                  <select
                    id="settings-business-type"
                    value={profileForm.odBusinessCategory}
                    onChange={(e) =>
                      setProfileForm({ ...profileForm, odBusinessCategory: e.target.value as OdBusinessCategory })
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {OD_BUSINESS_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {OD_INDUSTRY_FILTER_LABEL[c] ? `${c} (${OD_INDUSTRY_FILTER_LABEL[c]})` : c}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Shown in the OD member directory and industry filters (F&amp;B, retail, barber, etc.).
                  </p>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Public URL Slug</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground shrink-0">
                      {buildAppUrl("/").replace(/\/$/, "")}/
                    </span>
                    <Input
                      value={profileForm.slug}
                      onChange={(e) =>
                        setProfileForm({ ...profileForm, slug: buildReachableSlugCandidate(e.target.value) })
                      }
                      className="font-mono"
                      placeholder="your-brand"
                      autoComplete="off"
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {slugChecking
                      ? "Checking slug availability..."
                      : slugChanged
                        ? slugCheckFailed
                          ? "Could not verify availability right now. You can still try saving."
                          : slugAvailable
                            ? "Slug is available."
                            : "Slug is already taken."
                        : "This is your current public URL slug."}{" "}
                    {slugHint}
                  </p>
                  {profileForm.slug ? (
                    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-black/[0.06] bg-muted/30 px-3 py-2">
                      <code className="min-w-0 flex-1 break-all text-[11px] text-foreground">
                        {buildAppUrl(`/${normalizedSlug || profileForm.slug}`)}
                      </code>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 rounded-full"
                        onClick={() => void navigator.clipboard.writeText(buildAppUrl(`/${normalizedSlug || profileForm.slug}`))}
                      >
                        Copy link
                      </Button>
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
          {profileError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {profileError}
            </div>
          )}
          {profileSuccess && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {profileSuccess}
            </div>
          )}
          <div>
            <Button type="submit" className="rounded-full px-6" disabled={profileBusy}>
              {profileBusy ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </section>

      {/* Change Password */}
      <section className="rounded-2xl md:rounded-3xl border bg-white p-4 md:p-6 shadow-sm space-y-5">
        <div>
          <h2 className="text-lg md:text-xl font-semibold">Change Password</h2>
          <p className="text-sm text-muted-foreground">Update your account password. Must be at least 6 characters.</p>
        </div>
        <form className="space-y-4" onSubmit={handlePasswordSave}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <Input
                type="password"
                value={passwordForm.next}
                onChange={(e) => setPasswordForm({ ...passwordForm, next: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input
                type="password"
                value={passwordForm.confirm}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                placeholder="••••••••"
                required
              />
            </div>
          </div>
          {passwordError && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
              {passwordSuccess}
            </div>
          )}
          <div>
            <Button type="submit" className="rounded-full px-6" disabled={passwordBusy}>
              {passwordBusy ? "Changing..." : "Change Password"}
            </Button>
          </div>
        </form>
      </section>

      {embedded && currentUser?.role === "owner" && (
        <section hidden className="rounded-2xl md:rounded-3xl border border-dashed border-border/80 bg-muted/20 p-4 md:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Full ODMember app</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Loyalty campaigns, issued cards, staff logins, and advanced options are in the main settings area (with
            navigation).
          </p>
          <Button type="button" className="mt-4 rounded-full" variant="secondary" asChild>
            <Link to="/settings">Open full settings</Link>
          </Button>
        </section>
      )}

      {!embedded && (
      <section className="rounded-2xl md:rounded-3xl border bg-white p-4 md:p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-lg md:text-xl font-semibold">Staff Accounts</h2>
            <p className="text-sm text-muted-foreground">
              Create staff logins for issuing cards and managing stamps.
            </p>
          </div>
          {currentOwner?.slug && currentOwner?.id && (
            <div className="text-xs text-muted-foreground space-y-2 md:text-right">
              <div>
                Org ID: <span className="font-mono break-all">{currentOwner.id}</span>
              </div>
              <div className="text-[11px] text-muted-foreground/80">
                Share this Org ID or portal link with staff.
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={buildStaffPortalUrl(currentOwner.slug, currentOwner.id)}
                  className="text-[11px] font-mono bg-muted/40 min-w-0"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => navigator.clipboard.writeText(buildStaffPortalUrl(currentOwner.slug!, currentOwner.id))}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>

        <form className="space-y-3" onSubmit={handleCreate}>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                placeholder="Jamie Staff"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                placeholder="staff@brand.com"
                type="email"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>PIN</Label>
              <Input
                value={form.pin}
                onChange={(event) => setForm({ ...form, pin: event.target.value })}
                placeholder="4-6 digits"
                maxLength={6}
                required
              />
            </div>
          </div>
          <Button type="submit" className="rounded-full h-10 px-6 w-full sm:w-auto" disabled={staffBusy}>
            {staffBusy ? "Adding..." : "Add Staff"}
          </Button>
        </form>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {staffActionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {staffActionError}
          </div>
        )}

        {/* Staff table — desktop */}
        <div className="hidden md:block rounded-2xl border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-[1.2fr_1.4fr_0.8fr_auto] gap-4 px-4 py-3 text-xs uppercase tracking-wider text-muted-foreground bg-slate-50">
            <span>Name</span>
            <span>Email</span>
            <span>Status</span>
            <span className="text-right">Actions</span>
          </div>
          {staffAccounts.length === 0 ? (
            <div className="px-4 py-6 text-sm text-muted-foreground">
              No staff yet. Add your first teammate above.
            </div>
          ) : (
            staffAccounts.map((staff) => (
              <div
                key={staff.id}
                className="grid grid-cols-[1.2fr_1.4fr_0.8fr_auto] gap-4 px-4 py-4 border-t items-center"
              >
                <div className="font-medium text-foreground truncate">{staff.businessName}</div>
                <div className="text-sm text-muted-foreground truncate">{staff.email}</div>
                <div>
                  <Badge
                    variant={staff.access === "active" ? "secondary" : "destructive"}
                    className="uppercase tracking-wider"
                  >
                    {staff.access}
                  </Badge>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={staffActionBusyId === staff.id}
                    onClick={() => {
                      setResetTarget({ id: staff.id, name: staff.businessName });
                      setResetPin("");
                      setResetError("");
                    }}
                  >
                    Reset PIN
                  </Button>
                  <Button
                    variant={staff.access === "active" ? "destructive" : "default"}
                    size="sm"
                    disabled={staffActionBusyId === staff.id}
                    onClick={() =>
                      handleSetStaffAccess(staff.id, staff.access === "active" ? "disabled" : "active")
                    }
                  >
                    {staffActionBusyId === staff.id ? "Saving..." : (staff.access === "active" ? "Disable" : "Enable")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={staffActionBusyId === staff.id}
                    onClick={() => {
                      setDeleteStaffTarget({ id: staff.id, name: staff.businessName });
                      setDeleteStaffError("");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Staff list — mobile cards */}
        <div className="md:hidden space-y-3">
          {staffAccounts.length === 0 ? (
            <div className="rounded-2xl border border-slate-100 px-4 py-6 text-sm text-muted-foreground">
              No staff yet. Add your first teammate above.
            </div>
          ) : (
            staffAccounts.map((staff) => (
              <div
                key={staff.id}
                className="rounded-2xl border border-slate-100 bg-slate-50/50 px-4 py-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{staff.businessName}</div>
                    <div className="text-sm text-muted-foreground truncate">{staff.email}</div>
                  </div>
                  <Badge
                    variant={staff.access === "active" ? "secondary" : "destructive"}
                    className="uppercase tracking-wider shrink-0"
                  >
                    {staff.access}
                  </Badge>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={staffActionBusyId === staff.id}
                    onClick={() => {
                      setResetTarget({ id: staff.id, name: staff.businessName });
                      setResetPin("");
                      setResetError("");
                    }}
                  >
                    Reset PIN
                  </Button>
                  <Button
                    variant={staff.access === "active" ? "destructive" : "default"}
                    size="sm"
                    className="flex-1"
                    disabled={staffActionBusyId === staff.id}
                    onClick={() =>
                      handleSetStaffAccess(staff.id, staff.access === "active" ? "disabled" : "active")
                    }
                  >
                    {staffActionBusyId === staff.id ? "Saving..." : (staff.access === "active" ? "Disable" : "Enable")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                    disabled={staffActionBusyId === staff.id}
                    onClick={() => {
                      setDeleteStaffTarget({ id: staff.id, name: staff.businessName });
                      setDeleteStaffError("");
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
      )}

      {!embedded && (
      <section className="rounded-2xl md:rounded-3xl border border-rose-200 bg-rose-50 p-4 md:p-6 shadow-sm space-y-4">
        <div className="space-y-1">
          <h2 className="text-lg md:text-xl font-semibold text-rose-900">Danger Zone</h2>
          <p className="text-sm text-rose-800/90">
            Delete your owner account, all staff logins, and all campaign/customer data for this business.
          </p>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-white/70 px-4 py-3 text-xs text-rose-800">
          This action is permanent and cannot be undone.
        </div>
        <div>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setDeleteError("");
              setDeleteConfirmText("");
              setIsDeleteStepOneOpen(true);
            }}
          >
            Delete Account
          </Button>
        </div>
      </section>
      )}

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && !resetBusy && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset PIN for {resetTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Label>New PIN</Label>
            <Input
              value={resetPin}
              onChange={(event) => setResetPin(event.target.value)}
              placeholder="4-6 digits"
              maxLength={6}
            />
            {resetError && (
              <div className="text-sm text-rose-600">{resetError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetBusy}>
              Cancel
            </Button>
            <Button onClick={handleReset} disabled={resetBusy}>
              {resetBusy ? "Updating..." : "Update PIN"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteStaffTarget} onOpenChange={(open) => !open && setDeleteStaffTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete staff account?</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This will permanently remove <span className="font-semibold text-foreground">{deleteStaffTarget?.name}</span> and revoke their login access.
            </p>
            {deleteStaffError && (
              <div className="text-sm text-rose-600">{deleteStaffError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteStaffTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteStaff} disabled={deleteStaffBusy}>
              {deleteStaffBusy ? "Deleting..." : "Delete Staff"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteStepOneOpen} onOpenChange={(open) => !deleteAccountBusy && setIsDeleteStepOneOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account: Step 1 of 2</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>
              You are about to delete <span className="font-semibold text-foreground">{currentOwner?.businessName}</span>.
            </p>
            <p>This will remove owner access, all staff accounts, campaigns, and customer history.</p>
            <p className="text-rose-600 font-medium">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteStepOneOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setIsDeleteStepOneOpen(false);
                setDeleteError("");
                setDeleteConfirmText("");
                setIsDeleteStepTwoOpen(true);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isDeleteStepTwoOpen}
        onOpenChange={(open) => {
          if (deleteAccountBusy) return;
          setIsDeleteStepTwoOpen(open);
          if (!open) {
            setDeleteConfirmText("");
            setDeleteError("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account: Step 2 of 2</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">{DELETE_CONFIRMATION}</span> to permanently
              delete this account.
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(event) => setDeleteConfirmText(event.target.value)}
              placeholder={DELETE_CONFIRMATION}
            />
            {deleteError && <div className="text-sm text-rose-600">{deleteError}</div>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteStepTwoOpen(false)} disabled={deleteAccountBusy}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteFinal}
              disabled={deleteAccountBusy || deleteConfirmText.trim().toUpperCase() !== DELETE_CONFIRMATION}
            >
              {deleteAccountBusy ? "Deleting..." : "Permanently Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
