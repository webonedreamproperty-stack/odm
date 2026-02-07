import React, { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AuthLayout } from "./AuthLayout";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { useAuth } from "./AuthProvider";

export const StaffLoginPage: React.FC = () => {
  const { currentUser, loginStaff } = useAuth();
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [orgId, setOrgId] = useState("");
  const [error, setError] = useState("");

  if (currentUser) {
    return <Navigate to="/issued-cards" replace />;
  }

  useEffect(() => {
    const orgParam = searchParams.get("id") ?? "";
    if (orgParam) {
      setOrgId(orgParam);
    }
  }, [searchParams]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    const result = loginStaff(email, pin, orgId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    navigate("/issued-cards");
  };

  return (
    <AuthLayout
      title="Staff Portal"
      subtitle="Log in with your email, PIN, and Org ID to start issuing cards."
      badge="Team access"
    >
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div>
          <Label>Email</Label>
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@brand.com"
            className="mt-2"
            type="email"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <Label>PIN</Label>
          <Input
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            placeholder="4-6 digits"
            className="mt-2"
            type="password"
            inputMode="numeric"
            maxLength={6}
            required
          />
        </div>
        <div>
          <Label>Org ID</Label>
          <Input
            value={orgId}
            onChange={(event) => setOrgId(event.target.value)}
            placeholder="owner business ID"
            className="mt-2 font-mono"
            required
            disabled={!!searchParams.get("id")}
          />
          <p className="text-xs text-slate-500 mt-2">
            {searchParams.get("id")
              ? "This Org ID is pre-filled from your portal link."
              : "Ask your owner for the Org ID from Settings."}
          </p>
        </div>
        {error && (
          <div className="rounded-xl bg-rose-50 text-rose-700 px-4 py-3 text-sm border border-rose-200">
            {error}
          </div>
        )}
        <Button type="submit" className="w-full rounded-full h-12 text-base">
          Log in as Staff
        </Button>
        <div className="text-sm text-center text-slate-600">
          Owner login?{" "}
          <Link to="/login" className="font-semibold text-slate-900 underline">
            Go to main login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
