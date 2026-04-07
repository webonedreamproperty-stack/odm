import React, { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gift, ShieldCheck, Sparkles, Store, Users, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { fetchOdPublicLandingStats } from "../lib/db/odPublicStats";
import { cn } from "../lib/utils";

const OdLandingMapPreview = lazy(() => import("./od/OdLandingMapPreview"));

/** Google Material–inspired elevation (cards, surfaces). */
const gCard =
  "rounded-[28px] bg-white text-[#202124] transition-[transform,box-shadow] duration-300 ease-out motion-safe:hover:-translate-y-0.5";

const gCardShadow = {
  boxShadow: "0 1px 2px 0 rgba(60,64,67,.3), 0 1px 3px 1px rgba(60,64,67,.15)",
} as const;

function formatStat(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

function AnimatedStatValue({ value, loaded }: { value: number | null; loaded: boolean }) {
  return (
    <span
      className={cn(
        "tabular-nums tracking-tight text-[#202124] transition-opacity duration-500",
        loaded && value !== null ? "opacity-100" : "opacity-40",
      )}
    >
      {loaded && value !== null ? formatStat(value) : "—"}
    </span>
  );
}

export const OdHomeLandingPage: React.FC = () => {
  const [stats, setStats] = useState<{ shops: number | null; members: number | null }>({
    shops: null,
    members: null,
  });
  const [statsLoaded, setStatsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const s = await fetchOdPublicLandingStats();
      if (cancelled) return;
      if (s) {
        setStats({ shops: s.shopCount, members: s.memberCount });
      }
      setStatsLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#202124] antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#dadce0]/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3 outline-offset-4">
            <img src="/odmember.svg" alt="OD Member" className="h-10 w-auto sm:h-11" width={200} height={64} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* <Button
              asChild
              variant="ghost"
              className="hidden rounded-full text-[#5f6368] hover:bg-[#f1f3f4] sm:inline-flex"
            >
              <Link to="/od/login">OD sign in</Link>
            </Button> */}
            <Button asChild variant="outline" className="rounded-full border-[#dadce0] bg-white text-sm font-medium shadow-sm">
              <Link to="/login">Login</Link>
            </Button>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {/* Hero */}
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#dadce0] bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5f6368] shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-[#1a73e8]" aria-hidden />
              Malaysia · OD loyalty network
            </p>
            <h1 className="mt-5 text-[clamp(1.85rem,4.2vw,2.75rem)] font-medium leading-[1.12] tracking-tight text-[#202124]">
              Rewards for members.
              <span className="text-[#174ea6]"> Growth </span>
              for partners.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#5f6368]">
              One place to unlock member discounts and privileges, and one place for shops to drive repeat visits with a
              modern, trustworthy loyalty experience.
            </p>

            {/* Live stats — Google-style chips */}
            <div
              className="mt-8 flex flex-wrap gap-3"
              role="status"
              aria-live="polite"
              aria-label="Network statistics"
            >
              <div
                className={cn(gCard, "flex min-w-[140px] flex-1 flex-col gap-0.5 px-5 py-4 sm:min-w-[160px]")}
                style={gCardShadow}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-[#5f6368]">
                  <Store className="h-4 w-4 text-[#1a73e8]" aria-hidden />
                  Partner shops
                </span>
                <span className="text-3xl font-medium">
                  <AnimatedStatValue value={stats.shops} loaded={statsLoaded} />
                </span>
              </div>
              <div
                className={cn(gCard, "flex min-w-[140px] flex-1 flex-col gap-0.5 px-5 py-4 sm:min-w-[160px]")}
                style={gCardShadow}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-[#5f6368]">
                  <Users className="h-4 w-4 text-[#059669]" aria-hidden />
                  OD members
                </span>
                <span className="text-3xl font-medium">
                  <AnimatedStatValue value={stats.members} loaded={statsLoaded} />
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-[#80868b]">
              Figures show active partner listings and members with valid OD membership.
            </p>
          </div>

          {/* Human + soft frame (Apple-like rounded media) */}
          <div className="relative mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-none">
            <div
              className="relative overflow-hidden rounded-[32px] bg-[#e8eaed] shadow-[0_24px_80px_-24px_rgba(32,33,36,0.45)] ring-1 ring-black/[0.06]"
              style={{ aspectRatio: "4 / 5" }}
            >
              <img
                src="https://images.pexels.com/photos/11792247/pexels-photo-11792247.jpeg?auto=format&fit=crop&w=960&q=80"
                alt="Professional using a phone — representing members and partners connecting through ODMember"
                className="h-full w-full object-cover object-[center_20%]"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/25 bg-white/90 px-4 py-3 shadow-lg backdrop-blur-md">
                <p className="text-sm font-medium text-[#202124]">Built for real shops &amp; everyday members</p>
                <p className="mt-0.5 text-xs text-[#5f6368]">Discounts you can use · perks that feel premium</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTAs — Google card UI (warm yellow band vs page shell) */}
        <section className="-mx-4 mt-16 rounded-[28px] bg-[#fff8e7] px-4 py-12 sm:-mx-6 sm:mt-20 sm:px-6 sm:py-14">
          <h2 className="text-center text-sm font-medium uppercase tracking-[0.12em] text-[#5f6368]">Choose your path</h2>
          <p className="mx-auto mt-2 max-w-2xl text-center text-lg text-[#202124]">Join as a member or register your business</p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article
              className={cn(
                gCard,
                "flex flex-col p-8 motion-safe:hover:shadow-[0_1px_3px_0_rgba(60,64,67,.3),0_4px_8px_3px_rgba(60,64,67,.15)]",
              )}
              style={gCardShadow}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6f4ea] text-[#137333]">
                <Gift className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-6 text-[22px] font-medium tracking-tight">New member</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#5f6368]">
                Enjoy member discounts and OD privileges at participating shops — one account, consistent benefits.
              </p>
              <Button
                asChild
                className="mt-8 h-12 rounded-full bg-[#1a73e8] text-[15px] font-medium text-white shadow-none hover:bg-[#1557b0]"
              >
                <Link to="/od/member/signup">
                  Register as member <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.25} />
                </Link>
              </Button>
            </article>

            <article
              className={cn(
                gCard,
                "flex flex-col p-8 motion-safe:hover:shadow-[0_1px_3px_0_rgba(60,64,67,.3),0_4px_8px_3px_rgba(60,64,67,.15)]",
              )}
              style={gCardShadow}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f0fe] text-[#1a73e8]">
                <Store className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-6 text-[22px] font-medium tracking-tight">New partner</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#5f6368]">
                Boost sales and bring customers back with offers they can trust — tuned for repeat visits, not one-off
                deals.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-8 h-12 rounded-full border-[#dadce0] bg-white text-[15px] font-medium text-[#1a73e8] hover:bg-[#f8f9fa]"
              >
                <Link to="/odp/signup">
                  Register as partner <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.25} />
                </Link>
              </Button>
            </article>
          </div>
        </section>

        {/* Map (mapcn / shadcn Map) */}
        <section className="mt-16 sm:mt-20">
          <h2 className="text-center text-sm font-medium uppercase tracking-[0.12em] text-[#5f6368]">Coverage</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-[15px] leading-relaxed text-[#5f6368]">
            See how OD connects members with local businesses — explore the map, then pick your role above.
          </p>
          <div className="mx-auto mt-8 max-w-3xl">
            <Suspense
              fallback={
                <div
                  className="flex h-[min(360px,50vh)] min-h-[240px] items-center justify-center rounded-[28px] bg-[#e8eaed] text-sm text-[#5f6368]"
                  style={gCardShadow}
                >
                  Loading map…
                </div>
              }
            >
              <OdLandingMapPreview />
            </Suspense>
          </div>
        </section>

        {/* Trust row */}
        <section className="mt-16 border-t border-[#dadce0] pt-12">
          <h2 className="text-center text-sm font-medium uppercase tracking-[0.12em] text-[#5f6368]">
            Why teams choose ODMember
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              {
                icon: ShieldCheck,
                title: "Trust at the counter",
                body: "Clear verify flow so staff and members stay aligned.",
              },
              {
                icon: Zap,
                title: "Fast to launch",
                body: "Partners can go live and refine offers in Settings.",
              },
              {
                icon: Users,
                title: "Built for repeats",
                body: "Designed around discounts, privileges, and coming back.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className={cn(gCard, "p-6")}
                style={gCardShadow}
              >
                <item.icon className="h-6 w-6 text-[#1a73e8]" aria-hidden />
                <h3 className="mt-4 text-base font-medium text-[#202124]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5f6368]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#dadce0] bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-[#80868b] sm:flex-row sm:text-left">
          <img src="/odmember.svg" alt="" className="h-6 opacity-50" />
          <p>© {new Date().getFullYear()} ODMember. Professional loyalty for modern businesses.</p>
        </div>
      </footer>
    </div>
  );
};
