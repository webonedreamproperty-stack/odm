import React, { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { AdminMemberRow, adminCreateMember, adminDeleteMember, adminListMembers, adminUpdateMember } from "../../lib/db/adminPortal";

type DialogFormState = { displayName: string; country: string; publicUsername: string };

export const AdminMembersPage: React.FC = () => {
  const [rows, setRows] = useState<AdminMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [country, setCountry] = useState("MY");
  const [busyCreate, setBusyCreate] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const [busyRow, setBusyRow] = useState<string | null>(null);
  const [selected, setSelected] = useState<AdminMemberRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogForm, setDialogForm] = useState<DialogFormState>({ displayName: "", country: "MY", publicUsername: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    const res = await adminListMembers();
    if (res.ok) {
      setRows(res.data);
    } else {
      setError("error" in res ? res.error : "Failed to load members.");
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const sorted = useMemo(() => [...rows].sort((a, b) => b.created_at.localeCompare(a.created_at)), [rows]);

  const openDialog = (row: AdminMemberRow) => {
    setSelected(row);
    setDialogForm({
      displayName: row.display_name ?? "",
      country: row.country ?? "MY",
      publicUsername: row.public_username ?? "",
    });
    setDialogOpen(true);
  };

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusyCreate(true);
    setNotice("");
    setError("");
    const res = await adminCreateMember({ email, password, displayName, country });
    setBusyCreate(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setEmail("");
    setPassword("");
    setDisplayName("");
    setCountry("MY");
    setNotice("Member account created.");
    setCreateDialogOpen(false);
    await load();
  };

  const onSave = async () => {
    if (!selected) return;
    setBusyRow(selected.id);
    setError("");
    setNotice("");
    const res = await adminUpdateMember({
      memberId: selected.id,
      displayName: dialogForm.displayName,
      country: dialogForm.country,
      publicUsername: dialogForm.publicUsername.trim() === "" ? null : dialogForm.publicUsername.trim().toLowerCase(),
    });
    setBusyRow(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice("Member updated.");
    setDialogOpen(false);
    await load();
  };

  const onDelete = async () => {
    if (!selected) return;
    setBusyRow(selected.id);
    setError("");
    setNotice("");
    const res = await adminDeleteMember(selected.id);
    setBusyRow(null);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setNotice("Member deleted.");
    setDialogOpen(false);
    await load();
  };

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#dfe6fb] bg-white/92 p-6 shadow-[0_24px_56px_-34px_rgba(37,99,235,0.32)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Members</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">OD Members</h1>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>Create member</Button>
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
                  key={row.id}
                  type="button"
                  className="w-full rounded-xl border border-[#e3e9fb] bg-white px-4 py-3 text-left shadow-[0_10px_24px_-20px_rgba(37,99,235,0.3)] transition hover:bg-[#f8faff]"
                  onClick={() => openDialog(row)}
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{row.member_code}</p>
                  <p className="mt-1 text-sm font-semibold text-[#111827]">{row.display_name ?? "Unnamed member"}</p>
                  <p className="mt-0.5 text-sm text-[#4b5563]">{row.email}</p>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#6b7280]">
                    <span>Country: {row.country ?? "-"}</span>
                    <span>Username: {row.public_username ?? "-"}</span>
                  </div>
                  <p className="mt-2 text-xs text-[#6b7280]">
                    {row.membership_status ?? "none"}
                    {row.valid_until ? ` · ${new Date(row.valid_until).toLocaleDateString()}` : ""}
                  </p>
                </button>
              ))}
            </div>

            <table className="hidden w-full min-w-[980px] text-left text-sm md:table">
              <thead>
                <tr className="border-b border-[#eceff6] text-[11px] uppercase tracking-[0.14em] text-[#6b7280]">
                  <th className="py-2 pr-3">Code</th>
                  <th className="py-2 pr-3">Email</th>
                  <th className="py-2 pr-3">Display</th>
                  <th className="py-2 pr-3">Country</th>
                  <th className="py-2 pr-3">Public username</th>
                  <th className="py-2 pr-3">Membership</th>
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
                    <td className="py-3 pr-3 font-mono text-xs">{row.member_code}</td>
                    <td className="py-3 pr-3">{row.email}</td>
                    <td className="py-3 pr-3">{row.display_name ?? "-"}</td>
                    <td className="py-3 pr-3">{row.country ?? "-"}</td>
                    <td className="py-3 pr-3">{row.public_username ?? "-"}</td>
                    <td className="py-3 pr-3 text-xs">
                      {row.membership_status ?? "none"}
                      {row.valid_until ? ` · ${new Date(row.valid_until).toLocaleDateString()}` : ""}
                    </td>
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
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>Update member details or delete this account.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1.5">
              <label htmlFor="member-email" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Email</label>
              <Input id="member-email" value={selected?.email ?? ""} disabled />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="member-display-name" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Display name</label>
              <Input
                id="member-display-name"
                value={dialogForm.displayName}
                onChange={(e) => setDialogForm((prev) => ({ ...prev, displayName: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="member-country" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Country</label>
              <Input
                id="member-country"
                value={dialogForm.country}
                onChange={(e) => setDialogForm((prev) => ({ ...prev, country: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="member-public-username" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Public username</label>
              <Input
                id="member-public-username"
                value={dialogForm.publicUsername}
                onChange={(e) => setDialogForm((prev) => ({ ...prev, publicUsername: e.target.value }))}
              />
            </div>
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
            <DialogTitle>Create member</DialogTitle>
            <DialogDescription>Create a new OD member account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onCreate} className="grid gap-3">
            <div className="space-y-1.5">
              <label htmlFor="create-member-email" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Email</label>
              <Input id="create-member-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-member-password" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Password</label>
              <Input id="create-member-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-member-display-name" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Display name</label>
              <Input id="create-member-display-name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="create-member-country" className="text-xs font-semibold uppercase tracking-[0.12em] text-[#6b7280]">Country</label>
              <Input id="create-member-country" value={country} onChange={(e) => setCountry(e.target.value)} required />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={busyCreate}>
                {busyCreate ? "Creating..." : "Create member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMembersPage;

