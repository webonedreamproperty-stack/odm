import React, { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Building2, Eye, EyeOff, Printer, User } from "lucide-react";
import QRCode from "react-qr-code";
import { AuthSplitLayout } from "./AuthSplitLayout";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useAuth } from "./AuthProvider";
import type { AuthResult } from "./AuthProvider";
import { trackEvent } from "../lib/analytics";
import { OD_BUSINESS_CATEGORIES } from "../lib/odBusinessCategories";
import { allocatePartnerSlug, defaultBusinessNameFromEmail } from "../lib/odPartnerSignup";
import { buildOdVerifyUrl } from "../lib/links";
import { printOdVerifySheet } from "../lib/printOdVerifySheet";
import { cn } from "../lib/utils";

const inputCls =
  "h-14 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";
const labelCls =
  "block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#777062]";

type SignupMode = "partner" | "member";

export const SignupPage: React.FC = () => {
  const odVerifyQrRef = useRef<HTMLDivElement>(null);
  const { currentUser, currentMember, accountKind, loading, signup, isSlugAvailable, memberSignup } = useAuth();

  const [signupMode, setSignupMode] = useState<SignupMode>("partner");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [showPartnerSuccess, setShowPartnerSuccess] = useState(false);
  const [pendingEmailConfirm, setPendingEmailConfirm] = useState(false);

  const withTimeout = async <T,>(promise: Promise<T>, ms = 15000): Promise<T> =>
    new Promise<T>((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        reject(new Error("Signup timed out. Please try again."));
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

  if (!loading && currentMember && accountKind === "member") {
    return <Navigate to="/od/account" replace />;
  }
  if (!loading && currentUser && accountKind === "vendor" && !showPartnerSuccess) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!loading && currentUser && !currentMember && accountKind !== "vendor") {
    return <Navigate to={currentUser.role === "staff" ? "/issued-cards" : "/dashboard"} replace />;
  }

  const handleMemberSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    trackEvent("Signup Submitted", { mode: "member" });
    try {
      const result: AuthResult = await withTimeout(memberSignup({ email, password }));
      if (result.ok === false) {
        setError(result.error);
        return;
      }
      trackEvent("Signup Success", { mode: "member" });
      if (result.message) {
        setInfo(result.message);
      } else {
        setInfo("Account created. You can sign in now.");
      }
    } catch {
      setError("Unable to sign up right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handlePartnerSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setInfo("");
    setBusy(true);
    trackEvent("Signup Submitted", { mode: "partner" });
    try {
      const slug = await allocatePartnerSlug(email, isSlugAvailable);
      const businessName = defaultBusinessNameFromEmail(email);
      const category = OD_BUSINESS_CATEGORIES[0];
      const result: AuthResult = await withTimeout(
        signup({
          businessName,
          email,
          password,
          slug,
          odBusinessCategory: category,
          odDiscountKind: "percent",
          odDiscountValue: 10,
          emailRedirectTo: "/od/vendor/login",
        })
      );
      if (result.ok === false) {
        setError(result.error);
        return;
      }
      trackEvent("Signup Success", { mode: "partner", slug });
      setSuccessSlug(slug);
      setShowPartnerSuccess(true);
      const needsConfirm = Boolean(result.message);
      setPendingEmailConfirm(needsConfirm);
      if (result.message) {
        setInfo(result.message);
      } else {
        setInfo("Welcome! Your shop is set up for OD.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign up right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyUrl = successSlug ? buildOdVerifyUrl(successSlug) : "";

  const layoutTitle =
    signupMode === "partner" ? "Create your partner account" : "Create your member account";
  const layoutSubtitle =
    signupMode === "partner"
      ? "Register your shop on OD — email and password only. You can refine your offer and profile in Settings after sign in."
      : "Join OD membership with one account for participating shops. Subscription is activated by your OD admin after payment.";

  const isSubmitting = busy;
  const isDisabled = busy || loading;

  return (
    <AuthSplitLayout title={layoutTitle} subtitle={layoutSubtitle} badge="Get started" mode="signup">
      <div className="space-y-5">
        {!(successSlug && showPartnerSuccess) && (
          <>
            <div className="flex gap-2 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] p-1.5">
              <button
                type="button"
                onClick={() => {
                  setSignupMode("partner");
                  setError("");
                  setInfo("");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
                  signupMode === "partner"
                    ? "bg-[#1b1813] text-white shadow-sm"
                    : "text-[#6d6658] hover:bg-black/[0.04]"
                )}
              >
                <Building2 className="h-4 w-4 shrink-0" aria-hidden />
                Partner
              </button>
              <button
                type="button"
                onClick={() => {
                  setSignupMode("member");
                  setError("");
                  setInfo("");
                }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors",
                  signupMode === "member"
                    ? "bg-[#1b1813] text-white shadow-sm"
                    : "text-[#6d6658] hover:bg-black/[0.04]"
                )}
              >
                <User className="h-4 w-4 shrink-0" aria-hidden />
                Member
              </button>
            </div>

            <p className="text-sm leading-6 text-[#6d6658]">
              {signupMode === "partner" ? (
                <>For business owners joining the OD partner network.</>
              ) : (
                <>For customers joining as OD members (not a shop dashboard account).</>
              )}
            </p>
          </>
        )}

        {signupMode === "member" ? (
          <form className="space-y-5" onSubmit={handleMemberSubmit}>
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
                  placeholder="At least 6 characters"
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
            {info && (
              <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800">
                {info}
              </div>
            )}
            <Button
              type="submit"
              disabled={isDisabled}
              className="h-14 w-full rounded-[1.2rem] bg-[#1b1813] text-base font-semibold text-white shadow-none hover:bg-[#11100d] disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : (
                <>
                  Create account <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        ) : successSlug && showPartnerSuccess ? (
          <div className="space-y-6">
            <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
              {pendingEmailConfirm
                ? info
                : info ||
                  "You’re signed in. Print or share the QR below — members open it to show green/red OD status."}
            </div>
            {!pendingEmailConfirm && (
              <>
                <div className="flex flex-col items-center gap-4 rounded-[1.35rem] border border-black/[0.08] bg-[#fafbfa] p-6">
                  <div ref={odVerifyQrRef}>
                    <QRCode value={verifyUrl} size={200} />
                  </div>
                  <p className="text-center font-mono text-[11px] text-[#6d6658] break-all">{verifyUrl}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-[1rem]"
                      onClick={() => void navigator.clipboard.writeText(verifyUrl)}
                    >
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      className="rounded-[1rem] bg-[#1b1813]"
                      onClick={() =>
                        printOdVerifySheet({
                          verifyUrl,
                          qrSvgOuterHTML: odVerifyQrRef.current?.querySelector("svg")?.outerHTML,
                        })
                      }
                    >
                      <Printer className="mr-2 h-4 w-4" />
                      Print QR
                    </Button>
                  </div>
                </div>
                <Button type="button" className="h-14 w-full rounded-[1.2rem] bg-[#1b1813]" asChild>
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
                <p className="text-center text-sm text-[#8a8276]">
                  You can change your offer anytime in Settings → OD member directory.
                </p>
              </>
            )}
            {pendingEmailConfirm && (
              <Button type="button" className="h-14 w-full rounded-[1.2rem] bg-[#1b1813]" asChild>
                <Link to="/od/vendor/login">Go to vendor sign-in</Link>
              </Button>
            )}
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handlePartnerSubmit}>
            <div className="space-y-1.5">
              <label className={labelCls}>Email</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@shop.com"
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
            {info && !successSlug && (
              <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800">
                {info}
              </div>
            )}
            <Button
              type="submit"
              disabled={isDisabled}
              className="h-14 w-full rounded-[1.2rem] bg-[#1b1813] text-base font-semibold text-white shadow-none hover:bg-[#11100d] disabled:opacity-60"
            >
              {isSubmitting ? "Creating…" : (
                <>
                  Create partner account <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {loading && !busy && (
          <p className="text-center text-xs text-[#777062]">Checking existing session...</p>
        )}

        <p className="text-center text-sm text-[#6d6658]">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-[#171512] underline-offset-2 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AuthSplitLayout>
  );
};
