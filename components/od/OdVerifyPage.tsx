import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "../AuthProvider";
import { getOdMemberShopVerification } from "../../lib/db/members";
import { isSupabaseConfigured } from "../../lib/supabase";

export const OdVerifyPage: React.FC = () => {
  const { shopSlug } = useParams<{ shopSlug: string }>();
  const { currentMember, loading, accountKind } = useAuth();
  const [result, setResult] = useState<{
    qualified: boolean;
    memberCode: string;
    shopName: string;
    validUntil: string | null;
  } | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => new Date());

  const nextPath = `/od/verify/${encodeURIComponent(shopSlug ?? "")}`;

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

  if (loading) {
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
          <Link
            to={`/od/member/login?next=${encodeURIComponent(nextPath)}`}
            className="mt-6 inline-flex h-12 items-center justify-center rounded-full bg-[#1b1813] px-8 text-sm font-semibold text-white transition hover:bg-[#11100d]"
          >
            OD Gold member sign in
          </Link>
          <p className="mt-6 text-sm text-[#8a8276]">
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
