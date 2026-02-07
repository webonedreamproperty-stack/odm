import React, { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "./AuthProvider";
import { buildStaffPortalUrl } from "../lib/links";

export const SettingsPage: React.FC = () => {
  const { staffAccounts, createStaff, updateStaffPin, setStaffAccess, currentOwner } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", pin: "" });
  const [error, setError] = useState("");
  const [resetTarget, setResetTarget] = useState<{ id: string; name: string } | null>(null);
  const [resetPin, setResetPin] = useState("");
  const [resetError, setResetError] = useState("");

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = createStaff(form);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setForm({ name: "", email: "", pin: "" });
  };

  const handleReset = () => {
    if (!resetTarget) return;
    setResetError("");
    const result = updateStaffPin(resetTarget.id, resetPin);
    if (!result.ok) {
      setResetError(result.error);
      return;
    }
    setResetPin("");
    setResetTarget(null);
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in h-full flex flex-col bg-gray-50/50">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-muted-foreground">Manage your Stampverse team and access.</p>
      </div>

      <section className="rounded-3xl border bg-white p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Staff Accounts</h2>
            <p className="text-sm text-muted-foreground">
              Create staff logins for issuing cards and managing stamps.
            </p>
          </div>
          {currentOwner?.slug && currentOwner?.id && (
            <div className="text-xs text-muted-foreground space-y-2">
              <div>
                Org ID: <span className="font-mono">{currentOwner.id}</span>
              </div>
              <div className="text-[11px] text-muted-foreground/80">
                Share this Org ID or portal link with staff.
              </div>
              <div className="flex items-center gap-2">
                <Input
                  readOnly
                  value={buildStaffPortalUrl(currentOwner.slug, currentOwner.id)}
                  className="text-[11px] font-mono bg-muted/40"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigator.clipboard.writeText(buildStaffPortalUrl(currentOwner.slug, currentOwner.id))}
                >
                  Copy
                </Button>
              </div>
            </div>
          )}
        </div>

        <form className="grid gap-4 md:grid-cols-[1.2fr_1.2fr_0.8fr_auto]" onSubmit={handleCreate}>
          <div>
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Jamie Staff"
              className="mt-2"
              required
            />
          </div>
          <div>
            <Label>Email</Label>
            <Input
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="staff@brand.com"
              type="email"
              className="mt-2"
              required
            />
          </div>
          <div>
            <Label>PIN</Label>
            <Input
              value={form.pin}
              onChange={(event) => setForm({ ...form, pin: event.target.value })}
              placeholder="4-6 digits"
              className="mt-2"
              maxLength={6}
              required
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" className="rounded-full h-11 px-6">
              Add Staff
            </Button>
          </div>
        </form>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-100 overflow-hidden">
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
                className="grid grid-cols-[1.2fr_1.4fr_0.8fr_auto] gap-4 px-4 py-4 border-t"
              >
                <div className="font-medium text-foreground">{staff.businessName}</div>
                <div className="text-sm text-muted-foreground">{staff.email}</div>
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
                    onClick={() =>
                      setStaffAccess(staff.id, staff.access === "active" ? "disabled" : "active")
                    }
                  >
                    {staff.access === "active" ? "Disable" : "Enable"}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <Dialog open={!!resetTarget} onOpenChange={(open) => !open && setResetTarget(null)}>
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
            <Button variant="outline" onClick={() => setResetTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleReset}>Update PIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
