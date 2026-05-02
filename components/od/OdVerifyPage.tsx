import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { getOdMemberShopVerification } from "../../lib/db/members";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { MEMBER_OAUTH_ERROR_KEY, memberAuthNoticeClassName } from "../../lib/memberOAuthUi";
import { Button } from "../ui/button";
import { Input } from "../ui/input";

const inputCls =
  "h-12 rounded-[1rem] border border-black/[0.08] bg-[#f4f1ea] px-4 text-[15px] text-[#171512] shadow-none placeholder:text-[#8a8276] focus-visible:border-black/25 focus-visible:bg-white focus-visible:ring-0";

const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 24 24" aria-hidden className={className}>
    <path d="M21.35 11.1H12v2.98h5.33c-.23 1.52-1.14 2.8-2.43 3.65v2.42h3.93c2.3-2.12 3.63-5.25 3.63-8.98 0-.67-.06-1.31-.11-1.95Z" fill="#4285F4" />
    <path d="M12 22c2.7 0 4.96-.9 6.61-2.45l-3.93-2.42c-1.09.73-2.48 1.15-4.02 1.15-3.09 0-5.71-2.09-6.64-4.91H0v2.5A10 10 0 0 0 12 22Z" fill="#34A853" />
    <path d="M4.02 13.37A5.98 5.98 0 0 1 3.65 11c0-.82.14-1.61.37-2.37v-2.5H0A10 10 0 0 0 0 16l4.02-2.63Z" fill="#FBBC05" />
    <path d="M12 3.72c1.47 0 2.8.51 3.84 1.52l2.88-2.88C16.96.72 14.7 0 12 0A10 10 0 0 0 0 6.13l4.02 2.5c.93-2.82 3.55-4.91 6.64-4.91Z" fill="#EA4335" />
  </svg>
);

export const OdVerifyPage: React.FC = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { currentMember, loading, accountKind, memberLogin, memberLoginWithGoogle } = useAuth();
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
  const [googleBusy, setGoogleBusy] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [needsRelogin, setNeedsRelogin] = useState(false);
  const [oauthFlash, setOauthFlash] = useState<string | null>(null);

  const nextPath = `/od/verify/${encodeURIComponent(shopSlug ?? "")}`;
  const isLoginDisabled = loading || !sessionChecked || loginBusy || googleBusy;

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

  useEffect(() => {
    const oauthError = window.localStorage.getItem(MEMBER_OAUTH_ERROR_KEY);
    if (!oauthError) return;
    setOauthFlash(oauthError);
    setLoginError("");
    window.localStorage.removeItem(MEMBER_OAUTH_ERROR_KEY);
  }, []);

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

  const handleGoogleLogin = async () => {
    setLoginError("");
    setGoogleBusy(true);
    try {
      const result = await memberLoginWithGoogle(nextPath);
      if (result.ok === false) {
        setLoginError(result.error);
      }
    } catch {
      setLoginError("Unable to continue with Google right now. Please try again.");
    } finally {
      setGoogleBusy(false);
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
          {oauthFlash && (
            <div className={`mt-4 ${memberAuthNoticeClassName(oauthFlash)}`}>{oauthFlash}</div>
          )}
          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              disabled={isLoginDisabled}
              onClick={() => void handleGoogleLogin()}
              className="h-12 w-full rounded-[1rem] border border-black/[0.1] bg-white text-sm font-semibold text-[#1b1813] hover:bg-[#faf8f3] disabled:opacity-60"
            >
              {googleBusy ? "Connecting to Google…" : (
                <>
                  <GoogleIcon className="mr-2 h-4 w-4 shrink-0" />
                  Continue with Google
                </>
              )}
            </Button>
            <div className="relative mt-4 py-0.5">
              <div className="border-t border-black/[0.08]" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#777062]">
                or
              </span>
            </div>
            <form className="mt-4 space-y-3 text-left" onSubmit={handleMemberEmailLogin}>
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
      </div>
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
          className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full ${
            qualified ? "bg-emerald-500/15 text-emerald-600" : "bg-red-500/15 text-red-600"
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
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-sm text-amber-900">
            Your account is signed in, but membership is currently inactive. Please renew/reactivate your OD Gold
            membership before claiming partner discounts.
          </div>
        )}
        <div className="mt-8 rounded-2xl bg-black/[0.04] px-4 py-3 text-left text-sm">
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
