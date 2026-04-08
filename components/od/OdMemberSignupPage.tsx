import React, { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "../AuthProvider";
import type { AuthResult } from "../AuthProvider";
import { cn } from "../../lib/utils";

const inputCls =
  "h-14 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";
const labelCls =
  "block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#777062]";

export const OdMemberSignupPage: React.FC = () => {
  const { currentMember, loading, memberSignup, accountKind } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      const result: AuthResult = await memberSignup({ email, password });
      if (result.ok === false) {
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8276]">OD Membership</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1813]">Member sign up</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6d6658]">
          Malaysia · One account for participating shops. Subscription is activated by your OD admin after payment.
        </p>

        {/* // make background light red  and text red-600 add padding 10px border rounded-md*/}
        <div className="mt-2 text-sm leading-relaxed bg-[#ffcccc] py-2 px-4 border rounded-md">
          <p className="mt-2 text-sm leading-relaxed text-[red]">
            Website ini adalah untuk kegunaan Member dibawah OD Network sahaja. ahli selain OD Network tidak dibenarkan berdaftar. Jika pihak admin dapat mengesan ahli selain OD Network, akaun anda akan dipadam dan tiada sebarang pulangan bayaran.
          </p>
        </div>

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
            <label className={labelCls}>Password</label>
            <div className="relative">
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(inputCls, "pr-12")}
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                minLength={6}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-[#777062] transition-colors hover:bg-black/[0.06] hover:text-[#171512] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1b1813]/25"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4 shrink-0" aria-hidden /> : <Eye className="h-4 w-4 shrink-0" aria-hidden />}
              </button>
            </div>
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
          <Link className="font-semibold text-[#1b1813] underline-offset-2 hover:underline" to="/login">
            Login
          </Link>
        </p>
        <p hidden className="mt-4 text-center text-sm text-[#8a8276]">
          <Link className="font-medium text-[#1b1813] underline-offset-2 hover:underline" to="/login">
            Business Login
          </Link>
        </p>
      </div>
    </div >
  );
};
