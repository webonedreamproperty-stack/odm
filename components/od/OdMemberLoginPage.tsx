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

export const OdMemberLoginPage: React.FC = () => {
  const { currentMember, loading, memberLogin, accountKind } = useAuth();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") || "/od/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && currentMember && accountKind === "member") {
    return <Navigate to={nextPath} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await memberLogin(email, password) as AuthResult;
      if (!result.ok) {
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8276]">OD Gold Membership</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1813]">Member sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6d6658]">
          Use your OD Gold member account to verify discounts at participating shops.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className={labelCls}>Email</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
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
                to="/forgot-password?next=%2Fod%2Flogin"
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
            className="h-14 w-full rounded-[1.2rem] bg-[#1b1813] text-base font-semibold text-white shadow-none hover:bg-[#11100d] disabled:opacity-60"
          >
            {busy ? "Signing in…" : (
              <>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p hidden className="mt-8 text-center text-sm text-[#6d6658]">
          New OD Gold member?{" "}
          <Link className="font-semibold text-[#1b1813] underline-offset-2 hover:underline" to="/od/member/signup">
            Create an account
          </Link>
        </p>
        <p hidden className="mt-4 text-center text-sm text-[#8a8276]">
          Business owner?{" "}
          <Link hidden className="font-medium text-[#1b1813] underline-offset-2 hover:underline" to="/login">
            Business Login
          </Link>
        </p>
      </div>
    </div>
  );
};
