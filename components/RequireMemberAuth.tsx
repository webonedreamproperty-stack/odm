import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";

export const RequireMemberAuth: React.FC = () => {
  const { currentMember, loading, accountKind } = useAuth();
  const location = useLocation();

  if (loading && !currentMember) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f3ef]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1b1813] border-t-transparent" />
      </div>
    );
  }

  if (!currentMember || accountKind !== "member") {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return <Navigate to={`/od/member/login?next=${next}`} replace />;
  }

  return <Outlet />;
};
