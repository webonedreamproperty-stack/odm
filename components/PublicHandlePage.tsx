import React, { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ExternalLink, MapPin, Sparkles, Store } from "lucide-react";
import { Button } from "./ui/button";
import { fetchPublicHandlePage, type PublicMemberHandle, type PublicVendorHandle } from "../lib/db/publicHandle";
import { VendorPublicPlaceCard } from "./VendorPublicPlaceCard";
import { isReservedPublicHandle } from "../lib/publicHandleReserved";
import { buildAppUrl } from "../lib/siteConfig";
import { OD_INDUSTRY_FILTER_LABEL } from "../lib/odMemberDirectoryFilters";

export const PublicHandlePage: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState<PublicVendorHandle | null>(null);
  const [member, setMember] = useState<PublicMemberHandle | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const h = username ?? "";
    if (!h || isReservedPublicHandle(h)) {
      setLoading(false);
      setNotFound(true);
      setVendor(null);
      setMember(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    void (async () => {
      const res = await fetchPublicHandlePage(h);
      if (cancelled) return;
      setLoading(false);
      if (!res.ok) {
        setNotFound(true);
        setVendor(null);
        setMember(null);
        return;
      }
      if (res.data.kind === "vendor") {
        setVendor(res.data);
        setMember(null);
      } else {
        setMember(res.data);
        setVendor(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (vendor) {
      document.title = `${vendor.business_name} · Stampee`;
    } else if (member) {
      document.title = `${member.display_name} · Stampee`;
    } else {
      document.title = "Stampee";
    }
  }, [vendor, member]);

  if (!username || isReservedPublicHandle(username)) {
    return <Navigate to="/login" replace />;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#f5f3ef] to-[#ebe8e2]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#1b1813]/20 border-t-[#1b1813]" />
      </div>
    );
  }

  if (notFound || (!vendor && !member)) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#f5f3ef] to-[#ebe8e2] px-6 text-center">
        <p className="text-lg font-medium text-[#1b1813]">This page isn’t available</p>
        <p className="max-w-sm text-sm text-[#6d6658]">
          There is no public profile for <span className="font-mono">{username}</span>. Check the link or sign in.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/login">Business sign in</Link>
          </Button>
          <Button asChild className="rounded-full bg-[#1b1813] hover:bg-[#11100d]">
            <Link to="/od/member/login">OD member sign in</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (vendor) {
    const categoryLabel =
      vendor.business_category != null
        ? OD_INDUSTRY_FILTER_LABEL[vendor.business_category] ?? vendor.business_category
        : null;
    const showListing = vendor.directory_visible;

    const useGoogleCard = vendor.place_details != null && Object.keys(vendor.place_details).length > 0;

    return (
      <div className="min-h-screen bg-gradient-to-b from-[#f5f3ef] to-[#ebe8e2] px-4 py-12">
        <div className={useGoogleCard ? "mx-auto max-w-lg" : "mx-auto max-w-md"}>
          {useGoogleCard && vendor.place_details ? (
            <VendorPublicPlaceCard vendor={vendor} placeDetails={vendor.place_details} />
          ) : (
            <article className="overflow-hidden rounded-[1.5rem] border border-black/[0.06] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
              <div
                className="relative aspect-[2/1] min-h-[140px] bg-[#1b1813]/[0.06]"
                style={{
                  backgroundImage: vendor.shop_photo_url ? `url(${vendor.shop_photo_url})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
                {vendor.logo_url ? (
                  <div className="absolute bottom-4 left-4 flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg ring-2 ring-white/80">
                    <img src={vendor.logo_url} alt="" className="max-h-full max-w-full object-contain" />
                  </div>
                ) : (
                  <div className="absolute bottom-4 left-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/95 shadow-lg">
                    <Store className="h-7 w-7 text-[#1b1813]" aria-hidden />
                  </div>
                )}
                <div className="absolute bottom-4 right-4 left-[5.5rem] text-right sm:left-auto">
                  {categoryLabel ? (
                    <span className="mb-1 inline-block rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                      {categoryLabel}
                    </span>
                  ) : null}
                  <h1 className="text-xl font-semibold tracking-tight text-white drop-shadow-sm sm:text-2xl">
                    {vendor.business_name}
                  </h1>
                </div>
              </div>

              <div className="space-y-4 p-6">
                <p className="font-mono text-[11px] text-[#8a8276]">{buildAppUrl(`/${vendor.slug}`)}</p>

                {showListing && vendor.listing_area ? (
                  <div className="flex items-start gap-2 text-sm text-[#5c554a]">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8a8276]" aria-hidden />
                    <span>{vendor.listing_area}</span>
                  </div>
                ) : null}

                {showListing && vendor.discount_summary ? (
                  <div className="flex gap-3 rounded-2xl bg-emerald-50/90 px-4 py-3 ring-1 ring-emerald-200/60">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden />
                    <p className="text-sm font-medium leading-snug text-emerald-900">{vendor.discount_summary}</p>
                  </div>
                ) : null}

                {!showListing ? (
                  <p className="text-sm text-[#6d6658]">This business uses Stampee. Contact them directly for offers.</p>
                ) : null}

                <div className="flex flex-col gap-2 pt-1">
                  {vendor.maps_url && /^https?:\/\//i.test(vendor.maps_url) ? (
                    <a
                      href={vendor.maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-[#faf9f7] px-4 py-3 text-sm font-medium text-[#1b1813] transition hover:bg-[#f0eeea]"
                    >
                      <ExternalLink className="h-4 w-4 opacity-70" aria-hidden />
                      Directions
                    </a>
                  ) : null}
                  <Button asChild variant="outline" className="w-full rounded-full border-black/12">
                    <Link to={`/od/verify/${encodeURIComponent(vendor.slug)}`}>OD member verification</Link>
                  </Button>
                </div>
              </div>
            </article>
          )}

          <p className="mt-8 text-center text-xs text-[#8a8276]">
            <Link to="/login" className="underline-offset-2 hover:underline">
              Business login
            </Link>
            {" · "}
            <Link to="/od/member/login" className="underline-offset-2 hover:underline">
              Member login
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const m = member!;
  const publicUrl = buildAppUrl(`/${m.username}`);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f5f3ef] to-[#ebe8e2] px-4 py-12">
      <div className="mx-auto max-w-md">
        <article className="rounded-[1.5rem] border border-black/[0.06] bg-white p-8 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-[#1b1813]/[0.06] text-2xl font-semibold text-[#1b1813]">
            {m.display_name.trim().slice(0, 1).toUpperCase() || "M"}
          </div>
          <h1 className="text-center text-2xl font-semibold tracking-tight text-[#1b1813]">{m.display_name}</h1>
          <p className="mt-1 text-center text-sm text-[#6d6658]">OD member</p>
          <p className="mt-4 text-center font-mono text-[11px] text-[#8a8276]">{publicUrl}</p>

          <div
            className={`mt-6 rounded-2xl px-4 py-3 text-center text-sm font-medium ${
              m.membership_active
                ? "bg-emerald-50 text-emerald-900 ring-1 ring-emerald-200/70"
                : "bg-amber-50 text-amber-900 ring-1 ring-amber-200/70"
            }`}
          >
            {m.membership_active ? "Membership active" : "Membership inactive"}
          </div>

          <div className="mt-8 flex flex-col gap-2">
            <Button asChild className="w-full rounded-full bg-[#1b1813] hover:bg-[#11100d]">
              <Link to="/od/member/login">Member sign in</Link>
            </Button>
            <Button asChild variant="outline" className="w-full rounded-full border-black/12">
              <Link to="/od/login">OD home</Link>
            </Button>
          </div>
        </article>

        <p className="mt-8 text-center text-xs text-[#8a8276]">
          <Link to="/login" className="underline-offset-2 hover:underline">
            Business login
          </Link>
        </p>
      </div>
    </div>
  );
};
