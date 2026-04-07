import React, { useCallback, useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Clock, MapPin, Printer, QrCode, Store } from "lucide-react";
import QRCode from "react-qr-code";
import { Link } from "react-router-dom";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { useAuth } from "./AuthProvider";
import { OD_BUSINESS_CATEGORIES } from "../lib/odBusinessCategories";
import { DEFAULT_OD_OPERATING_HOURS, normalizeOdOperatingHours } from "../lib/odOperatingHours";
import { buildOdVerifyUrl } from "../lib/links";
import { printOdVerifySheet } from "../lib/printOdVerifySheet";
import { supabase } from "../lib/supabase";
import { uploadCampaignAsset } from "../lib/storage/campaignAssets";
import type { OdOperatingHoursState } from "../types";
import { cn } from "../lib/utils";

const STEPS = [
  { id: 1, title: "Business & brand", icon: Store },
  { id: 2, title: "Location", icon: MapPin },
  { id: 3, title: "Hours", icon: Clock },
  { id: 4, title: "Member QR", icon: QrCode },
] as const;

function normalizeMapsInput(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  if (t.includes("maps.google") || t.includes("goo.gl") || t.includes("g.page")) {
    return `https://${t.replace(/^\/\//, "")}`;
  }
  return t.startsWith("http") ? t : `https://${t}`;
}

