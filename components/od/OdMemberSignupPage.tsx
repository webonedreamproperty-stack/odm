import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "../AuthProvider";
import type { AuthResult } from "../AuthProvider";

const inputCls =
  "h-14 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";
const labelCls =
  "block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#777062]";

export const OdMemberSignupPage: React.FC = () => {
  const { currentMember, loading, memberSignup, accountKind } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  if (!loading && currentMember && accountKind === "member") {
    return <Navigate to="/od/account" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const result = await memberSignup({ displayName, email, password }) as AuthResult;
      if (!result.ok) {
        setError(result.error);
      } else if (result.message) {
        setMessage(result.message);
      } else {
        setMessage("Account created. You can sign in now.");
      }
    } catch {
      setError("Unable to sign up right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ef] px-6 py-12">
      <div className="w-full max-w-md rounded-[1.75rem] border border-black/[0.06] bg-white p-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.18)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8276]">OD membership</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1813]">Member sign up</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6d6658]">
          Malaysia · One account for participating shops. Subscription is activated by your OD admin after payment.
        </p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className={labelCls}>Display name</label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className={inputCls}
              autoComplete="name"
              required
            />
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
            <label className={labelCls}>Password</label>
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
              type="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>
          {error && (
            <div className="rounded-[1.2rem] border border-red-200 bg-red-50/90 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}
          {message && (
            <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800">
              {message}
            </div>
          )}
          <Button
            type="submit"
            disabled={busy || loading}
            className="h-14 w-full rounded-[1.2rem] bg-[#1b1813] text-base font-semibold text-white shadow-none hover:bg-[#11100d] disabled:opacity-60"
          >
            {busy ? "Creating…" : (
              <>
                Create account <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <p className="mt-8 text-center text-sm text-[#6d6658]">
          Already have an account?{" "}
          <Link className="font-semibold text-[#1b1813] underline-offset-2 hover:underline" to="/od/member/login">
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-center text-sm text-[#8a8276]">
          <Link className="font-medium text-[#1b1813] underline-offset-2 hover:underline" to="/login">
            Business sign in
          </Link>
        </p>
      </div>
    </div>
  );
};
