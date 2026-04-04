import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronRight, ExternalLink, LogOut, MapPin, Sparkles, Store } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../ui/accordion";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useAuth } from "../AuthProvider";
import { OD_RENEWAL_PACKAGES, formatRm, type OdRenewalPackage } from "../../lib/odPricing";
import { memberSelfRenewOdMembership } from "../../lib/db/members";
import { startOdRenewalViaBayarcash } from "../../lib/odRenewalCheckout";
import { fetchOdMemberDirectory, type OdDirectoryShop } from "../../lib/db/odDirectory";
import { cn } from "../../lib/utils";
import { OD_BUSINESS_CATEGORIES } from "../../lib/odBusinessCategories";
import { OD_INDUSTRY_FILTER_LABEL, shopMatchesIndustryFilter } from "../../lib/odMemberDirectoryFilters";
import { OdMembershipCard } from "./OdMembershipCard";

const inputCls =
  "h-12 rounded-xl border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none focus-visible:ring-0";

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

function getShopInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const odPaymentsEnabled =
  import.meta.env.VITE_OD_BAYARCASH_RENEWAL === "true" || import.meta.env.VITE_OD_PAYMENTS_ENABLED === "true";

export const OdMemberAccountPage: React.FC = () => {
  const { currentMember, logout, updateMemberDisplayName, refreshMemberProfile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [name, setName] = useState(currentMember?.displayName ?? "");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [renewDialogPkg, setRenewDialogPkg] = useState<OdRenewalPackage | null>(null);
  const [renewSubmitting, setRenewSubmitting] = useState(false);
  const [renewError, setRenewError] = useState("");

  const [dirLoading, setDirLoading] = useState(false);
  const [dirShops, setDirShops] = useState<OdDirectoryShop[]>([]);
  const [dirError, setDirError] = useState<string | null>(null);
  const [industryFilter, setIndustryFilter] = useState<"all" | string>("all");
  const [statusAccordionValue, setStatusAccordionValue] = useState<string | undefined>(undefined);

  React.useEffect(() => {
    setName(currentMember?.displayName ?? "");
  }, [currentMember?.displayName]);

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
      setRenewError(
        reason
          ? `Payment did not complete (${reason.replace(/_/g, " ")}).`
          : "Payment did not complete."
      );
    }

    const next = new URLSearchParams(searchParams);
    next.delete("od_pay");
    next.delete("reason");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, refreshMemberProfile]);

  if (!currentMember) return null;

  const m = currentMember.membership;
  const active =
    m?.status === "active" &&
    m.validUntil &&
    new Date(m.validUntil) > new Date() &&
    (!m.validFrom || new Date(m.validFrom) <= new Date());

  useEffect(() => {
    if (!active) {
      setDirShops([]);
      setDirError(null);
      setDirLoading(false);
      return;
    }
    let cancelled = false;
    setDirLoading(true);
    setDirError(null);
    void (async () => {
      const res = await fetchOdMemberDirectory();
      if (cancelled) return;
      setDirLoading(false);
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

  const filteredShops = useMemo(() => {
    return dirShops.filter((shop) => shopMatchesIndustryFilter(shop.business_category, industryFilter));
  }, [dirShops, industryFilter]);

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
    if (!result.ok) {
      setErr(result.error);
      return;
    }
    setMsg("Saved.");
    void refreshMemberProfile();
    window.setTimeout(() => setMsg(""), 2500);
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef] px-4 py-10">
      <div className="mx-auto mb-8 flex max-w-2xl items-center justify-between">
        <h1 className="text-xl font-semibold text-[#1b1813]">OD membership</h1>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-black/10"
          onClick={() => void logout()}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>

      <div className="mx-auto max-w-2xl space-y-6">
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
                      : "Renew below to unlock the member directory and shop discounts."}
                  </p>
                  {m?.validUntil && (
                    <p className="text-sm text-[#374151]">
                      <span className="font-medium">Current period ends:</span>{" "}
                      {new Date(m.validUntil).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  )}
                  {m?.plan && (
                    <p className="text-sm text-[#6d6658]">
                      Plan: <span className="font-medium"> {m.plan === "month" ? "1 month" : "1 year"}</span>
                    </p>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        {active && (
          <div className="rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_2px_40px_rgba(0,0,0,0.04)]">
            <div className="overflow-hidden rounded-t-[1.5rem] border-b border-black/[0.05] bg-gradient-to-b from-[#faf9f7] via-white to-white px-5 pb-5 pt-6 sm:px-6">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#1b1813]/[0.06] text-[#1b1813]">
                  <Store className="h-5 w-5" aria-hidden />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-[#8a8276]">
                    Participating shops & services
                  </h2>
                  <p className="mt-2 text-[15px] leading-relaxed text-[#3d3830]">
                    Member pricing at these businesses. At the counter, open verification and show staff the green
                    screen.
                  </p>
                </div>
              </div>
            </div>

            <div className="px-5 pb-6 pt-5 sm:px-6">
              {!dirLoading && !dirError && dirShops.length > 0 && (
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

              {!dirLoading && !dirError && dirShops.length > 0 && filteredShops.length === 0 && (
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

              {!dirLoading && filteredShops.length > 0 && (
                <ul
                  className="-mx-5 flex touch-pan-x snap-x snap-mandatory gap-5 overflow-x-auto scroll-pl-5 scroll-pr-5 pb-1 pl-5 pr-5 [-ms-overflow-style:none] [scrollbar-width:none] sm:-mx-6 sm:scroll-pl-6 sm:scroll-pr-6 sm:pl-6 sm:pr-6 md:mx-0 md:grid md:max-w-none md:grid-cols-2 md:gap-6 md:overflow-visible md:px-0 md:pb-0 md:pl-0 md:pr-0 md:scroll-pl-0 md:scroll-pr-0 [&::-webkit-scrollbar]:hidden"
                >
                  {filteredShops.map((shop: OdDirectoryShop) => (
                    <li
                      key={shop.owner_id}
                      className="w-[min(88vw,380px)] shrink-0 snap-center md:w-full md:min-w-0 md:snap-none"
                    >
                      <article className="group overflow-hidden rounded-[1.35rem] bg-white shadow-[0_4px_24px_rgba(0,0,0,0.06)] ring-1 ring-black/[0.05] transition duration-300 hover:shadow-[0_12px_48px_rgba(0,0,0,0.1)] hover:ring-black/[0.08]">
                        <div
                          className="relative aspect-[21/10] min-h-[128px] overflow-hidden sm:aspect-[2/1]"
                          style={{ background: getShopPosterGradient(shop.business_category) }}
                        >
                          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(255,255,255,0.15),transparent)]" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                          <div className="absolute right-4 top-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/18 text-lg font-semibold tracking-tight text-white shadow-lg backdrop-blur-md ring-1 ring-white/25">
                            {getShopInitials(shop.business_name)}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5">
                            {shop.business_category ? (
                              <span className="mb-2 inline-flex rounded-lg bg-white/22 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-white backdrop-blur-md">
                                {OD_INDUSTRY_FILTER_LABEL[shop.business_category] ?? shop.business_category}
                              </span>
                            ) : null}
                            <h3 className="text-lg font-semibold leading-tight tracking-tight text-white drop-shadow-sm sm:text-xl">
                              {shop.business_name}
                            </h3>
                          </div>
                        </div>

                        <div className="space-y-4 p-5 sm:p-6">
                          {shop.area && (
                            <div className="flex items-start gap-2.5 text-[14px] text-[#5c554a]">
                              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8a8276]" aria-hidden />
                              <span className="leading-snug">{shop.area}</span>
                            </div>
                          )}

                          {shop.discount_summary && (
                            <div className="flex gap-3 rounded-2xl bg-emerald-50/90 px-4 py-3 ring-1 ring-emerald-200/60">
                              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                              <p className="text-[14px] font-medium leading-snug text-emerald-900">{shop.discount_summary}</p>
                            </div>
                          )}

                          {shop.maps_url && /^https?:\/\//i.test(shop.maps_url) && (
                            <a
                              href={shop.maps_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.06] bg-[#faf9f7] px-4 py-3.5 text-[14px] font-medium text-[#1b1813] transition hover:border-black/12 hover:bg-[#f5f3ef] active:scale-[0.99]"
                            >
                              <span className="flex items-center gap-2">
                                <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
                                Directions
                              </span>
                              <ChevronRight className="h-4 w-4 text-[#8a8276]" aria-hidden />
                            </a>
                          )}

                          {shop.services && shop.services.length > 0 && (
                            <div className="border-t border-black/[0.06] pt-4">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8276]">Services</p>
                              <ul className="mt-3 divide-y divide-black/[0.05]">
                                {shop.services.map((svc) => (
                                  <li key={svc.id} className="py-2.5 first:pt-0 last:pb-0">
                                    <span className="text-[15px] font-medium text-[#1b1813]">{svc.name}</span>
                                    {svc.description ? (
                                      <p className="mt-0.5 text-[14px] leading-relaxed text-[#6d6658]">{svc.description}</p>
                                    ) : null}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {!active && (
          <>
            <div className="rounded-[1.5rem] border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Renew subscription</h2>
              <p className="mt-2 text-sm text-[#6d6658]">
                Malaysia · Prices in MYR.{" "}
                {odPaymentsEnabled
                  ? "You will complete payment on Bayarcash, then return here when paid."
                  : "Confirming applies your membership immediately in this app."}
              </p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {OD_RENEWAL_PACKAGES.map((pkg) => (
                  <div
                    key={pkg.plan}
                    className="flex flex-col rounded-2xl border border-black/[0.08] bg-[#fafbfa] p-4 transition hover:border-black/15"
                  >
                    <div className="text-xs font-semibold uppercase tracking-[0.12em] text-[#8a8276]">{pkg.title}</div>
                    <div className="mt-2 text-2xl font-semibold tabular-nums text-[#1b1813]">{formatRm(pkg.priceRm)}</div>
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
          </>
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
        </div>

        <p className="text-center text-sm text-[#8a8276]">
          Business owner?{" "}
          <Link className="font-medium text-[#1b1813] underline-offset-2 hover:underline" to="/login">
            Business sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
