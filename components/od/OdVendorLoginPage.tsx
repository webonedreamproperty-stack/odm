import React, { useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "../AuthProvider";
import type { AuthResult } from "../AuthProvider";

const inputCls =
  "h-14 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";
const labelCls =
  "block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#777062]";

export const OdVendorLoginPage: React.FC = () => {
  const { currentUser, currentMember, accountKind, loading, login } = useAuth();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && currentUser && accountKind === "vendor") {
    return <Navigate to={nextPath.startsWith("/") ? nextPath : "/dashboard"} replace />;
  }
  if (!loading && currentMember && accountKind === "member") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ef] px-6">
        <div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-[#6d6658]">This is a member account. Use member sign-in instead.</p>
          <Button type="button" className="mt-4 rounded-full" asChild>
            <Link to="/od/member/login">OD Gold member sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = (await login(email, password)) as AuthResult;
      if (result.ok === false) {
        setError(result.error);
      }
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const isDisabled = busy || loading;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ef] px-6 py-12">
      <div className="w-full max-w-md rounded-[1.75rem] border border-black/[0.06] bg-white p-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.18)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8276]">OD Privilege Partner</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1813]">Business Login</h1>
        <p className="mt-2 text-sm text-[#6d6658]">Manage your shop, loyalty cards, and OD verification QR.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className={labelCls}>Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
              type="email"
              autoComplete="email"
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className={labelCls}>Password</label>
              <Link
                to={`/forgot-password?next=${encodeURIComponent("/od/vendor/login")}`}
                className="text-[11px] text-[#6e6e73] underline-offset-2 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          {error && (
            <div className="rounded-[1.2rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={isDisabled}
            className="h-14 w-full rounded-[1.2rem] bg-[#1b1813] text-base font-semibold text-white hover:bg-[#11100d] disabled:opacity-60"
          >
            {busy ? "Signing in…" : (
              <>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-[#6d6658]">
          New business?{" "}
          <Link className="font-semibold text-[#1b1813] underline-offset-2 hover:underline" to="/odp/signup">
            Create account
          </Link>
        </p>
        <p hidden className="mt-4 text-center text-sm text-[#8a8276]">
          <Link className="font-medium text-[#1b1813] underline-offset-2 hover:underline" to="/od/login">
            OD home
          </Link>
          {" · "}
          <Link className="font-medium text-[#1b1813] underline-offset-2 hover:underline" to="/login">
            Classic business login
          </Link>
        </p>
      </div>
    </div>
  );
};
