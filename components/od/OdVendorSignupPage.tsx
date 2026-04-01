import React, { useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, Printer } from "lucide-react";
import QRCode from "react-qr-code";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useAuth } from "../AuthProvider";
import type { AuthResult } from "../AuthProvider";
import { getSlugHint, isSlugValid, normalizeSlug } from "../../lib/slug";
import { OD_BUSINESS_CATEGORIES } from "../../lib/odBusinessCategories";
import { buildOdVerifyUrl } from "../../lib/links";
import { printOdVerifySheet } from "../../lib/printOdVerifySheet";

const inputCls =
  "h-12 rounded-[1.2rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";
const labelCls =
  "block text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-[#777062]";

export const OdVendorSignupPage: React.FC = () => {
  const odVerifyQrRef = useRef<HTMLDivElement>(null);
  const { currentUser, currentMember, accountKind, loading, signup, isSlugAvailable } = useAuth();

  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [slugInput, setSlugInput] = useState("");
  const [category, setCategory] = useState<string>(OD_BUSINESS_CATEGORIES[0]);
  const [discountKind, setDiscountKind] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState("10");

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [slugCheck, setSlugCheck] = useState<"idle" | "checking" | "ok" | "taken">("idle");

  const [successSlug, setSuccessSlug] = useState<string | null>(null);
  const [showQrSuccess, setShowQrSuccess] = useState(false);
  /** When Supabase returns ok but no session, user must confirm email before QR/dashboard. */
  const [pendingEmailConfirm, setPendingEmailConfirm] = useState(false);

  const normalizedSlug = normalizeSlug(slugInput);

  if (!loading && currentUser && accountKind === "vendor" && !showQrSuccess) {
    return <Navigate to="/dashboard" replace />;
  }
  if (!loading && currentMember && accountKind === "member") {
    return <Navigate to="/od/account" replace />;
  }

  const validateDiscount = (): string | null => {
    const v = Number.parseFloat(discountValue);
    if (Number.isNaN(v) || v <= 0) return "Enter a valid discount amount.";
    if (discountKind === "percent" && (v < 1 || v > 100)) return "Percent must be between 1 and 100.";
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!isSlugValid(normalizedSlug)) {
      setError("Fix your shop link (slug) before continuing.");
      return;
    }
    const dErr = validateDiscount();
    if (dErr) {
      setError(dErr);
      return;
    }
    setBusy(true);
    try {
      const available = await isSlugAvailable(normalizedSlug);
      if (!available) {
        setError("This shop link is already taken. Choose another.");
        setBusy(false);
        return;
      }
      const result = (await signup({
        businessName,
        email,
        password,
        slug: normalizedSlug,
        odBusinessCategory: category,
        odDiscountKind: discountKind,
        odDiscountValue: Number.parseFloat(discountValue),
        emailRedirectTo: "/od/vendor/login",
      })) as AuthResult;
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      setSuccessSlug(normalizedSlug);
      setShowQrSuccess(true);
      const needsConfirm = Boolean(result.message);
      setPendingEmailConfirm(needsConfirm);
      if (result.message) {
        setMessage(result.message);
      } else {
        setMessage("Welcome! Your shop is set up for OD.");
      }
    } catch {
      setError("Unable to sign up right now. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  React.useEffect(() => {
    if (!normalizedSlug || !isSlugValid(normalizedSlug)) {
      setSlugCheck("idle");
      return;
    }
    let cancelled = false;
    setSlugCheck("checking");
    const t = window.setTimeout(() => {
      void (async () => {
        try {
          const ok = await isSlugAvailable(normalizedSlug);
          if (cancelled) return;
          setSlugCheck(ok ? "ok" : "taken");
        } catch {
          if (!cancelled) setSlugCheck("idle");
        }
      })();
    }, 400);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [normalizedSlug, isSlugAvailable]);

  const verifyUrl = successSlug ? buildOdVerifyUrl(successSlug) : "";

  return (
    <div className="min-h-screen flex flex-col items-center bg-[#f5f3ef] px-6 py-12">
      <div className="w-full max-w-lg rounded-[1.75rem] border border-black/[0.06] bg-white p-8 shadow-[0_24px_80px_-32px_rgba(0,0,0,0.18)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8a8276]">OD vendor</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#1b1813]">Register your business</h1>
        <p className="mt-2 text-sm leading-relaxed text-[#6d6658]">
          Set your OD discount, category (same groups as Stampee templates), and get a QR for members to scan at your
          counter.
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
              <label className={labelCls}>Business name</label>
              <Input
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className={inputCls}
                placeholder="My Café"
                required
              />
            </div>
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
            <div className="space-y-1.5">
              <label className={labelCls}>Shop link (slug)</label>
              <Input
                value={slugInput}
                onChange={(e) => setSlugInput(e.target.value)}
                className={inputCls}
                placeholder="my-cafe"
                autoComplete="off"
                required
              />
              <p className="text-xs text-[#8a8276]">{getSlugHint(normalizedSlug)}</p>
              {slugCheck === "checking" && <p className="text-xs text-[#8a8276]">Checking availability…</p>}
              {slugCheck === "ok" && <p className="text-xs text-emerald-700">This link is available.</p>}
              {slugCheck === "taken" && <p className="text-xs text-red-600">This link is already taken.</p>}
            </div>

            <div className="space-y-1.5">
              <label className={labelCls}>What you do</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`${inputCls} h-12 appearance-none bg-[#f4f1ea]`}
                required
              >
                {OD_BUSINESS_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <p className="text-xs text-[#8a8276]">Same categories as Stampee gallery (F&amp;B, retail, etc.).</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-black/[0.06] bg-[#faf9f6] p-4">
              <p className={labelCls}>OD discount for members</p>
              <div className="flex gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dk"
                    checked={discountKind === "percent"}
                    onChange={() => setDiscountKind("percent")}
                  />
                  Percent (%)
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="dk"
                    checked={discountKind === "fixed"}
                    onChange={() => setDiscountKind("fixed")}
                  />
                  Amount (RM)
                </label>
              </div>
              <Input
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className={inputCls}
                type="number"
                min="0.01"
                step={discountKind === "percent" ? "1" : "0.01"}
                placeholder={discountKind === "percent" ? "10" : "5.00"}
                required
              />
              <p className="text-xs text-[#6d6658]">
                {discountKind === "percent"
                  ? "Example: 10 means 10% off the bill for active OD members."
                  : "Example: 5 means RM5 off (manual at POS)."}
              </p>
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
              disabled={busy || slugCheck === "taken" || !isSlugValid(normalizedSlug)}
              className="h-14 w-full rounded-[1.2rem] bg-[#1b1813] text-base font-semibold text-white hover:bg-[#11100d] disabled:opacity-60"
            >
              {busy ? "Creating…" : (
                <>
                  Create business account <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {!successSlug && (
          <p className="mt-8 text-center text-sm text-[#6d6658]">
            OD member (not a shop)?{" "}
            <Link className="font-semibold text-[#1b1813] underline-offset-2 hover:underline" to="/od/member/signup">
              Member sign up
            </Link>
          </p>
        )}
      </div>
    </div>
  );
};
