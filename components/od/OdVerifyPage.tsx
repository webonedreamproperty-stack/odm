import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Lock,
  Mail,
  XCircle,
} from "lucide-react";
import { useAuth } from "../AuthProvider";
import { fetchMemberProfile, getOdMemberShopVerification } from "../../lib/db/members";
import { fetchProfile } from "../../lib/db/profiles";
import { isMalaysiaSixtyMsisdn, smartNormalizeMalaysiaPhoneInput } from "../../lib/memberPhoneDigits";
import { sendVerifyShopPhoneTac, verifyShopPhoneAndToken } from "../../lib/odVerifyShopLoginApi";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { memberAuthNoticeClassName } from "../../lib/memberOAuthUi";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const inputCls =
  "h-12 rounded-[1rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";

const VENDOR_BUSINESS_LOGIN =
  "This is a business account. Sign in from the business login page instead.";

export const OdVerifyPage: React.FC = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { currentMember, loading, accountKind, memberLogin, refreshMemberProfile } = useAuth();
  const [result, setResult] = useState<{
    qualified: boolean;
    memberCode: string;
    shopName: string;
    validUntil: string | null;
    membershipStatus: string;
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [verifyPhone, setVerifyPhone] = useState("");
  const [verifyOtpStep, setVerifyOtpStep] = useState<"phone" | "code">("phone");
  const [otpCells, setOtpCells] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [verifyBusy, setVerifyBusy] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState("");
  const [sessionChecked, setSessionChecked] = useState(false);
  const [needsRelogin, setNeedsRelogin] = useState(false);
  /** SSO-style: pick a method, then show a focused detail view with back. */
  const [signInView, setSignInView] = useState<"pick" | "whatsapp" | "email">("pick");

  const isLoginDisabled = loading || !sessionChecked || loginBusy || verifyBusy;
  const phoneLooksValid = isMalaysiaSixtyMsisdn(verifyPhone);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    if (loading) return;
    let active = true;
    void (async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      const hasSession = Boolean(data.session?.user);
      setNeedsRelogin(hasSession && (!currentMember || accountKind !== "member"));
      setSessionChecked(true);
    })();
    return () => {
      active = false;
    };
  }, [currentMember, accountKind, loading]);

  const handleMemberEmailLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoginBusy(true);
    try {
      const result = await memberLogin(email, password);
      if (result.ok === false) {
        setLoginError(result.error);
      }
    } catch {
      setLoginError("Unable to sign in right now. Please try again.");
    } finally {
      setLoginBusy(false);
    }
  };

  const handleSendVerifyShopTac = async () => {
    setLoginError("");
    setVerifyMsg("");
    if (!isMalaysiaSixtyMsisdn(verifyPhone)) {
      setLoginError("Enter a Malaysia number starting with 60 (e.g. 60123456789 or 0123456789).");
      return;
    }
    setVerifyBusy(true);
    const out = await sendVerifyShopPhoneTac(verifyPhone);
    setVerifyBusy(false);
    if (out.ok === false) {
      setLoginError(out.error);
      return;
    }
    setOtpCells(["", "", "", "", "", ""]);
    setVerifyOtpStep("code");
    setVerifyMsg("Check WhatsApp for your code.");
    window.setTimeout(() => setVerifyMsg(""), 6000);
  };

  const handleChangeVerifyNumber = () => {
    setVerifyOtpStep("phone");
    setOtpCells(["", "", "", "", "", ""]);
    setVerifyMsg("");
    setLoginError("");
  };

  const openWhatsappSignIn = () => {
    setSignInView("whatsapp");
    setVerifyOtpStep("phone");
    setLoginError("");
    setVerifyMsg("");
  };

  const openEmailSignIn = () => {
    setSignInView("email");
    setLoginError("");
  };

  const handleSignInBack = () => {
    if (signInView === "email") {
      setSignInView("pick");
      return;
    }
    if (signInView === "whatsapp") {
      if (verifyOtpStep === "code") {
        handleChangeVerifyNumber();
        return;
      }
      setSignInView("pick");
      setVerifyPhone("");
      setVerifyOtpStep("phone");
      setOtpCells(["", "", "", "", "", ""]);
      setVerifyMsg("");
      setLoginError("");
    }
  };

  useEffect(() => {
    if (verifyOtpStep !== "code") return;
    const id = window.setTimeout(() => otpRefs.current[0]?.focus(), 80);
    return () => window.clearTimeout(id);
  }, [verifyOtpStep]);

  const handleVerifyShopSignIn = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setVerifyMsg("");
    if (!isMalaysiaSixtyMsisdn(verifyPhone)) {
      setLoginError("Enter a Malaysia number starting with 60.");
      return;
    }
    const tacJoined = otpCells.join("");
    if (tacJoined.length !== 6) {
      setLoginError("Enter the 6-digit code from WhatsApp.");
      return;
    }
    setVerifyBusy(true);
    try {
      const tokenOut = await verifyShopPhoneAndToken(verifyPhone, tacJoined);
      if (tokenOut.ok === false) {
        setLoginError(tokenOut.error);
        return;
      }

      const { data: otpData, error: otpErr } = await supabase.auth.verifyOtp({
        type: "magiclink",
        token_hash: tokenOut.token_hash,
      });

      if (otpErr || !otpData.session?.user) {
        setLoginError(otpErr?.message || "Could not sign in. Try again.");
        return;
      }

      const userId = otpData.session.user.id;
      const vendorProfile = await fetchProfile(userId);
      if (vendorProfile) {
        await supabase.auth.signOut();
        setLoginError(VENDOR_BUSINESS_LOGIN);
        return;
      }

      let member = await fetchMemberProfile(userId);
      for (let attempt = 0; attempt < 5 && !member; attempt += 1) {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 200);
        });
        member = await fetchMemberProfile(userId);
      }

      if (!member) {
        await supabase.auth.signOut();
        setLoginError("This account is not registered as an OD Gold member.");
        return;
      }

      setOtpCells(["", "", "", "", "", ""]);
      setVerifyOtpStep("phone");
      await refreshMemberProfile();
    } catch {
      setLoginError("Unable to sign in right now. Please try again.");
    } finally {
      setVerifyBusy(false);
    }
  };

  useEffect(() => {
    if (!shopSlug || !isSupabaseConfigured) return;
    if (loading) return;
    if (!currentMember || accountKind !== "member") {
      setResult(null);
      setFetchError(null);
      return;
    }

    let active = true;
    setPending(true);
    setFetchError(null);
    void (async () => {
      const res = await getOdMemberShopVerification(shopSlug);
      if (!active) return;
      setPending(false);
      if (res.ok === false) {
        setFetchError(res.error === "not_authenticated" ? "Session expired. Sign in again." : String(res.error));
        setResult(null);
        return;
      }
      setResult({
        qualified: res.data.qualified,
        memberCode: res.data.memberCode,
        shopName: res.data.shopName,
        validUntil: res.data.validUntil,
        membershipStatus: res.data.membershipStatus,
      });
    })();

    return () => {
      active = false;
    };
  }, [shopSlug, currentMember, accountKind, loading]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  if (!shopSlug) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef] px-6 text-[#6d6658]">
        Invalid link.
      </div>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef] px-6 text-center text-[#6d6658]">
        Service is temporarily unavailable.
      </div>
    );
  }

  if (loading || !sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f3ef]">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1b1813] border-t-transparent" />
      </div>
    );
  }

  if (!currentMember || accountKind !== "member") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ef] px-6 py-12">
        <div className="w-full max-w-lg overflow-hidden rounded-[1.75rem] border border-black/[0.06] bg-white shadow-[0_24px_80px_-36px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.03]">
          <div className="border-b border-black/[0.06] bg-gradient-to-b from-[#fafaf8] to-white px-8 pb-6 pt-8 text-center">
            <img
              src="/odmember.png"
              alt="OD Gold Member"
              width={200}
              height={64}
              className="mx-auto h-21 w-auto sm:h-21"
              decoding="async"
            />
          </div>
          <AnimatePresence mode="wait">
            {signInView === "pick" ? (
              <motion.div
                key="pick"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="p-8 text-center"
              >
                <h1 className="text-xl font-semibold tracking-tight text-[#1b1813]">Sign in to verify</h1>
                <p className="mt-2 text-sm leading-relaxed text-[#6d6658]">
                  Show this screen to staff after you sign in. Your membership status appears as green (qualified) or red
                  (not qualified).
                </p>
                {needsRelogin ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
                    Your session has expired. Please sign in again to continue membership verification.
                  </div>
                ) : null}
                <div className="mt-8 space-y-3 text-left">
                  <button
                    type="button"
                    onClick={openWhatsappSignIn}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-black/[0.07] bg-[#fafaf8] p-4 text-left shadow-[0_10px_36px_-28px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.04] transition-all duration-200 hover:border-[#128C7E]/30 hover:bg-white hover:shadow-[0_14px_44px_-26px_rgba(18,140,126,0.28)] active:scale-[0.992]"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white ring-1 ring-[#128C7E]/20">
                      <img
                        src="/whatsapp-logo.png"
                        alt=""
                        className="h-9 w-9 object-contain"
                        width={36}
                        height={36}
                        decoding="async"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#1b1813]">Continue with WhatsApp</div>
                      <p className="mt-0.5 text-sm text-[#6d6658]">We&apos;ll send a code to your Malaysia mobile number</p>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-[#b8b1a6] transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    onClick={openEmailSignIn}
                    className="group flex w-full items-center gap-4 rounded-2xl border border-black/[0.07] bg-[#fafaf8] p-4 text-left shadow-[0_10px_36px_-28px_rgba(0,0,0,0.15)] ring-1 ring-black/[0.04] transition-all duration-200 hover:border-black/15 hover:bg-white hover:shadow-[0_14px_44px_-26px_rgba(0,0,0,0.12)] active:scale-[0.992]"
                  >
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-black/[0.05] ring-1 ring-black/[0.06]">
                      <Mail className="h-7 w-7 text-[#1b1813]" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-[#1b1813]">Continue with email</div>
                      <p className="mt-0.5 text-sm text-[#6d6658]">Password for your OD Gold member account</p>
                    </div>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-[#b8b1a6] transition-transform group-hover:translate-x-0.5"
                      aria-hidden
                    />
                  </button>
                </div>
              </motion.div>
            ) : signInView === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="p-8 text-left"
              >
                <button
                  type="button"
                  onClick={handleSignInBack}
                  className="-ml-1 mb-5 flex items-center gap-1.5 rounded-lg py-1.5 pl-1 pr-2 text-sm font-medium text-[#6d6658] transition-colors hover:bg-black/[0.04] hover:text-[#1b1813]"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Back
                </button>
                <div className="text-center">
                  <div className="mx-auto flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#f4f1ea] to-[#e8e4dc] ring-1 ring-black/[0.06]">
                    <Mail className="h-10 w-10 text-[#1b1813]" strokeWidth={1.75} aria-hidden />
                  </div>
                  <h2 className="mt-5 text-lg font-bold tracking-tight text-[#1b1813]">Sign in with email</h2>
                  <p className="mt-1.5 text-sm text-[#6d6658]">Use the email linked to your OD Gold account.</p>
                </div>
                <form className="mt-8 space-y-3" onSubmit={handleMemberEmailLogin}>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className={inputCls}
                    type="email"
                    autoComplete="email"
                    required
                  />
                  <Input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    type="password"
                    autoComplete="current-password"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={isLoginDisabled}
                    className="h-12 w-full rounded-xl bg-[#1b1813] text-sm font-semibold text-white hover:bg-[#11100d] disabled:opacity-60"
                  >
                    {loginBusy ? "Signing in…" : "Sign in"}
                  </Button>
                </form>
              </motion.div>
            ) : verifyOtpStep === "phone" ? (
              <motion.div
                key="wa-phone"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="p-8 text-left"
              >
                <button
                  type="button"
                  onClick={handleSignInBack}
                  className="-ml-1 mb-5 flex items-center gap-1.5 rounded-lg py-1.5 pl-1 pr-2 text-sm font-medium text-[#6d6658] transition-colors hover:bg-black/[0.04] hover:text-[#1b1813]"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Back
                </button>
                <div className="flex justify-center">
                  <div className="relative flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-2xl bg-white shadow-[0_8px_28px_-12px_rgba(37,211,102,0.45)] ring-1 ring-[#25D366]/25">
                    <img
                      src="/whatsapp-logo.png"
                      alt=""
                      className="h-14 w-14 object-contain"
                      width={56}
                      height={56}
                      decoding="async"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
                      <Lock className="h-4 w-4 text-[#9a3412]" aria-hidden />
                    </span>
                  </div>
                </div>
                <div className="mt-5 text-center">
                  <h2 className="text-lg font-bold tracking-tight text-[#1b1813]">WhatsApp</h2>
                  <p className="mt-1.5 text-sm text-[#6d6658]">Enter your phone number</p>
                  <p className="mt-2 text-[13px] leading-snug text-[#8a8276]">
                    Use the number on your OD Gold account (<span className="font-medium text-[#1b1813]">60…</span>{" "}
                    Malaysia). We will WhatsApp you a code.
                  </p>
                </div>
                <div className="relative mt-6">
                  <span
                    className="pointer-events-none absolute left-3 top-1/2 z-[1] flex h-9 w-9 -translate-y-1/2 items-center justify-center"
                    aria-hidden
                  >
                    <img
                      src="/whatsapp-logo.png"
                      alt=""
                      className="h-8 w-8 object-contain opacity-95"
                      width={32}
                      height={32}
                      decoding="async"
                    />
                  </span>
                  <Input
                    value={verifyPhone}
                    onChange={(e) => setVerifyPhone(smartNormalizeMalaysiaPhoneInput(e.target.value))}
                    onBlur={(e) => setVerifyPhone(smartNormalizeMalaysiaPhoneInput(e.target.value))}
                    placeholder="60123456789"
                    className={cn(inputCls, "h-12 pl-12 pr-11")}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                  />
                  {phoneLooksValid ? (
                    <span
                      className="pointer-events-none absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
                      aria-hidden
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  disabled={isLoginDisabled || !phoneLooksValid}
                  className="mt-6 h-12 w-full rounded-xl bg-[#1b1813] text-sm font-semibold text-white hover:bg-[#11100d] disabled:opacity-50"
                  onClick={() => void handleSendVerifyShopTac()}
                >
                  {verifyBusy ? "Sending…" : "Send code"}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="wa-code"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22, ease: [0.25, 0.1, 0.25, 1] }}
                className="p-8 text-left"
              >
                <button
                  type="button"
                  onClick={handleSignInBack}
                  className="-ml-1 mb-5 flex items-center gap-1.5 rounded-lg py-1.5 pl-1 pr-2 text-sm font-medium text-[#6d6658] transition-colors hover:bg-black/[0.04] hover:text-[#1b1813]"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0" aria-hidden />
                  Back
                </button>
                <div className="flex justify-center">
                  <div className="relative flex h-[4.75rem] w-[4.75rem] items-center justify-center rounded-2xl bg-white shadow-[0_8px_28px_-12px_rgba(37,211,102,0.35)] ring-1 ring-[#25D366]/25">
                    <img
                      src="/whatsapp-logo.png"
                      alt=""
                      className="h-14 w-14 object-contain"
                      width={56}
                      height={56}
                      decoding="async"
                    />
                  </div>
                </div>
                <div className="mt-5 text-center">
                  <h2 className="text-lg font-bold tracking-tight text-[#1b1813]">Enter your code</h2>
                  <p className="mt-1.5 text-sm text-[#6d6658]">Check WhatsApp for the 6-digit code.</p>
                </div>
                <div
                  className="mt-6 grid grid-cols-6 gap-2 sm:gap-2.5"
                  onPaste={(e) => {
                    e.preventDefault();
                    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
                    const chars = pasted.split("");
                    setOtpCells(() => {
                      const next: string[] = ["", "", "", "", "", ""];
                      for (let i = 0; i < 6; i++) next[i] = chars[i] ?? "";
                      return next;
                    });
                    const focusIdx = pasted.length >= 6 ? 5 : Math.max(0, pasted.length);
                    window.requestAnimationFrame(() => otpRefs.current[focusIdx]?.focus());
                  }}
                >
                  {otpCells.map((digit, index) => (
                    <Input
                      key={index}
                      ref={(el) => {
                        otpRefs.current[index] = el;
                      }}
                      value={digit}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, "").slice(-1);
                        setOtpCells((prev) => {
                          const next = [...prev];
                          next[index] = v;
                          return next;
                        });
                        if (v && index < 5) {
                          window.requestAnimationFrame(() => otpRefs.current[index + 1]?.focus());
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Backspace") return;
                        e.preventDefault();
                        setOtpCells((prev) => {
                          const next = [...prev];
                          if (next[index]) {
                            next[index] = "";
                            return next;
                          }
                          if (index > 0) {
                            next[index - 1] = "";
                            window.requestAnimationFrame(() => otpRefs.current[index - 1]?.focus());
                          }
                          return next;
                        });
                      }}
                      inputMode="numeric"
                      autoComplete={index === 0 ? "one-time-code" : "off"}
                      maxLength={1}
                      className="h-12 min-w-0 rounded-xl border border-black/[0.1] bg-[#f4f1ea] px-0 text-center text-lg font-semibold tabular-nums text-[#1b1813] shadow-none focus-visible:border-[#1b1813] focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#1b1813]/15"
                      aria-label={`Digit ${index + 1} of 6`}
                    />
                  ))}
                </div>
                <form className="mt-6" onSubmit={(e) => void handleVerifyShopSignIn(e)}>
                  <Button
                    type="submit"
                    disabled={isLoginDisabled || otpCells.join("").length !== 6}
                    className="h-12 w-full rounded-xl bg-[#1b1813] text-sm font-semibold text-white hover:bg-[#11100d] disabled:opacity-50"
                  >
                    {verifyBusy ? "Signing in…" : "Verify code"}
                  </Button>
                </form>
                <div className="mt-4 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                  <button
                    type="button"
                    className="font-medium text-[#2563eb] underline-offset-4 hover:underline disabled:opacity-50"
                    disabled={verifyBusy || !phoneLooksValid}
                    onClick={() => void handleSendVerifyShopTac()}
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    className="font-medium text-[#6d6658] underline-offset-4 hover:text-[#1b1813] hover:underline"
                    onClick={handleChangeVerifyNumber}
                  >
                    Change number
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {verifyMsg ? (
            <p className="border-t border-black/[0.05] bg-emerald-50/80 px-8 py-3 text-center text-sm text-emerald-800">{verifyMsg}</p>
          ) : null}
          {loginError ? (
            <div className={`border-t border-black/[0.05] px-8 pb-8 pt-3 ${memberAuthNoticeClassName(loginError)}`}>{loginError}</div>
          ) : null}
          <p className="hidden px-8 pb-8 text-sm text-[#8a8276]">
            <Link className="underline-offset-2 hover:underline" to="/od/member/signup">
              Create member account
            </Link>
          </p>
        </div>
      </div>
    );
  }

  if (pending || fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#f5f3ef] px-6">
        <img src="/odmember.png" alt="OD Gold Member" className="h-9 w-auto opacity-90 sm:h-10" width={160} height={48} />
        {pending && (
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1b1813] border-t-transparent" />
        )}
        {fetchError && (
          <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 px-6 py-4 text-center text-sm text-red-700">
            {fetchError}
          </div>
        )}
      </div>
    );
  }

  if (!result) {
    return null;
  }

  const qualified = result.qualified;
  const membershipInactive = result.membershipStatus !== "active";
  const signedInEmail = currentMember?.email?.trim() ?? "";
  const showAccountCta = membershipInactive || !qualified;

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-10 transition-colors duration-500"
      style={{
        background: qualified
          ? "linear-gradient(165deg, #ecfdf5 0%, #d1fae5 45%, #a7f3d0 100%)"
          : "linear-gradient(165deg, #fef2f2 0%, #fee2e2 45%, #fecaca 100%)",
      }}
    >
      <div className="w-full max-w-md rounded-[2rem] border border-black/[0.06] bg-white/90 p-8 text-center shadow-[0_24px_80px_-32px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <img
          src="/odmember.png"
          alt="OD Gold Member"
          width={200}
          height={64}
          className="mx-auto mb-6 h-20 w-auto opacity-95 sm:h-19"
          decoding="async"
        />
        <div
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${qualified ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
            }`}
        >
          {qualified ? <CheckCircle2 className="h-11 w-11" strokeWidth={2} /> : <XCircle className="h-11 w-11" strokeWidth={2} />}
        </div>
        <h1 className={`text-2xl font-bold tracking-tight ${qualified ? "text-emerald-900" : "text-red-900"}`}>
          {qualified ? "Qualified" : "Not qualified"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#4b5563]">
          {qualified
            ? `Active OD Gold Member — staff may apply the shop’s manual discount for this visit.`
            : `No active OD Gold Member. Staff should not apply OD Gold Member discounts until this shows green.`}
        </p>
        {membershipInactive && (
          <div className="mt-4 space-y-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            <p>
              Your account is signed in, but membership is currently inactive. Please renew/reactivate your OD Gold
              membership before claiming partner discounts.
            </p>
            <Button
              type="button"
              className="h-11 w-full rounded-full bg-[#1b1813] text-sm font-semibold text-white hover:bg-[#11100d]"
              asChild
            >
              <Link to="/od/account">Go to my account</Link>
            </Button>
          </div>
        )}
        {showAccountCta && !membershipInactive && (
          <div className="mt-4">
            <Button
              type="button"
              variant="outline"
              className="h-11 w-full rounded-full border-black/15 text-[#1b1813]"
              asChild
            >
              <Link to="/od/account">Go to my account</Link>
            </Button>
          </div>
        )}
        <div className="mt-8 rounded-2xl bg-black/[0.04] px-4 py-3 text-left text-sm">
          {signedInEmail ? (
            <>
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Signed in as</div>
              <div className="mt-1 break-all text-[#111827]">{signedInEmail}</div>
              <div className="my-4 border-t border-black/[0.06]" />
            </>
          ) : null}
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Verified at</div>
          <div className="mt-1 text-[#111827]">
            {now.toLocaleString(undefined, { dateStyle: "full", timeStyle: "medium" })}
          </div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Shop</div>
          <div className="mt-1 font-medium text-[#111827]">{result.shopName}</div>
          <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Member ID (disputes)</div>
          <div className="mt-1 font-mono text-base text-[#111827]">{result.memberCode}</div>
          {result.validUntil && (
            <>
              <div className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6b7280]">Valid until</div>
              <div className="mt-1 text-[#111827]">
                {new Date(result.validUntil).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </div>
            </>
          )}
        </div>
        <div className="mt-8 rounded-xl border border-dashed border-black/10 px-3 py-2 text-xs text-[#6b7280]">
          Both you and staff should see this screen. Adjust brightness if needed.
        </div>
      </div>
    </div>
  );
};
