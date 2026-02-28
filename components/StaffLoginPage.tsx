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
  const [busy, setBusy] = useState(false);

  const withTimeout = async <T,>(promise: Promise<T>, ms = 15000): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error("Login timed out. Please check your internet connection and Supabase settings."));
      }, ms);
      promise
        .then((value) => {
          window.clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((err) => {
          window.clearTimeout(timeoutId);
          reject(err);
        });
    });

  useEffect(() => {
    const orgParam = searchParams.get("id") ?? "";
    if (orgParam) {
      setOrgId(orgParam);
    }
  }, [searchParams]);

  if (currentUser) {
    return <Navigate to="/issued-cards" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await withTimeout(loginStaff(email, pin, orgId));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigate("/issued-cards");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to log in right now.");
    } finally {
      setBusy(false);
    }
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
          <p className="mt-2 text-xs text-muted-foreground">
            {searchParams.get("id")
              ? "This Org ID is pre-filled from your portal link."
              : "Ask your owner for the Org ID from Settings."}
          </p>
        </div>
        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button type="submit" className="h-12 w-full text-base" disabled={busy}>
          {busy ? "Logging in..." : "Log in as Staff"}
        </Button>
        <div className="text-center text-sm text-muted-foreground">
          Owner login?{" "}
          <Link to="/login" className="font-semibold text-foreground underline">
            Go to main login
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};
