import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { UserRole } from "../types";

interface RequireRoleProps {
  allowed: UserRole[];
  redirectTo?: string;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ allowed, redirectTo = "/issued-cards" }) => {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  const role = currentUser.role ?? "owner";
  if (!allowed.includes(role)) {
    return <Navigate to={redirectTo} replace />;
  }

  return <Outlet />;
};
