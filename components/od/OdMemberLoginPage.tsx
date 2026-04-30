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

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <path
      d="M21.35 11.1H12v2.98h5.33c-.23 1.52-1.14 2.8-2.43 3.65v2.42h3.93c2.3-2.12 3.63-5.25 3.63-8.98 0-.67-.06-1.31-.11-1.95Z"
      fill="#4285F4"
    />
    <path
      d="M12 22c2.7 0 4.96-.9 6.61-2.45l-3.93-2.42c-1.09.73-2.48 1.15-4.02 1.15-3.09 0-5.71-2.09-6.64-4.91H0v2.5A10 10 0 0 0 12 22Z"
      fill="#34A853"
    />
    <path
      d="M4.02 13.37A5.98 5.98 0 0 1 3.65 11c0-.82.14-1.61.37-2.37v-2.5H0A10 10 0 0 0 0 16l4.02-2.63Z"
      fill="#FBBC05"
    />
    <path
      d="M12 3.72c1.47 0 2.8.51 3.84 1.52l2.88-2.88C16.96.72 14.7 0 12 0A10 10 0 0 0 0 6.13l4.02 2.5c.93-2.82 3.55-4.91 6.64-4.91Z"
      fill="#EA4335"
    />
  </svg>
);

export const OdMemberLoginPage: React.FC = () => {
  const { currentMember, loading, memberLogin, memberLoginWithGoogle, accountKind } = useAuth();
  const [searchParams] = useSearchParams();
  const nextPath = searchParams.get("next") || "/od/account";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  if (!loading && currentMember && accountKind === "member") {
    return <Navigate to={nextPath} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await memberLogin(email, password) as AuthResult;
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
  const isGoogleDisabled = googleBusy || busy || loading;

  const handleGoogleSignIn = async () => {
    setError("");
    setGoogleBusy(true);
    try {
      const result = await memberLoginWithGoogle(nextPath);
      if (result.ok === false) {
        setError(result.error);
      }
    } catch {
      setError("Unable to continue with Google right now. Please try again.");
    } finally {
      setGoogleBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ef] px-6 py-12">
      <div className="w-full max-w-md rounded-[1.75rem] border border-black/[0.06] bg-white p-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.18)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8276]">OD Gold Membership</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1813]">Member sign in</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6d6658]">
          Use your OD Gold member account to verify discounts at participating shops.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <Button
            type="button"
            variant="outline"
            disabled={isGoogleDisabled}
            onClick={() => void handleGoogleSignIn()}
            className="h-14 w-full rounded-[1.2rem] border border-black/[0.1] bg-white text-base font-semibold text-[#1b1813] hover:bg-[#faf8f3] disabled:opacity-60"
          >
            {googleBusy ? "Connecting to Google…" : (
              <>
                <GoogleIcon className="mr-2 h-4 w-4 shrink-0" />
                Continue with Google
              </>
            )}
          </Button>

          <div className="relative py-0.5">
            <div className="border-t border-black/[0.08]" />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777062]">
              or sign in with email
            </span>
          </div>

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
