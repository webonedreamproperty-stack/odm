import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { setAdminAuthenticated } from "../lib/adminAuth";

export const AdminDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    setAdminAuthenticated(false);
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#f8f9fc_0%,#ffffff_52%)] px-4 py-10 text-[#111827]">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex items-center justify-between rounded-2xl border border-[#e8ebf4] bg-white/85 px-6 py-4 shadow-[0_14px_36px_-28px_rgba(15,23,42,0.25)] backdrop-blur">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6b7280]">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Dashboard</h1>
          </div>
          <Button variant="outline" onClick={handleLogout}>
            Log out
          </Button>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          {[
            { title: "Total Users", value: "—" },
            { title: "Active Campaigns", value: "—" },
            { title: "Today Sign-ins", value: "—" },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-[#e8ebf4] bg-white/88 p-5 shadow-[0_16px_38px_-30px_rgba(15,23,42,0.2)] backdrop-blur"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280]">{item.title}</p>
              <p className="mt-3 text-3xl font-semibold tracking-tight text-[#1f2937]">{item.value}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
};

export default AdminDashboardPage;

