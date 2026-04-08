import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AdminPartnerRow, adminCreatePartner, adminDeletePartner, adminListPartners, adminUpdatePartner } from "../../lib/db/adminPortal";
import { VendorPublicPlaceCard } from "../VendorPublicPlaceCard";
import type { PublicVendorHandle } from "../../lib/db/publicHandle";
import { supabase } from "../../lib/supabase";

type DialogFormState = {
  businessName: string;
  slug: string;
  accountStatus: string;
  accessStatus: string;
  tier: string;
};

const ACCOUNT_STATUS_OPTIONS = ["unverified", "active", "inactive"] as const;
const ACCESS_STATUS_OPTIONS = ["active", "disabled"] as const;
const TIER_OPTIONS = ["free", "starter", "pro", "business"] as const;

export const AdminPartnersPage: React.FC = () => {
  const [rows, setRows] = useState<AdminPartnerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [busyCreate, setBusyCreate] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminPartnerRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogForm, setDialogForm] = useState<DialogFormState>({
    businessName: "",
    slug: "",
    accountStatus: "active",
    accessStatus: "active",
    tier: "free",
  });
  const [previewVendor, setPreviewVendor] = useState<PublicVendorHandle | null>(null);
  const [previewPlaceDetails, setPreviewPlaceDetails] = useState<Record<string, unknown> | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminListPartners();
    if (res.ok) {
      setRows(res.data);
    } else {
      setError("error" in res ? res.error : "Failed to load partners.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)), [rows]);

  const openDialog = (row: AdminPartnerRow) => {
    setSelected(row);
    setDialogForm({
      businessName: row.business_name ?? "",
      slug: row.slug ?? "",
      accountStatus: row.account_status ?? "active",
      accessStatus: row.access_status ?? "active",
      tier: row.tier ?? "free",
    });
    setDialogOpen(true);
  };

  useEffect(() => {
    if (!selected || !dialogOpen) {
      setPreviewVendor(null);
      setPreviewPlaceDetails(null);
      setPreviewError(null);
      setPreviewLoading(false);
      return;
    }

    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);

    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, slug, business_name, od_listing_area, od_discount_summary, od_maps_url, od_logo_url, od_shop_photo_url, od_business_category, od_directory_visible, od_google_place_id")
        .eq("id", selected.id)
        .maybeSingle();

      if (!active) return;
      if (error || !data) {
        setPreviewLoading(false);
        setPreviewError("Could not load partner preview info.");
        return;
      }

      const googlePlaceId = (data.od_google_place_id ?? "").trim();
      let cachedPlaceDetails: Record<string, unknown> | null = null;

      if (googlePlaceId) {
        const cacheRes = await supabase
          .from("od_place_details_cache")
          .select("payload")
          .eq("place_id", googlePlaceId)
          .maybeSingle();
        if (cacheRes.data?.payload && typeof cacheRes.data.payload === "object" && !Array.isArray(cacheRes.data.payload)) {
          cachedPlaceDetails = cacheRes.data.payload as Record<string, unknown>;
        }
      }

      if (!active) return;
      setPreviewVendor({
        kind: "vendor",
        slug: (data.slug ?? "").trim() || "preview",
        business_name: (data.business_name ?? selected.business_name ?? "").trim() || "Business",
        listing_area: data.od_listing_area ?? null,
        discount_summary: data.od_discount_summary ?? null,
        maps_url: data.od_maps_url ?? null,
        logo_url: data.od_logo_url ?? null,
        shop_photo_url: data.od_shop_photo_url ?? null,
        business_category: data.od_business_category ?? null,
        directory_visible: data.od_directory_visible !== false,
        google_place_id: googlePlaceId || null,
        place_details: cachedPlaceDetails,
      });
      setPreviewPlaceDetails(cachedPlaceDetails);
      setPreviewLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [selected, dialogOpen]);

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyCreate(true);
    setNotice("");
    setError("");
    const res = await adminCreatePartner({
      email,
      password,
      businessName,
      slug: slug.trim() === "" ? null : slug.trim().toLowerCase(),
    });
    setBusyCreate(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEmail("");
    setPassword("");
    setBusinessName("");
    setSlug("");
    setNotice("Partner account created.");
    setCreateDialogOpen(false);
    await load();
  };

  const onSave = async () => {
    if (!selected) return;
    setBusyRow(selected.id);
    setNotice("");
    setError("");
    const res = await adminUpdatePartner({
      partnerId: selected.id,
      businessName: dialogForm.businessName,
      slug: dialogForm.slug.trim() === "" ? null : dialogForm.slug.trim().toLowerCase(),
      accountStatus: dialogForm.accountStatus,
      accessStatus: dialogForm.accessStatus,
      tier: dialogForm.tier,
    });
    setBusyRow(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice("Partner updated.");
    setDialogOpen(false);
    await load();
  };

  const onDelete = async () => {
    if (!selected) return;
    setBusyRow(selected.id);
    setNotice("");
    setError("");
    const res = await adminDeletePartner(selected.id);
    setBusyRow(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice("Partner deleted.");
    setDialogOpen(false);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#dfe6fb] bg-white/92 p-6 shadow-[0_24px_56px_-34px_rgba(37,99,235,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Partners</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">OD Partners</h1>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>Create partner</Button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-[#dfe6fb] bg-white/95 p-4 shadow-[0_16px_34px_-30px_rgba(37,99,235,0.25)]">
        {loading ? (
          <div className="space-y-3 py-2">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="h-16 animate-pulse rounded-xl bg-[#edf2ff]" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {sorted.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className="w-full rounded-2xl border border-[#e6e9f3] bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(15,23,42,0.06),0_10px_28px_-18px_rgba(15,23,42,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_6px_20px_-12px_rgba(15,23,42,0.3)]"
                  onClick={() => openDialog(row)}
                >
                  <p className="text-sm font-semibold text-[#111827]">{row.business_name ?? "Unnamed partner"}</p>
                  <p className="mt-0.5 text-sm text-[#4b5563]">{row.email}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b7280]">
                    <span>Slug: {row.slug ?? "-"}</span>
                    <span>Account: {row.account_status ?? "-"}</span>
                    <span>Access: {row.access_status ?? "-"}</span>
                    <span>Tier: {row.tier ?? "-"}</span>
                    <span>Staff: {row.staff_count ?? 0}</span>
                  </div>
                </button>
              ))}
            </div>

            <table className="hidden w-full min-w-[1120px] text-left text-sm md:table">
              <thead>
                <tr className="border-b border-[#eceff6] text-[11px] uppercase tracking-[0.14em] text-[#6b7280]">
                  <th className="py-2 pr-3">Business</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Slug</th>
                  <th className="py-2 pr-3">Account</th>
                  <th className="py-2 pr-3">Access</th>
                  <th className="py-2 pr-3">Tier</th>
                  <th className="py-2 pr-3">Staff</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer border-b border-[#f0f2f8] transition hover:bg-[#f8faff]"
                    onClick={() => openDialog(row)}
                  >
                    <td className="py-3 pr-3">{row.business_name ?? "-"}</td>
                    <td className="py-3 pr-3">{row.email}</td>
                    <td className="py-3 pr-3">{row.slug ?? "-"}</td>
                    <td className="py-3 pr-3">{row.account_status ?? "-"}</td>
                    <td className="py-3 pr-3">{row.access_status ?? "-"}</td>
                    <td className="py-3 pr-3">{row.tier ?? "-"}</td>
                    <td className="py-3 pr-3 tabular-nums">{row.staff_count ?? 0}</td>
                    <td className="py-3 pr-3 text-xs text-[#6b7280]">Click row</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit partner</DialogTitle>
            <DialogDescription>Update partner details or delete this account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <label htmlFor="partner-email" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Email</label>
              <Input id="partner-email" value={selected?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partner-business-name" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Business name</label>
              <Input
                id="partner-business-name"
                value={dialogForm.businessName}
                onChange={(e) => setDialogForm((prev) => ({ ...prev, businessName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partner-slug" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Slug</label>
              <Input
                id="partner-slug"
                value={dialogForm.slug}
                onChange={(e) => setDialogForm((prev) => ({ ...prev, slug: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partner-account-status" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Account status</label>
              <select
                id="partner-account-status"
                value={dialogForm.accountStatus}
                onChange={(e) => setDialogForm((prev) => ({ ...prev, accountStatus: e.target.value }))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {!ACCOUNT_STATUS_OPTIONS.includes(dialogForm.accountStatus as (typeof ACCOUNT_STATUS_OPTIONS)[number]) ? (
                  <option value={dialogForm.accountStatus}>{dialogForm.accountStatus}</option>
                ) : null}
                {ACCOUNT_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partner-access-status" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Access status</label>
              <select
                id="partner-access-status"
                value={dialogForm.accessStatus}
                onChange={(e) => setDialogForm((prev) => ({ ...prev, accessStatus: e.target.value }))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {!ACCESS_STATUS_OPTIONS.includes(dialogForm.accessStatus as (typeof ACCESS_STATUS_OPTIONS)[number]) ? (
                  <option value={dialogForm.accessStatus}>{dialogForm.accessStatus}</option>
                ) : null}
                {ACCESS_STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partner-tier" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Tier</label>
              <select
                id="partner-tier"
                value={dialogForm.tier}
                onChange={(e) => setDialogForm((prev) => ({ ...prev, tier: e.target.value }))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {!TIER_OPTIONS.includes(dialogForm.tier as (typeof TIER_OPTIONS)[number]) ? (
                  <option value={dialogForm.tier}>{dialogForm.tier}</option>
                ) : null}
                {TIER_OPTIONS.map((tier) => (
                  <option key={tier} value={tier}>
                    {tier}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-3 rounded-2xl border border-border/80 bg-muted/20 p-4">
            <div>
              <p className="text-sm font-semibold text-[#111827]">Member-facing preview</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Same Google-style card members see on your public link. It uses cached Google place details and partner branding.
              </p>
            </div>
            {previewLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-foreground" />
              </div>
            ) : previewError ? (
              <p className="text-sm text-destructive">{previewError}</p>
            ) : previewVendor && previewPlaceDetails ? (
              <div className="mx-auto max-w-md overflow-hidden rounded-xl shadow-lg ring-1 ring-border">
                <VendorPublicPlaceCard vendor={previewVendor} placeDetails={previewPlaceDetails} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No cached Google place details found for this partner yet.
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" disabled={!selected || busyRow === selected.id} onClick={() => void onDelete()}>
              {busyRow && selected && busyRow === selected.id ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button disabled={!selected || busyRow === selected.id} onClick={() => void onSave()}>
              {busyRow && selected && busyRow === selected.id ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create partner</DialogTitle>
            <DialogDescription>Create a new OD partner account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="grid gap-3">
            <div className="space-y-1.5">
              <label htmlFor="create-partner-business-name" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Business name</label>
              <Input id="create-partner-business-name" value={businessName} onChange={(e) => setBusinessName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-partner-slug" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Slug (optional)</label>
              <Input id="create-partner-slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-partner-email" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Email</label>
              <Input id="create-partner-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-partner-password" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Password</label>
              <Input id="create-partner-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busyCreate}>
                {busyCreate ? "Creating..." : "Create partner"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPartnersPage;