export const VendorOnboardingWizard: React.FC = () => {
  const { currentOwner, refreshProfile } = useAuth();
  const odVerifyQrRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [category, setCategory] = useState<string>(OD_BUSINESS_CATEGORIES[0]);
  const [shopPhotoUrl, setShopPhotoUrl] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [mapsUrl, setMapsUrl] = useState("");
  const [hours, setHours] = useState<OdOperatingHoursState>({ ...DEFAULT_OD_OPERATING_HOURS });

  const syncFromOwner = useCallback(() => {
    if (!currentOwner) return;
    setBusinessName(currentOwner.businessName ?? "");
    setPhone(currentOwner.phone ?? "");
    setCategory(
      currentOwner.odBusinessCategory &&
        (OD_BUSINESS_CATEGORIES as readonly string[]).includes(currentOwner.odBusinessCategory)
        ? currentOwner.odBusinessCategory
        : OD_BUSINESS_CATEGORIES[0]
    );
    setShopPhotoUrl(currentOwner.odShopPhotoUrl ?? "");
    setLogoUrl(currentOwner.odLogoUrl ?? "");
    setMapsUrl(currentOwner.odMapsUrl ?? "");
    setHours(
      currentOwner.odOperatingHours
        ? normalizeOdOperatingHours(currentOwner.odOperatingHours)
        : { ...DEFAULT_OD_OPERATING_HOURS }
    );
  }, [currentOwner]);

  useEffect(() => {
    syncFromOwner();
  }, [syncFromOwner]);

  if (!currentOwner || currentOwner.vendorOnboardingCompleted) {
    return null;
  }

  const ownerId = currentOwner.id;
  const verifyUrl = currentOwner.slug ? buildOdVerifyUrl(currentOwner.slug) : "";

  const handleUploadShop = async (file: File | null) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const { publicUrl } = await uploadCampaignAsset({ file, ownerId, kind: "background" });
      setShopPhotoUrl(publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload photo.");
    } finally {
      setBusy(false);
    }
  };

  const handleUploadLogo = async (file: File | null) => {
    if (!file) return;
    setError("");
    setBusy(true);
    try {
      const { publicUrl } = await uploadCampaignAsset({ file, ownerId, kind: "logo" });
      setLogoUrl(publicUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload logo.");
    } finally {
      setBusy(false);
    }
  };

  const saveStep1 = async () => {
    if (!businessName.trim()) {
      setError("Business name is required.");
      return false;
    }
    setBusy(true);
    setError("");
    const { error: upErr } = await supabase
      .from("profiles")
      .update({
        business_name: businessName.trim(),
        phone: phone.trim() || null,
        od_business_category: category,
        od_shop_photo_url: shopPhotoUrl || null,
        od_logo_url: logoUrl || null,
      })
      .eq("id", ownerId);
    setBusy(false);
    if (upErr) {
      setError("Could not save. Try again.");
      return false;
    }
    await refreshProfile();
    return true;
  };

  const saveStep2 = async () => {
    const normalized = normalizeMapsInput(mapsUrl);
    setBusy(true);
    setError("");
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ od_maps_url: normalized })
      .eq("id", ownerId);
    setBusy(false);
    if (upErr) {
      setError("Could not save location.");
      return false;
    }
    if (normalized) setMapsUrl(normalized);
    await refreshProfile();
    return true;
  };

  const saveStep3 = async () => {
    setBusy(true);
    setError("");
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ od_operating_hours: hours })
      .eq("id", ownerId);
    setBusy(false);
    if (upErr) {
      setError("Could not save hours.");
      return false;
    }
    await refreshProfile();
    return true;
  };

  const completeOnboarding = async () => {
    setBusy(true);
    setError("");
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ vendor_onboarding_completed: true })
      .eq("id", ownerId);
    setBusy(false);
    if (upErr) {
      setError("Could not finish setup.");
      return;
    }
    await refreshProfile();
  };

  const goNext = async () => {
    if (step === 1) {
      const ok = await saveStep1();
      if (ok) setStep(2);
      return;
    }
    if (step === 2) {
      const ok = await saveStep2();
      if (ok) setStep(3);
      return;
    }
    if (step === 3) {
      const ok = await saveStep3();
      if (ok) setStep(4);
    }
  };

  const goBack = () => {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  };

  return (
    <Card className="overflow-hidden rounded-[28px] border-border/80 shadow-subtle">
      <CardHeader className="border-b border-border/70 bg-muted/20 pb-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle className="text-xl">Set up your shop for OD members</CardTitle>
            <CardDescription className="mt-1 text-sm">
              A short guided setup: brand, location, hours, then your verification QR for discounts.
            </CardDescription>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "h-2 w-8 rounded-full transition-colors",
                  step >= s.id ? "bg-foreground" : "bg-muted"
                )}
                title={s.title}
              />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {step === 1 && (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="vonb-name">Business name</Label>
              <Input
                id="vonb-name"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="rounded-2xl"
                placeholder="e.g. Morning Brew Café"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vonb-phone">Phone</Label>
              <Input
                id="vonb-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="rounded-2xl"
                placeholder="+60 …"
                inputMode="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vonb-cat">Industry</Label>
              <select
                id="vonb-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="flex h-11 w-full rounded-2xl border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {OD_BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">Same categories as ODMember templates (F&amp;B, retail, barber, etc.).</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Shop photo</Label>
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4">
                  {shopPhotoUrl ? (
                    <img src={shopPhotoUrl} alt="" className="mb-3 max-h-36 w-full rounded-xl object-cover" />
                  ) : (
                    <p className="mb-3 text-xs text-muted-foreground">Storefront or interior — helps members recognize you.</p>
                  )}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="cursor-pointer text-sm"
                    disabled={busy}
                    onChange={(e) => void handleUploadShop(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Logo</Label>
                <div className="rounded-2xl border border-dashed border-border/80 bg-muted/20 p-4">
                  {logoUrl ? (
                    <img src={logoUrl} alt="" className="mb-3 mx-auto max-h-24 max-w-full object-contain" />
                  ) : (
                    <p className="mb-3 text-xs text-muted-foreground">Square logo works best.</p>
                  )}
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/svg+xml"
                    className="cursor-pointer text-sm"
                    disabled={busy}
                    onChange={(e) => void handleUploadLogo(e.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <Label htmlFor="vonb-maps">Google Maps link</Label>
            <Input
              id="vonb-maps"
              value={mapsUrl}
              onChange={(e) => setMapsUrl(e.target.value)}
              className="rounded-2xl font-mono text-sm"
              placeholder="https://maps.app.goo.gl/… or paste from Google Maps Share"
            />
            <p className="text-sm text-muted-foreground">
              Paste a share link from Google Maps so members can open directions in one tap. You can skip and add this later
              in Settings.
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Mon–Fri opens</Label>
                <Input
                  type="time"
                  value={hours.weekdayOpen}
                  onChange={(e) => setHours((h) => ({ ...h, weekdayOpen: e.target.value }))}
                  className="rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Mon–Fri closes</Label>
                <Input
                  type="time"
                  value={hours.weekdayClose}
                  onChange={(e) => setHours((h) => ({ ...h, weekdayClose: e.target.value }))}
                  className="rounded-2xl"
                />
              </div>
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Saturday closed</p>
                  <p className="text-xs text-muted-foreground">Default: weekend off</p>
                </div>
                <Switch
                  checked={hours.satClosed}
                  onCheckedChange={(v) => setHours((h) => ({ ...h, satClosed: v }))}
                />
              </div>
              {!hours.satClosed && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="time"
                    value={hours.satOpen ?? "09:00"}
                    onChange={(e) => setHours((h) => ({ ...h, satOpen: e.target.value }))}
                    className="rounded-xl"
                  />
                  <Input
                    type="time"
                    value={hours.satClose ?? "18:00"}
                    onChange={(e) => setHours((h) => ({ ...h, satClose: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-muted/15 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium">Sunday closed</p>
                  <p className="text-xs text-muted-foreground">Turn off to set Sunday hours</p>
                </div>
                <Switch
                  checked={hours.sunClosed}
                  onCheckedChange={(v) => setHours((h) => ({ ...h, sunClosed: v }))}
                />
              </div>
              {!hours.sunClosed && (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Input
                    type="time"
                    value={hours.sunOpen ?? "09:00"}
                    onChange={(e) => setHours((h) => ({ ...h, sunOpen: e.target.value }))}
                    className="rounded-xl"
                  />
                  <Input
                    type="time"
                    value={hours.sunClose ?? "18:00"}
                    onChange={(e) => setHours((h) => ({ ...h, sunClose: e.target.value }))}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6">
            {!currentOwner.slug ? (
              <p className="text-sm text-muted-foreground">
                Add a public shop URL (slug) under{" "}
                <Link className="font-medium text-foreground underline underline-offset-2" to="/settings">
                  Settings
                </Link>{" "}
                to generate your verification link.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Print or display this QR at your counter. Members scan it and show green (active OD) or red to claim
                  their discount.
                </p>
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-border/70 bg-background p-6">
                  <div ref={odVerifyQrRef}>
                    <QRCode value={verifyUrl} size={200} />
                  </div>
                  <code className="max-w-full break-all text-center text-[11px] text-muted-foreground">{verifyUrl}</code>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => void navigator.clipboard.writeText(verifyUrl)}
                    >
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full"
                      onClick={() =>
                        printOdVerifySheet({
                          verifyUrl,
                          qrSvgOuterHTML: odVerifyQrRef.current?.querySelector("svg")?.outerHTML,
                        })
                      }
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print QR
                    </Button>
                  </div>
                </div>
              </>
            )}
            <Button type="button" className="w-full rounded-full" size="lg" disabled={busy} onClick={() => void completeOnboarding()}>
              <Check className="mr-2 h-4 w-4" />
              {busy ? "Saving…" : "Finish & show dashboard"}
            </Button>
          </div>
        )}

        {step < 4 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
            <Button type="button" variant="ghost" className="rounded-full" disabled={step === 1 || busy} onClick={goBack}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button type="button" className="rounded-full" disabled={busy} onClick={() => void goNext()}>
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
