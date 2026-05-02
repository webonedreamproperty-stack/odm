import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import {
  type AdminMemberRow,
  type AdminSubscriptionRow,
  adminCreateSubscription,
  adminDeleteSubscription,
  adminListMembers,
  adminListSubscriptions,
  adminUpdateSubscription,
} from "../../lib/db/adminPortal";

type SubscriptionFormState = {
  memberId: string;
  status: string;
  plan: string;
  validFrom: string;
  validUntil: string;
};

const STATUS_OPTIONS = ["active", "suspended"] as const;
const PLAN_OPTIONS = ["hour", "month", "year"] as const;

const toDateInputValue = (value: string | null) => {
  if (!value) return "";
  return value.slice(0, 10);
};

const nowDateInput = () => new Date().toISOString().slice(0, 10);

const defaultUntilDateInput = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
};

const isActiveMembership = (status: string | null, validUntil: string | null) => {
  if (status !== "active") return false;
  if (!validUntil) return false;
  const untilTs = new Date(validUntil).getTime();
  return Number.isFinite(untilTs) && untilTs > Date.now();
};

export const AdminSubscriptionsPage: React.FC = () => {
  const [rows, setRows] = useState<AdminSubscriptionRow[]>([]);
  const [members, setMembers] = useState<AdminMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selected, setSelected] = useState<AdminSubscriptionRow | null>(null);
  const [createForm, setCreateForm] = useState<SubscriptionFormState>({
    memberId: "",
    status: "active",
    plan: "month",
    validFrom: nowDateInput(),
    validUntil: defaultUntilDateInput(),
  });
  const [editForm, setEditForm] = useState<SubscriptionFormState>({
    memberId: "",
    status: "active",
    plan: "month",
    validFrom: nowDateInput(),
    validUntil: defaultUntilDateInput(),
  });

  const load = async () => {
    setLoading(true);
    setError("");
    const [subRes, memberRes] = await Promise.all([adminListSubscriptions(), adminListMembers()]);
    if (subRes.ok === false) {
      setError(subRes.error);
      setLoading(false);
      return;
    }
    if (memberRes.ok === false) {
      setError(memberRes.error);
      setLoading(false);
      return;
    }
    setRows(subRes.data);
    setMembers(memberRes.data);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const subscriptionMemberIds = useMemo(() => new Set(rows.map((row) => row.member_id)), [rows]);
  const eligibleMembers = useMemo(
    () =>
      members.filter((m) => {
        if (!subscriptionMemberIds.has(m.id)) return true;
        return !isActiveMembership(m.membership_status, m.valid_until);
      }),
    [members, subscriptionMemberIds]
  );

  useEffect(() => {
    if (!createOpen) return;
    if (eligibleMembers.length === 0) {
      setCreateForm((prev) => ({ ...prev, memberId: "" }));
      return;
    }
    if (!eligibleMembers.some((m) => m.id === createForm.memberId)) {
      setCreateForm((prev) => ({ ...prev, memberId: eligibleMembers[0].id }));
    }
  }, [createOpen, eligibleMembers, createForm.memberId]);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.updated_at.localeCompare(a.updated_at)), [rows]);

  const openEdit = (row: AdminSubscriptionRow) => {
    setSelected(row);
    setEditForm({
      memberId: row.member_id,
      status: row.status ?? "active",
      plan: row.plan ?? "month",
      validFrom: toDateInputValue(row.valid_from),
      validUntil: toDateInputValue(row.valid_until),
    });
    setEditOpen(true);
  };

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!createForm.memberId) return;
    setBusyRow(createForm.memberId);
    setError("");
    setNotice("");
    const res = await adminCreateSubscription({
      memberId: createForm.memberId,
      status: createForm.status,
      plan: createForm.plan,
      validFrom: `${createForm.validFrom}T00:00:00Z`,
      validUntil: `${createForm.validUntil}T23:59:59Z`,
    });
    setBusyRow(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setCreateOpen(false);
    setNotice("Membership created.");
    await load();
  };

  const onUpdate = async () => {
    if (!selected) return;
    setBusyRow(selected.member_id);
    setError("");
    setNotice("");
    const res = await adminUpdateSubscription({
      memberId: selected.member_id,
      status: editForm.status,
      plan: editForm.plan,
      validFrom: `${editForm.validFrom}T00:00:00Z`,
      validUntil: `${editForm.validUntil}T23:59:59Z`,
    });
    setBusyRow(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditOpen(false);
    setNotice("Membership updated.");
    await load();
  };

  const onDelete = async () => {
    if (!selected) return;
    setBusyRow(selected.member_id);
    setError("");
    setNotice("");
    const res = await adminDeleteSubscription(selected.member_id);
    setBusyRow(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEditOpen(false);
    setNotice("Membership deleted.");
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#dfe6fb] bg-white/92 p-6 shadow-[0_24px_56px_-34px_rgba(37,99,235,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Subscriptions</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">Member Subscriptions</h1>
          </div>
          <Button onClick={() => setCreateOpen(true)} disabled={eligibleMembers.length === 0}>
            Create subscription
          </Button>
        </div>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      <div className="overflow-x-auto rounded-2xl border border-[#dfe6fb] bg-white/95 p-4 shadow-[0_16px_34px_-30px_rgba(37,99,235,0.25)]">
        {loading ? (
          <div className="space-y-3 py-2">
            {[...Array(5)].map((_, idx) => (
              <div key={idx} className="h-14 animate-pulse rounded-xl bg-[#edf2ff]" />
            ))}
          </div>
        ) : (
          <>
            <div className="space-y-3 md:hidden">
              {sorted.map((row) => (
                <button
                  key={row.member_id}
                  type="button"
                  className="w-full rounded-xl border border-[#e3e9fb] bg-white px-4 py-3 text-left shadow-[0_10px_24px_-20px_rgba(37,99,235,0.3)] transition hover:bg-[#f8faff]"
                  onClick={() => openEdit(row)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{row.member_code}</p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">{row.display_name || "OD Gold Member"}</p>
                  <p className="mt-0.5 text-sm text-[#4b5563]">{row.email}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b7280]">
                    <span>Status: {row.status}</span>
                    <span>Plan: {row.plan}</span>
                    <span>Until: {new Date(row.valid_until).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>

            <table className="hidden w-full min-w-[980px] text-left text-sm md:table">
              <thead>
                <tr className="border-b border-[#eceff6] text-[11px] uppercase tracking-[0.14em] text-[#6b7280]">
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Display</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Valid from</th>
                  <th className="py-2 pr-3">Valid until</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => (
                  <tr
                    key={row.member_id}
                    className="cursor-pointer border-b border-[#f0f2f8] transition hover:bg-[#f8faff]"
                    onClick={() => openEdit(row)}
                  >
                    <td className="py-3 pr-3 font-mono text-xs">{row.member_code}</td>
                    <td className="py-3 pr-3">{row.email}</td>
                    <td className="py-3 pr-3">{row.display_name || "-"}</td>
                    <td className="py-3 pr-3">{row.status}</td>
                    <td className="py-3 pr-3">{row.plan}</td>
                    <td className="py-3 pr-3 text-xs">{new Date(row.valid_from).toLocaleDateString()}</td>
                    <td className="py-3 pr-3 text-xs">{new Date(row.valid_until).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sorted.length === 0 ? <p className="py-8 text-center text-sm text-[#6b7280]">No memberships yet.</p> : null}
          </>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create membership</DialogTitle>
            <DialogDescription>
              Pick a member without active membership and activate their subscription.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="grid gap-3">
            <div className="space-y-1.5">
              <label htmlFor="subscription-member" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Member</label>
              <select
                id="subscription-member"
                value={createForm.memberId}
                onChange={(e) => setCreateForm((prev) => ({ ...prev, memberId: e.target.value }))}
                className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                required
              >
                {eligibleMembers.length === 0 ? <option value="">No eligible member</option> : null}
                {eligibleMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.member_code} - {m.display_name || m.email}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="subscription-status" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Status</label>
                <select
                  id="subscription-status"
                  value={createForm.status}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="subscription-plan" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Plan</label>
                <select
                  id="subscription-plan"
                  value={createForm.plan}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, plan: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {PLAN_OPTIONS.map((plan) => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="subscription-valid-from" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Valid from</label>
                <input
                  id="subscription-valid-from"
                  type="date"
                  value={createForm.validFrom}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, validFrom: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="subscription-valid-until" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Valid until</label>
                <input
                  id="subscription-valid-until"
                  type="date"
                  value={createForm.validUntil}
                  onChange={(e) => setCreateForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  required
                />
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!!busyRow || eligibleMembers.length === 0}>
                {busyRow ? "Creating..." : "Create subscription"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit membership</DialogTitle>
            <DialogDescription>Update status, plan, dates, or delete the subscription.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Member</label>
              <div className="rounded-xl border border-input bg-muted/30 px-3 py-2 text-sm">
                {selected?.member_code} - {selected?.display_name || selected?.email}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-subscription-status" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Status</label>
                <select
                  id="edit-subscription-status"
                  value={editForm.status}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-subscription-plan" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Plan</label>
                <select
                  id="edit-subscription-plan"
                  value={editForm.plan}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, plan: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                >
                  {PLAN_OPTIONS.map((plan) => (
                    <option key={plan} value={plan}>{plan}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="edit-subscription-valid-from" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Valid from</label>
                <input
                  id="edit-subscription-valid-from"
                  type="date"
                  value={editForm.validFrom}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, validFrom: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="edit-subscription-valid-until" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Valid until</label>
                <input
                  id="edit-subscription-valid-until"
                  type="date"
                  value={editForm.validUntil}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                  className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  required
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="destructive" disabled={!selected || busyRow === selected.member_id} onClick={() => void onDelete()}>
              {busyRow && selected && busyRow === selected.member_id ? "Deleting..." : "Delete"}
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button disabled={!selected || busyRow === selected.member_id} onClick={() => void onUpdate()}>
              {busyRow && selected && busyRow === selected.member_id ? "Saving..." : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminSubscriptionsPage;

