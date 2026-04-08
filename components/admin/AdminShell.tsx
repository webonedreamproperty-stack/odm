import React from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button } from "../ui/button";
import { useAuth } from "../AuthProvider";

export const AdminShell: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = () => {
    void logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8faff_34%,#ffffff_70%)] text-[#101828]">
      <header className="sticky top-0 z-30 border-b border-[#dfe6fb] bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#2b4fc7_0%,#1a73e8_100%)] text-sm font-bold text-white shadow-[0_8px_20px_-10px_rgba(43,79,199,0.8)]">
              A
            </span>
            Admin Portal
          </Link>
          <Button variant="outline" className="border-[#d5def8] bg-white hover:bg-[#f7f9ff]" onClick={handleLogout}>
            Log out
          </Button>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 sm:px-6 md:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-[#dfe6fb] bg-white/95 p-3 shadow-[0_20px_44px_-32px_rgba(37,99,235,0.35)]">
          <nav className="space-y-1">
            {[
              { to: "/admin/dashboard", label: "Overview" },
              { to: "/admin/members", label: "Members" },
              { to: "/admin/partners", label: "Partners" },
              { to: "/admin/subscriptions", label: "Subscriptions" },
            ].map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `block rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? "bg-[linear-gradient(90deg,#edf2ff_0%,#e8f0ff_100%)] text-[#1f3fb0] shadow-[inset_0_0_0_1px_rgba(43,79,199,0.15)]"
                      : "text-[#4b5563] hover:bg-[#f2f6ff]"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <section>
          <Outlet />
        </section>
      </div>
    </div>
  );
};

export default AdminShell;

