import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalLink, LogOut, MapPin, Store } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { useAuth } from "../AuthProvider";
import { OD_RENEWAL_PACKAGES, formatRm, type OdRenewalPackage } from "../../lib/odPricing";
import { memberSelfRenewOdMembership } from "../../lib/db/members";
import { fetchOdMemberDirectory, type OdDirectoryShop } from "../../lib/db/odDirectory";
import { buildOdVerifyPath } from "../../lib/links";
import { OD_BUSINESS_CATEGORIES } from "../../lib/odBusinessCategories";
import { OD_INDUSTRY_FILTER_LABEL, shopMatchesIndustryFilter } from "../../lib/odMemberDirectoryFilters";

const inputCls =
  "h-12 rounded-xl border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none focus-visible:ring-0";

export const OdMemberAccountPage: React.FC = () => {
  const { currentMember, logout, updateMemberDisplayName, refreshMemberProfile } = useAuth();
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

  React.useEffect(() => {
    setName(currentMember?.displayName ?? "");
  }, [currentMember?.displayName]);

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

  const handleConfirmRenew = async () => {
    if (!renewDialogPkg) return;
    setRenewError("");
    setRenewSubmitting(true);
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
        <div className="rounded-[1.5rem] border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Status</h2>
          <div className="mt-3 flex items-center gap-3">
            <span
              className={`inline-flex h-3 w-3 rounded-full ${active ? "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.25)]" : "bg-red-500 shadow-[0_0_0_4px_rgba(239,68,68,0.2)]"}`}
            />
            <span className="text-lg font-medium text-[#1b1813]">{active ? "Active" : "Inactive"}</span>
          </div>
          <p className="mt-2 text-sm text-[#6d6658]">
            {active
              ? "Browse participating shops below, then show verification at the counter when you visit."
              : "Renew below to unlock the member directory and shop discounts."}
          </p>
          {m?.validUntil && (
            <p className="mt-4 text-sm text-[#374151]">
              <span className="font-medium">Current period ends:</span>{" "}
              {new Date(m.validUntil).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
          {m?.plan && (
            <p className="mt-1 text-sm text-[#6d6658]">
              Plan: <span className="font-medium"> {m.plan === "month" ? "1 month" : "1 year"}</span>
            </p>
          )}
        </div>

        {active && (
          <div className="rounded-[1.5rem] border border-black/[0.06] bg-white p-6 shadow-sm">
            <div className="flex items-center gap-2">
              <Store className="h-5 w-5 text-[#8a8276]" aria-hidden />
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">
                Participating shops & services
              </h2>
            </div>
            <p className="mt-2 text-sm text-[#6d6658]">
              These businesses honour OD member pricing when your status is active. At the shop, open verification and
              show staff the green screen.
            </p>

            {!dirLoading && !dirError && dirShops.length > 0 && (
              <div className="mt-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#8a8276]">Filter by industry</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setIndustryFilter("all")}
                    className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                      industryFilter === "all"
                        ? "border-[#1b1813] bg-[#1b1813] text-white"
                        : "border-black/10 bg-[#faf9f6] text-[#374151] hover:border-black/20"
                    }`}
                  >
                    All
                  </button>
                  {OD_BUSINESS_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setIndustryFilter(cat)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                        industryFilter === cat
                          ? "border-[#1b1813] bg-[#1b1813] text-white"
                          : "border-black/10 bg-[#faf9f6] text-[#374151] hover:border-black/20"
                      }`}
                    >
                      {OD_INDUSTRY_FILTER_LABEL[cat] ?? cat}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dirLoading && (
              <div className="mt-6 flex justify-center py-10">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#1b1813] border-t-transparent" />
              </div>
            )}

            {!dirLoading && dirError && (
              <p className="mt-4 text-sm text-red-600">{dirError}</p>
            )}

            {!dirLoading && !dirError && dirShops.length === 0 && (
              <p className="mt-4 rounded-xl border border-dashed border-black/10 bg-[#faf9f6] px-4 py-6 text-center text-sm text-[#6d6658]">
                No shops listed yet. Vendors set their OD offer in Settings → OD member directory.
              </p>
            )}

            {!dirLoading && !dirError && dirShops.length > 0 && filteredShops.length === 0 && (
              <p className="mt-5 rounded-xl border border-dashed border-black/10 bg-[#faf9f6] px-4 py-6 text-center text-sm text-[#6d6658]">
                No shops in this category. Try <button type="button" className="font-medium text-[#1b1813] underline underline-offset-2" onClick={() => setIndustryFilter("all")}>All</button> or another industry.
              </p>
            )}

            {!dirLoading && filteredShops.length > 0 && (
              <ul className="mt-5 space-y-4">
                {filteredShops.map((shop) => (
                  <li
                    key={shop.owner_id}
                    className="rounded-2xl border border-black/[0.08] bg-[#fafbfa] p-4 transition hover:border-black/12"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-[#1b1813]">{shop.business_name}</h3>
                        {shop.business_category && (
                          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-[#8a8276]">
                            {OD_INDUSTRY_FILTER_LABEL[shop.business_category] ?? shop.business_category}
                          </p>
                        )}
                        {shop.area && (
                          <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6d6658]">
                            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {shop.area}
                          </p>
                        )}
                        {shop.maps_url && /^https?:\/\//i.test(shop.maps_url) && (
                          <a
                            href={shop.maps_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-[#1b1813] underline-offset-2 hover:underline"
                          >
                            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                            Directions (Google Maps)
                          </a>
                        )}
                        {shop.discount_summary && (
                          <p className="mt-2 text-sm font-medium text-emerald-800">{shop.discount_summary}</p>
                        )}
                        {shop.services && shop.services.length > 0 && (
                          <ul className="mt-3 space-y-1.5 border-t border-black/[0.06] pt-3">
                            {shop.services.map((svc) => (
                              <li key={svc.id} className="text-sm text-[#374151]">
                                <span className="font-medium">{svc.name}</span>
                                {svc.description ? (
                                  <span className="text-[#6d6658]"> — {svc.description}</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {/* <Button
                        type="button"
                        asChild
                        className="shrink-0 rounded-full bg-[#1b1813] hover:bg-[#11100d]"
                      >
                        <Link to={buildOdVerifyPath(shop.slug)}>Verify at shop</Link>
                      </Button> */}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {!active && (
          <>
            <div className="rounded-[1.5rem] border border-black/[0.06] bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Renew subscription</h2>
              <p className="mt-2 text-sm text-[#6d6658]">
                Malaysia · Prices in MYR. Confirming applies your membership immediately in this app.
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
                      Activate {renewDialogPkg.title}?
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 text-sm text-[#6d6658]">
                    <p>
                      <span className="font-semibold text-[#1b1813]">{renewDialogPkg.title}</span> ·{" "}
                      <span className="font-semibold text-[#1b1813]">{formatRm(renewDialogPkg.priceRm)}</span>
                    </p>
                    <p>
                      Your OD membership will turn <span className="font-medium text-emerald-700">active</span> for this
                      period right away. You can add card or bank payment here later.
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
                      {renewSubmitting ? "Activating…" : "Confirm & activate"}
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
