import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  type AdminPackageRow,
  adminCreatePackage,
  adminDeletePackage,
  adminListPackages,
  adminUpdatePackage,
} from "../../lib/db/adminPortal";
import { formatPackagePrice } from "../../lib/odPricing";

type PackageFormState = {
  plan: string;
  title: string;
  priceRm: string;
  blurb: string;
  durationLabel: string;
  isActive: boolean;
  sortOrder: string;
  oneTimePerMember: boolean;
};

const DURATION_OPTIONS = ["1 hour", "1 month", "1 year"] as const;

const normalizeDurationLabel = (value: string) => {
  const v = value.trim().toLowerCase();
  if (v.startsWith("1 year") || v === "1 year") return "1 year";
  if (v.startsWith("1 mon") || v === "1 month") return "1 month";
  if (v.includes("hour") || v === "01:00:00") return "1 hour";
  return DURATION_OPTIONS.includes(v as (typeof DURATION_OPTIONS)[number]) ? v : "1 month";
};

const defaultForm = (): PackageFormState => ({
  plan: "",
  title: "",
  priceRm: "0",
  blurb: "",
  durationLabel: "1 month",
  isActive: true,
  sortOrder: "0",
  oneTimePerMember: false,
});

const rowToForm = (row: AdminPackageRow): PackageFormState => ({
  plan: row.plan,
  title: row.title,
  priceRm: String(row.price_rm ?? 0),
  blurb: row.blurb ?? "",
  durationLabel: normalizeDurationLabel(String(row.duration_label ?? "1 month")),
  isActive: row.is_active !== false,
  sortOrder: String(row.sort_order ?? 0),
  oneTimePerMember: row.one_time_per_member === true,
});

const parseForm = (form: PackageFormState) => {
  const plan = form.plan.trim().toLowerCase();
  const title = form.title.trim();
  const priceRm = Number.parseFloat(form.priceRm);
  const sortOrder = Number.parseInt(form.sortOrder, 10);
  return {
    plan,
    title,
    priceRm: Number.isFinite(priceRm) ? priceRm : 0,
    blurb: form.blurb.trim(),
    durationLabel: normalizeDurationLabel(form.durationLabel),
    isActive: form.isActive,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    oneTimePerMember: form.oneTimePerMember,
  };
};

