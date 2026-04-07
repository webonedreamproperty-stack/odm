import React, { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Eye, EyeOff, Printer } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "../AuthProvider";
import type { AuthResult } from "../AuthProvider";
import { OD_BUSINESS_CATEGORIES } from "../../lib/odBusinessCategories";
import { allocatePartnerSlug, defaultBusinessNameFromEmail } from "../../lib/odPartnerSignup";
import { buildOdVerifyUrl } from "../../lib/links";
import { printOdVerifySheet } from "../../lib/printOdVerifySheet";
import { cn } from "../../lib/utils";

const inputCls =
  "h-12 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";
const labelCls =
  "block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#777062]";

export const OdVendorSignupPage: React.FC = () => {
  const odVerifyQrRef = useRef<HTMLDivElement>(null);
  const { currentUser, currentMember, accountKind, loading, signup, isSlugAvailable } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [showQrSuccess, setShowQrSuccess] = useState(false);
  /** When Supabase returns ok but no session, user must confirm email before QR/dashboard. */
  const [pendingEmailConfirm, setPendingEmailConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!loading && currentUser && accountKind === "vendor" && !showQrSuccess) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!loading && currentMember && accountKind === "member") {
    return <Navigate to="/od/account" replace />;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      const slug = await allocatePartnerSlug(email, isSlugAvailable);
      const businessName = defaultBusinessNameFromEmail(email);
      const category = OD_BUSINESS_CATEGORIES[0];
      const result = (await signup({
        businessName,
        email,
        password,
        slug,
        odBusinessCategory: category,
        odDiscountKind: "percent",
        odDiscountValue: 10,
        emailRedirectTo: "/od/vendor/login",
      })) as AuthResult;
      if (!result.ok) {
        setError("error" in result ? result.error : "Could not create account.");
        setBusy(false);
        return;
      }
      setSuccessSlug(slug);
      setShowQrSuccess(true);
      const needsConfirm = Boolean(result.message);
      setPendingEmailConfirm(needsConfirm);
      if (result.message) {
        setMessage(result.message);
      } else {
        setMessage("Welcome! Your shop is set up for OD.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to sign up right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const verifyUrl = successSlug ? buildOdVerifyUrl(successSlug) : "";

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#f5f3ef] px-6 py-12">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-black/[0.06] bg-white p-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.18)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8276]">OD Partner</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1813]">Register</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6d6658]">
          Enter your email and password. You can add your shop name, link, and offers in Settings after you sign in.
        </p>

        {successSlug && showQrSuccess ? (
          <div className="mt-8 space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 px-4 py-3 text-sm text-emerald-900">
              {pendingEmailConfirm
                ? message
                : message ||
                  "You’re signed in. Print or share the QR below — members open it to show green/red OD status."}
            </div>
            {!pendingEmailConfirm && (
              <>
                <div className="flex flex-col items-center gap-4 rounded-2xl border border-black/[0.08] bg-[#fafbfa] p-6">
                  <div ref={odVerifyQrRef}>
                    <QRCode value={verifyUrl} size={200} />
                  </div>
                  <p className="text-center font-mono text-[11px] text-[#6d6658] break-all">{verifyUrl}</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => navigator.clipboard.writeText(verifyUrl)}
                    >
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full bg-[#1b1813]"
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
                <Button type="button" className="h-12 w-full rounded-full bg-[#1b1813]" asChild>
                  <Link to="/dashboard">Go to dashboard</Link>
                </Button>
                <p className="text-center text-sm text-[#8a8276]">
                  You can change your offer anytime in Settings → OD member directory.
                </p>
              </>
            )}
            {pendingEmailConfirm && (
              <Button type="button" className="h-12 w-full rounded-full bg-[#1b1813]" asChild>
                <Link to="/od/vendor/login">Go to vendor sign-in</Link>
              </Button>
            )}
          </div>
        ) : (
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
            {message && !successSlug && (
              <div className="rounded-[1.2rem] border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-800">
                {message}
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="h-14 w-full rounded-[1.2rem] bg-[#1b1813] text-base font-semibold text-white hover:bg-[#11100d] disabled:opacity-60"
            >
              {busy ? "Creating…" : (
                <>
                  Create account <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {!successSlug && (
          <div className="mt-8 space-y-3 text-center text-sm text-[#6d6658]">
            <p>
              Already have a partner account?{" "}
              <Link className="font-semibold text-[#1b1813] underline-offset-2 hover:underline" to="/od/vendor/login">
                Business Login
              </Link>
            </p>
            <p hidden>
              OD member (not a shop)?{" "}
              <Link className="font-semibold text-[#1b1813] underline-offset-2 hover:underline" to="/od/member/signup">
                Member sign up
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
