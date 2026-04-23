import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminListMembers, adminListPartners, adminListSubscriptions } from "../../lib/db/adminPortal";

export const AdminDashboardHomePage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [memberCount, setMemberCount] = useState(0);
  const [partnerCount, setPartnerCount] = useState(0);
  const [subscriptionCount, setSubscriptionCount] = useState(0);
  const [activeSubscriptionCount, setActiveSubscriptionCount] = useState(0);
  const [activePartnerCount, setActivePartnerCount] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      setLoading(true);
      setError("");
      const [membersRes, partnersRes, subscriptionsRes] = await Promise.all([
        adminListMembers(),
        adminListPartners(),
        adminListSubscriptions(),
      ]);
      if (!active) return;
      if (!membersRes.ok) {
        setError(membersRes.error);
        setLoading(false);
        return;
      }
      if (!partnersRes.ok) {
        setError(partnersRes.error);
        setLoading(false);
        return;
      }
      if (!subscriptionsRes.ok) {
        setError(subscriptionsRes.error);
        setLoading(false);
        return;
      }
      setMemberCount(membersRes.data.length);
      setPartnerCount(partnersRes.data.length);
      setSubscriptionCount(subscriptionsRes.data.length);
      setActiveSubscriptionCount(
        subscriptionsRes.data.filter((row) => row.status === "active" && new Date(row.valid_until).getTime() > Date.now()).length
      );
      setActivePartnerCount(partnersRes.data.filter((row) => row.access_status === "active").length);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  const statCards = useMemo(
    () => [
      { label: "Total members", value: memberCount.toLocaleString(), helper: "OD Gold member accounts" },
      { label: "Total partners", value: partnerCount.toLocaleString(), helper: "Business accounts" },
      { label: "Total subscriptions", value: subscriptionCount.toLocaleString(), helper: "Membership records" },
      { label: "Active subscriptions", value: activeSubscriptionCount.toLocaleString(), helper: "Currently valid" },
      { label: "Active partners", value: activePartnerCount.toLocaleString(), helper: "Access status active" },
    ],
    [memberCount, partnerCount, subscriptionCount, activeSubscriptionCount, activePartnerCount]
  );

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-[#dfe6fb] bg-white/92 p-6 shadow-[0_24px_56px_-34px_rgba(37,99,235,0.32)]">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Overview</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-[#5f6673]">
          Manage OD Gold members, OD Privilege Partners, and subscriptions from the menu.
        </p>
      </div>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {statCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-[#dfe6fb] bg-white/95 p-4 shadow-[0_16px_34px_-30px_rgba(37,99,235,0.3)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">{card.label}</p>
            {loading ? (
              <div className="mt-3 h-8 w-20 animate-pulse rounded-md bg-[#eaf0ff]" />
            ) : (
              <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">{card.value}</p>
            )}
            <p className="mt-1 text-xs text-[#5f6673]">{card.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link
          to="/admin/members"
          className="rounded-2xl border border-[#dfe6fb] bg-white/92 p-5 shadow-[0_16px_34px_-30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Manage</p>
          <p className="mt-2 text-lg font-semibold text-[#111827]">Members</p>
          <p className="mt-1 text-sm text-[#5f6673]">Create, edit, and delete OD Gold member accounts.</p>
        </Link>

        <Link
          to="/admin/partners"
          className="rounded-2xl border border-[#dfe6fb] bg-white/92 p-5 shadow-[0_16px_34px_-30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Manage</p>
          <p className="mt-2 text-lg font-semibold text-[#111827]">Partners</p>
          <p className="mt-1 text-sm text-[#5f6673]">Create, edit, and delete OD Privilege Partner accounts.</p>
        </Link>

        <Link
          to="/admin/subscriptions"
          className="rounded-2xl border border-[#dfe6fb] bg-white/92 p-5 shadow-[0_16px_34px_-30px_rgba(37,99,235,0.28)] transition hover:-translate-y-0.5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Manage</p>
          <p className="mt-2 text-lg font-semibold text-[#111827]">Subscriptions</p>
          <p className="mt-1 text-sm text-[#5f6673]">Create, update, and remove member subscriptions.</p>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboardHomePage;

