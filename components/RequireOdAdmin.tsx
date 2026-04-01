import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { fetchIsOdAdmin } from "../lib/db/members";

export const RequireOdAdmin: React.FC = () => {
  const { loading, currentUser, currentMember } = useAuth();
  const userId = currentUser?.id ?? currentMember?.id;
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (loading) return;
    if (!userId) {
      setAllowed(false);
      return;
    }
    let active = true;
    void (async () => {
      const ok = await fetchIsOdAdmin(userId);
      if (active) setAllowed(ok);
    })();
    return () => {
      active = false;
    };
  }, [loading, userId]);

  if (loading || (userId && allowed === null)) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f3ef]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1b1813] border-t-transparent" />
      </div>
    );
  }

  if (!userId) {
    return <Navigate to="/login" state={{ from: { pathname: "/od/admin" } }} replace />;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ef] px-6">
        <div className="max-w-md rounded-2xl border border-black/10 bg-white p-8 text-center shadow-sm">
          <h1 className="text-lg font-semibold text-[#1b1813]">Not authorized</h1>
          <p className="mt-2 text-sm text-[#6d6658]">
            OD admin access is required. Your account must be listed in the{" "}
            <code className="rounded bg-black/[0.06] px-1.5 py-0.5 text-xs">od_admins</code> table.
          </p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
