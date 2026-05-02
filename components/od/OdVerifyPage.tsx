import React, { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Check, CheckCircle2, Lock, MessageSquare, Phone, Smartphone, XCircle } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { fetchMemberProfile, getOdMemberShopVerification } from "../../lib/db/members";
import { fetchProfile } from "../../lib/db/profiles";
import { digitsOnlyPhone, isMalaysiaSixtyMsisdn, normalizeMalaysiaMsisdnDigits } from "../../lib/memberPhoneDigits";
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

  const isLoginDisabled = loading || !sessionChecked || loginBusy || verifyBusy;
  const phoneLooksValid = isMalaysiaSixtyMsisdn(verifyPhone);

  const normalizeVerifyPhoneInput = (raw: string): string => {
    const digits = digitsOnlyPhone(raw);
    return normalizeMalaysiaMsisdnDigits(digits);
  };

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
        <div className="w-full max-w-lg rounded-[1.75rem] border border-black/[0.06] bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold text-[#1b1813]">Sign in to verify</h1>
          <p className="mt-2 text-sm text-[#6d6658]">
            Show this screen to staff after you sign in. Your membership status appears as green (qualified) or red
            (not qualified).
          </p>
          {needsRelogin && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
              Your session has expired. Please sign in again to continue membership verification.
            </div>
          )}
          <div className="mt-6 space-y-6 text-left">
            <div className="space-y-4">
              {verifyOtpStep === "phone" ? (
                <div className="rounded-[1.35rem] border border-black/[0.06] bg-white px-5 pb-6 pt-6 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.18)]">
                  <div className="flex justify-center">
                    <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#fff7ed] to-[#ffedd5]">
                      <Phone className="h-9 w-9 text-[#ea580c]" strokeWidth={1.75} aria-hidden />
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-8 w-8 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-black/[0.06]">
                        <Lock className="h-4 w-4 text-[#9a3412]" aria-hidden />
                      </span>
                    </div>
                  </div>

                  {/* show whatsapp logo brand icon */}

                  <h2 className="mt-5 text-center text-lg font-bold tracking-tight text-[#1b1813]"
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      gap: '1rem',
                      alignItems: 'center',
                      paddingBottom: '1rem',
                    }}>
                    WhatsApp verification                   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-message-circle-check-icon lucide-message-circle-check"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719" /><path d="m9 12 2 2 4-4" /></svg> </h2>
                  <p className="mt-1.5 text-center text-sm text-[#6d6658]">Enter your phone number</p>

                  <p className="mt-2 text-center text-[13px] leading-snug text-[#8a8276]">
                    Use the number on your OD Gold account (
                    <span className="font-medium text-[#1b1813]">60…</span> Malaysia). We will WhatsApp you a code.
                  </p>
                  <div className="relative mt-5">
                    <Input
                      value={verifyPhone}
                      onChange={(e) => setVerifyPhone(normalizeVerifyPhoneInput(e.target.value))}
                      onBlur={(e) => setVerifyPhone(normalizeVerifyPhoneInput(e.target.value))}
                      placeholder="60123456789"
                      className={cn(inputCls, "h-12 pr-11")}
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
                    className="mt-5 h-12 w-full rounded-xl bg-[#1b1813] text-sm font-semibold text-white hover:bg-[#11100d] disabled:opacity-50"
                    onClick={() => void handleSendVerifyShopTac()}
                  >
                    {verifyBusy ? "Sending…" : "Send code"}
                  </Button>
                </div>
              ) : (
                <div className="rounded-[1.35rem] border border-black/[0.06] bg-white px-5 pb-6 pt-6 shadow-[0_12px_40px_-24px_rgba(0,0,0,0.18)]">
                  <div className="flex justify-center">
                    <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl bg-gradient-to-br from-[#eff6ff] to-[#dbeafe]">
                      <Smartphone className="h-9 w-9 text-[#2563eb]" strokeWidth={1.75} aria-hidden />
                      <span className="absolute -right-1 -top-1 flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-md ring-1 ring-black/[0.06]">
                        <MessageSquare className="h-5 w-5 text-[#2563eb]" aria-hidden />
                      </span>
                    </div>
                  </div>
                  <h2 className="mt-5 text-center text-lg font-bold tracking-tight text-[#1b1813]">Account verification</h2>
                  <p className="mt-1.5 text-center text-sm text-[#6d6658]">Enter the code below</p>
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
                </div>
              )}
              {verifyMsg ? <p className="text-center text-sm text-emerald-700">{verifyMsg}</p> : null}
            </div>

            <div className="relative py-0.5">
              <div className="border-t border-black/[0.08]" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777062]">
                or email
              </span>
            </div>

            <form className="space-y-3" onSubmit={handleMemberEmailLogin}>
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
                className="h-12 w-full rounded-[1rem] bg-[#1b1813] text-sm font-semibold text-white hover:bg-[#11100d] disabled:opacity-60"
              >
                {loginBusy ? "Signing in…" : "Sign in with email"}
              </Button>
            </form>
            {loginError && (
              <div className={`mt-3 ${memberAuthNoticeClassName(loginError)}`}>{loginError}</div>
            )}
          </div>
          <p className="mt-6 text-sm text-[#8a8276] hidden">
            <Link className="underline-offset-2 hover:underline" to="/od/member/signup">
              Create member account
            </Link>
          </p>
        </div>
      </div >
    );
  }

  if (pending || fetchError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#f5f3ef] px-6">
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