export const AdminPackagesPage: React.FC = () => {
  const [rows, setRows] = useState<AdminPackageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<AdminPackageRow | null>(null);
  const [createForm, setCreateForm] = useState<PackageFormState>(defaultForm);
  const [editForm, setEditForm] = useState<PackageFormState>(defaultForm);

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminListPackages();
    if (res.ok === false) {
      setError(res.error);
      setLoading(false);
      return;
    }
    setRows(res.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(
    () => [...rows].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0) || a.title.localeCompare(b.title)),
    [rows]
  );

  const openEdit = (row: AdminPackageRow) => {
    setSelected(row);
    setEditForm(rowToForm(row));
    setEditOpen(true);
  };

  const openDelete = (row: AdminPackageRow) => {
    setSelected(row);
    setDeleteOpen(true);
  };

  const handleCreate = async () => {
    const parsed = parseForm(createForm);
    if (!parsed.plan || !/^[a-z][a-z0-9_]*$/.test(parsed.plan)) {
      setError("Plan key must be lowercase letters, numbers, or underscores (e.g. month, trial_year).");
      return;
    }
    if (!parsed.title) {
      setError("Title is required.");
      return;
    }
    setBusyRow("create");
    setError("");
    const res = await adminCreatePackage(parsed);
    setBusyRow(null);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setNotice("Package created.");
    setCreateOpen(false);
    setCreateForm(defaultForm());
    void load();
    window.setTimeout(() => setNotice(""), 3000);
  };

  const handleUpdate = async () => {
    const parsed = parseForm(editForm);
    if (!parsed.title) {
      setError("Title is required.");
      return;
    }
    setBusyRow(parsed.plan);
    setError("");
    const res = await adminUpdatePackage(parsed);
    setBusyRow(null);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setNotice("Package updated.");
    setEditOpen(false);
    void load();
    window.setTimeout(() => setNotice(""), 3000);
  };

  const handleDelete = async () => {
    if (!selected) return;
    setBusyRow(selected.plan);
    setError("");
    const res = await adminDeletePackage(selected.plan);
    setBusyRow(null);
    if (res.ok === false) {
      setError(res.error);
      return;
    }
    setNotice("Package deleted.");
    setDeleteOpen(false);
    setSelected(null);
    void load();
    window.setTimeout(() => setNotice(""), 3000);
  };

  const formFields = (
    form: PackageFormState,
    setForm: React.Dispatch<React.SetStateAction<PackageFormState>>,
    opts: { planReadOnly?: boolean }
  ) => (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="pkg-plan">Plan key</Label>
        <Input
          id="pkg-plan"
          value={form.plan}
          disabled={opts.planReadOnly}
          placeholder="e.g. month, trial_year"
          onChange={(e) => setForm((prev) => ({ ...prev, plan: e.target.value.toLowerCase() }))}
        />
        {!opts.planReadOnly ? (
          <p className="text-xs text-[#6b7280]">Stable identifier stored on memberships. Cannot be changed later.</p>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pkg-title">Title</Label>
        <Input id="pkg-title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pkg-price">Price (MYR)</Label>
          <Input
            id="pkg-price"
            type="number"
            min={0}
            step="0.01"
            value={form.priceRm}
            onChange={(e) => setForm((prev) => ({ ...prev, priceRm: e.target.value }))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pkg-duration">Duration</Label>
          <select
            id="pkg-duration"
            className="flex h-10 w-full rounded-md border border-[#d5def8] bg-white px-3 text-sm"
            value={form.durationLabel}
            onChange={(e) => setForm((prev) => ({ ...prev, durationLabel: e.target.value }))}
          >
            {DURATION_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="pkg-blurb">Description</Label>
        <Input id="pkg-blurb" value={form.blurb} onChange={(e) => setForm((prev) => ({ ...prev, blurb: e.target.value }))} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="pkg-sort">Sort order</Label>
          <Input
            id="pkg-sort"
            type="number"
            value={form.sortOrder}
            onChange={(e) => setForm((prev) => ({ ...prev, sortOrder: e.target.value }))}
          />
        </div>
        <div className="flex flex-col justify-end gap-3 pb-1">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))}
            />
            Active (visible to members)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.oneTimePerMember}
              onChange={(e) => setForm((prev) => ({ ...prev, oneTimePerMember: e.target.checked }))}
            />
            One-time per member
          </label>
        </div>
      </div>
    </div>
  );

  const renderStatusBadges = (row: AdminPackageRow) => (
    <>
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
          row.is_active ? "bg-emerald-50 text-emerald-700" : "bg-[#f3f4f6] text-[#6b7280]"
        }`}
      >
        {row.is_active ? "Active" : "Inactive"}
      </span>
      {row.one_time_per_member ? (
        <span className="inline-flex rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
          One-time
        </span>
      ) : null}
    </>
  );

  const openCreate = () => {
    setError("");
    setCreateForm(defaultForm());
    setCreateOpen(true);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#dfe6fb] bg-white p-6 shadow-[0_24px_56px_-34px_rgba(37,99,235,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Packages</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">Subscription packages</h1>
            <p className="mt-2 text-sm text-[#5f6673]">
              Manage titles, prices, durations, and visibility for member subscription options.
            </p>
          </div>
          <Button onClick={openCreate}>Add package</Button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-[#dfe6fb] bg-white/95 p-4 shadow-[0_16px_34px_-30px_rgba(37,99,235,0.25)]">
        {loading ? (
          <div className="space-y-3 py-2">
            {[...Array(3)].map((_, idx) => (
              <div key={idx} className="h-14 animate-pulse rounded-xl bg-[#edf2ff]" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <p className="py-8 text-center text-sm text-[#6b7280]">No packages yet. Add your first subscription package.</p>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {sorted.map((row) => (
                <div
                  key={row.plan}
                  className="rounded-xl border border-[#e3e9fb] bg-white px-4 py-3 shadow-[0_10px_24px_-20px_rgba(37,99,235,0.3)]"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{row.plan}</p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">{row.title}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b7280]">
                    <span>Price: {formatPackagePrice(Number(row.price_rm ?? 0))}</span>
                    <span>Duration: {normalizeDurationLabel(String(row.duration_label ?? ""))}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">{renderStatusBadges(row)}</div>
                  <div className="mt-3 flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(row)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-700 hover:bg-red-50"
                      disabled={busyRow === row.plan}
                      onClick={() => openDelete(row)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <table className="hidden w-full min-w-[760px] text-left text-sm md:table">
              <thead>
                <tr className="border-b border-[#eceff6] text-[11px] uppercase tracking-[0.14em] text-[#6b7280]">
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Title</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Duration</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr key={row.plan} className="border-b border-[#f0f2f8] last:border-0">
                    <td className="py-3 pr-3 font-mono text-xs text-[#374151]">{row.plan}</td>
                    <td className="py-3 pr-3 font-medium text-[#111827]">{row.title}</td>
                    <td className="py-3 pr-3 tabular-nums">{formatPackagePrice(Number(row.price_rm ?? 0))}</td>
                    <td className="py-3 pr-3">{normalizeDurationLabel(String(row.duration_label ?? ""))}</td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-2">{renderStatusBadges(row)}</div>
                    </td>
                    <td className="py-3 pr-3">
                      <div className="flex flex-wrap gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-700 hover:bg-red-50"
                          disabled={busyRow === row.plan}
                          onClick={() => openDelete(row)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add subscription package</DialogTitle>
            <DialogDescription>Create a new plan option for OD Gold members.</DialogDescription>
          </DialogHeader>
          {formFields(createForm, setCreateForm, { planReadOnly: false })}
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busyRow === "create"} onClick={() => void handleCreate()}>
              {busyRow === "create" ? "Creating…" : "Create package"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit package</DialogTitle>
            <DialogDescription>Update pricing and display details. Plan key stays the same.</DialogDescription>
          </DialogHeader>
          {formFields(editForm, setEditForm, { planReadOnly: true })}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button disabled={busyRow === editForm.plan} onClick={() => void handleUpdate()}>
              {busyRow === editForm.plan ? "Saving…" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete package?</DialogTitle>
            <DialogDescription>
              {selected
                ? `Remove "${selected.title}" (${selected.plan}). Packages with renewal history cannot be deleted — deactivate them instead.`
                : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              disabled={!selected || busyRow === selected.plan}
              onClick={() => void handleDelete()}
            >
              {selected && busyRow === selected.plan ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPackagesPage;
