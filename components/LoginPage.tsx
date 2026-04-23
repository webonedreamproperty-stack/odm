import React, { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { ArrowRight, Building2, Eye, EyeOff, User } from "lucide-react";
import { AuthSplitLayout } from "./AuthSplitLayout";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "./AuthProvider";
import type { AuthResult } from "./AuthProvider";
import { trackEvent } from "../lib/analytics";
import { DEMO_WORKSPACE_ENABLED } from "../lib/siteConfig";
import { cn } from "../lib/utils";

const inputCls =
  "h-14 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";
const labelCls = "block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#777062]";

type LoginMode = "business" | "member";

export const LoginPage: React.FC = () => {
  const { currentUser, currentMember, accountKind, loading, login, loginDemo, memberLogin } = useAuth();
  const [loginMode, setLoginMode] = useState<LoginMode>("business");
  const location = useLocation();
  const fromPath = (location.state as { from?: { pathname?: string } })?.from?.pathname;
  const showDemoWorkspace = DEMO_WORKSPACE_ENABLED && new URLSearchParams(location.search).get("admin") === "pogi";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const withTimeout = async <T,>(promise: Promise<T>, ms = 15000): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error("Sign in timed out. Please try again."));
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

  // Once auth state is resolved and user is logged in, redirect
  if (!loading && currentMember && accountKind === "member") {
    return <Navigate to="/od/account" replace />;
  }
  if (!loading && currentUser) {
    return <Navigate to={fromPath ?? (currentUser.role === "staff" ? "/issued-cards" : "/dashboard")} replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (loginMode === "member") {
        const result: AuthResult = await withTimeout(memberLogin(email, password));
        if (result.ok === false) {
          setError(result.error);
        } else {
          trackEvent("Login Success", { role: "member" });
        }
      } else {
        const result: AuthResult = await withTimeout(login(email, password));
        if (result.ok === false) {
          setError(result.error);
        } else {
          trackEvent("Login Success", { role: result.user?.role ?? "owner" });
        }
      }
    } catch {
      setError("Unable to sign in right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async () => {
    setBusy(true);
    setError("");
    try {
      await withTimeout(loginDemo());
    } catch {
      setError("Unable to sign in to demo right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const isSubmitting = busy;
  const isDisabled = busy || loading;

  const layoutTitle = loginMode === "business" ? "Welcome back" : "Member Login";
  const layoutSubtitle =
    loginMode === "business"
      ? "Login to set up business settings, and let all OD Gold members regularly come to your shop to boost sales."
      : "Login to view your OD Gold Membership, participating shops, and member benefits.";

  return (
    <AuthSplitLayout title={layoutTitle} subtitle={layoutSubtitle} badge="Login" mode="login">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div className="flex gap-2 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] p-1.5">
          <button
            type="button"
            onClick={() => {
              setLoginMode("business");
              setError("");
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
              loginMode === "business"
                ? "bg-[#1b1813] text-white shadow-sm"
                : "text-[#6d6658] hover:bg-black/[0.04]"
            )}
          >
            <Building2 className="h-4 w-4 shrink-0" aria-hidden />
            OD Privilege Partner
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode("member");
              setError("");
            }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
              loginMode === "member"
                ? "bg-[#1b1813] text-white shadow-sm"
                : "text-[#6d6658] hover:bg-black/[0.04]"
            )}
          >
            <User className="h-4 w-4 shrink-0" aria-hidden />
            OD Gold Member
          </button>
        </div>

        <p className="text-sm leading-6 text-[#6d6658]">
          {loginMode === "business" ? (
            <>
              For shop owners and staff. Staff should use their dedicated portal link and PIN from the business.
              <p className="text-sm text-[#6d6658] mt-2">
                New OD Privilege Partner?{" "}
                <Link to="/odp/signup" className="font-semibold text-[#1b1813] underline hover:underline">
                  Register as OD Privilege Partner
                </Link>
              </p>

            </>
          ) : (
            <>Use the email and password for your OD Gold membership (not your business dashboard login).</>
          )}
        </p>
        {loginMode === "member" && (
          <p className="text-sm text-[#6d6658]">
            New OD Gold member?{" "}
            <Link to="/od/member/signup" className="font-semibold text-[#1b1813] underline hover:underline">
              Register as OD Gold Member
            </Link>
          </p>
        )}

        <div className="space-y-1.5">
          <label className={labelCls}>Email</label>
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@mail.com"
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
              to="/forgot-password"
              className="text-[11px] text-[#6e6e73] underline-offset-2 hover:underline hover:text-[#1d1d1f]"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={`${inputCls} pr-12`}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute inset-y-0 right-3 inline-flex items-center text-[#6e6e73] hover:text-[#1d1d1f]"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
            </button>
          </div>
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
          {isSubmitting ? "Signing in..." : <>Continue <ArrowRight className="ml-2 h-4 w-4" /></>}
        </Button>
        {loading && !busy && (
          <p className="text-center text-xs text-[#777062]">Checking existing session...</p>
        )}

        {showDemoWorkspace && loginMode === "business" && (
          <>
            <div className="relative py-1">
              <div className="border-t border-black/[0.08]" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777062]">
                or
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={isDisabled}
              className="h-14 w-full rounded-[1.2rem] border-black/[0.08] bg-white text-base font-semibold text-[#171512] shadow-none hover:bg-[#f8f5ef]"
              onClick={handleDemo}
            >
              Try Demo Workspace
            </Button>
          </>
        )}
      </form>
    </AuthSplitLayout>
  );
};
