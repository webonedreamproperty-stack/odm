import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { odPlanLabel } from "../../lib/odPricing";
import { Button } from "../ui/button";

type MemberRow = {
  id: string;
  email: string;
  display_name: string;
  member_code: string;
  country: string;
  created_at: string;
  membership_status: string | null;
  membership_plan: string | null;
  valid_from: string | null;
  valid_until: string | null;
};

type VendorRow = {
  id: string;
  business_name: string;
  email: string;
  slug: string | null;
  role: string;
  account_status: string;
  access_status: string;
  tier: string;
  tier_expires_at: string | null;
  created_at: string;
  staff_count: number;
};

type RenewalRow = {
  id: string;
  member_id: string;
  member_code: string;
  email: string;
  plan: string;
  valid_from: string;
  valid_until: string;
  created_at: string;
};

function memberActiveLabel(row: MemberRow): string {
  const st = row.membership_status;
  const until = row.valid_until ? new Date(row.valid_until).getTime() : 0;
  if (st === "active" && until > Date.now()) return "active";
  if (st === "suspended") return "suspended";
  if (!row.valid_until) return "none";
  return "expired";
}

function vendorTierLabel(row: VendorRow): string {
  const tier = row.tier ?? "free";
  const exp = row.tier_expires_at ? new Date(row.tier_expires_at) : null;
  if (tier === "pro" && exp && exp.getTime() > Date.now()) {
    return `pro · until ${exp.toLocaleDateString()}`;
  }
  return tier;
}

export const OdAdminPage: React.FC = () => {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [vendors, setVendors] = useState<VendorRow[]>([]);
  const [renewals, setRenewals] = useState<RenewalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [renewBusy, setRenewBusy] = useState<string | null>(null);
  const [renewMsg, setRenewMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const [mRes, vRes, rRes] = await Promise.all([
      supabase.rpc("admin_list_od_members"),
      supabase.rpc("admin_list_vendor_accounts"),
      supabase.rpc("admin_list_od_renewals", { p_limit: 200 }),
    ]);
    if (mRes.error) setError(mRes.error.message);
    else if (vRes.error) setError(vRes.error.message);
    else if (rRes.error) setError(rRes.error.message);
    else {
      const mRaw = mRes.data as unknown;
      const vRaw = vRes.data as unknown;
      const rRaw = rRes.data as unknown;
      setMembers(Array.isArray(mRaw) ? (mRaw as MemberRow[]) : []);
      setVendors(Array.isArray(vRaw) ? (vRaw as VendorRow[]) : []);
      setRenewals(Array.isArray(rRaw) ? (rRaw as RenewalRow[]) : []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const renew = async (memberId: string, plan: "month" | "year" | "hour") => {
    setRenewBusy(memberId + plan);
    setRenewMsg("");
    const { error: rpcErr } = await supabase.rpc("admin_renew_od_membership", {
      p_member_id: memberId,
      p_plan: plan,
    });
    setRenewBusy(null);
    if (rpcErr) {
      setRenewMsg(rpcErr.message);
      return;
    }
    setRenewMsg("Renewal saved.");
    void load();
    window.setTimeout(() => setRenewMsg(""), 3000);
  };

  return (
    <div className="min-h-screen bg-[#f5f3ef] px-4 py-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-[#1b1813]">OD admin</h1>
            <p className="text-sm text-[#6d6658]">
              Members (OD), vendors (business accounts), and renewal history.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-[#1b1813] underline-offset-2 hover:underline"
          >
            Back to dashboard
          </Link>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {renewMsg && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {renewMsg}
          </div>
        )}

        <section className="rounded-[1.5rem] border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">OD members</h2>
          <p className="mt-1 text-xs text-[#6d6658]">Consumer accounts · membership status</p>
          {loading ? (
            <div className="py-12 text-center text-sm text-[#6d6658]">Loading…</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[11px] uppercase tracking-wide text-[#8a8276]">
                    <th className="py-2 pr-3">Code</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Membership</th>
                    <th className="py-2 pr-3">Until</th>
                    <th className="py-2">Renew</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((row) => (
                    <tr key={row.id} className="border-b border-black/[0.04]">
                      <td className="py-3 pr-3 font-mono text-xs">{row.member_code}</td>
                      <td className="py-3 pr-3">{row.email}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={
                            memberActiveLabel(row) === "active"
                              ? "font-medium text-emerald-700"
                              : "text-[#6d6658]"
                          }
                        >
                          {memberActiveLabel(row)}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs">
                        {row.valid_until ? new Date(row.valid_until).toLocaleDateString() : "—"}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs"
                            disabled={renewBusy !== null}
                            onClick={() => void renew(row.id, "hour")}
                          >
                            {renewBusy === row.id + "hour" ? "…" : "+1 hr"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs"
                            disabled={renewBusy !== null}
                            onClick={() => void renew(row.id, "month")}
                          >
                            {renewBusy === row.id + "month" ? "…" : "+1 mo"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full text-xs"
                            disabled={renewBusy !== null}
                            onClick={() => void renew(row.id, "year")}
                          >
                            {renewBusy === row.id + "year" ? "…" : "+1 yr"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {members.length === 0 && (
                <p className="py-8 text-center text-sm text-[#6d6658]">No members yet.</p>
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Vendor accounts</h2>
          <p className="mt-1 text-xs text-[#6d6658]">Business owners (shop / loyalty app) · access & tier</p>
          {loading ? (
            <div className="py-8 text-center text-sm text-[#6d6658]">Loading…</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[880px] text-left text-sm">
                <thead>
                  <tr className="border-b border-black/[0.06] text-[11px] uppercase tracking-wide text-[#8a8276]">
                    <th className="py-2 pr-3">Business</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Slug</th>
                    <th className="py-2 pr-3">Email verify</th>
                    <th className="py-2 pr-3">Access</th>
                    <th className="py-2 pr-3">Tier</th>
                    <th className="py-2 pr-3">Staff</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((row) => (
                    <tr key={row.id} className="border-b border-black/[0.04]">
                      <td className="py-3 pr-3 font-medium">{row.business_name}</td>
                      <td className="py-3 pr-3">{row.email}</td>
                      <td className="py-3 pr-3 font-mono text-xs">{row.slug ?? "—"}</td>
                      <td className="py-3 pr-3 text-xs capitalize">{row.account_status}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={
                            row.access_status === "active" ? "font-medium text-emerald-700" : "text-amber-800"
                          }
                        >
                          {row.access_status}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-xs">{vendorTierLabel(row)}</td>
                      <td className="py-3 pr-3 tabular-nums">{row.staff_count ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vendors.length === 0 && (
                <p className="py-8 text-center text-sm text-[#6d6658]">No vendor accounts.</p>
              )}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[1.5rem] border border-black/[0.06] bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8a8276]">Recent renewals</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-black/[0.06] text-[11px] uppercase tracking-wide text-[#8a8276]">
                  <th className="py-2 pr-3">When</th>
                  <th className="py-2 pr-3">Member</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Period</th>
                </tr>
              </thead>
              <tbody>
                {renewals.map((row) => (
                  <tr key={row.id} className="border-b border-black/[0.04]">
                    <td className="py-3 pr-3 text-xs">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 pr-3 font-mono text-xs">{row.member_code}</td>
                    <td className="py-3 pr-3">{odPlanLabel(row.plan)}</td>
                    <td className="py-3 pr-3 text-xs">
                      {new Date(row.valid_from).toLocaleDateString()} →{" "}
                      {new Date(row.valid_until).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {renewals.length === 0 && !loading && (
              <p className="py-8 text-center text-sm text-[#6d6658]">No renewals logged yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
