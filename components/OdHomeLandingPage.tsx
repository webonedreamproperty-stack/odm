import React, { Suspense, lazy, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Gift, ShieldCheck, Sparkles, Store, Users, Zap } from "lucide-react";
import { Button } from "./ui/button";
import { fetchOdPublicLandingStats } from "../lib/db/odPublicStats";
import { cn } from "../lib/utils";

const OdLandingMapPreview = lazy(() => import("./od/OdLandingMapPreview"));

/** Google Material–inspired elevation (cards, surfaces). */
const gCard =
  "rounded-[28px] border border-[#e9eaef] bg-[linear-gradient(180deg,#ffffff_0%,#fcfcfe_100%)] text-[#16181d] transition-[transform,box-shadow,border-color] duration-300 ease-out motion-safe:hover:-translate-y-0.5 motion-safe:hover:border-[#dcdff0]";

const gCardShadow = {
  boxShadow: "0 1px 2px rgba(17,24,39,0.05), 0 18px 40px -28px rgba(41,56,111,0.28)",
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
    <div className="relative min-h-screen overflow-hidden bg-white text-[#151821] antialiased">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-12%] top-[-16rem] h-[34rem] w-[34rem] rounded-full bg-[radial-gradient(circle,#f6f0dd_0%,rgba(246,240,221,0)_72%)]" />
        <div className="absolute right-[-10%] top-[6rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,#edf2ff_0%,rgba(237,242,255,0)_72%)]" />
        <div className="absolute inset-x-0 top-[30rem] h-[18rem] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(248,250,255,0.9)_46%,rgba(255,255,255,1)_100%)]" />
      </div>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:shadow-lg"
      >
        Skip to content
      </a>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[#eceef4] bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-3 outline-offset-4">
            <img src="/odmember.png" alt="OD Gold Member" className="h-15 w-auto sm:h-[10rem]" width={200} height={64} />
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

      <main id="main" className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
        {/* Hero */}
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-12">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-[#e8ddc4] bg-[linear-gradient(180deg,#fffdf7_0%,#fff8e8_100%)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#7b6641] shadow-[0_8px_24px_-18px_rgba(122,96,46,0.55)]">
              <Sparkles className="h-3.5 w-3.5 text-[#b8892e]" aria-hidden />
              Malaysia · OD premium rewards network
            </p>
            <h1 className="mt-5 text-[clamp(1.85rem,4.2vw,2.75rem)] font-semibold leading-[1.08] tracking-tight text-[#171a22]">
              Rewards for members.
              <span className="bg-[linear-gradient(120deg,#b8892e_0%,#2b4fc7_100%)] bg-clip-text text-transparent"> Growth </span>
              for partners.
            </h1>
            <p className="mt-4 max-w-xl text-lg leading-relaxed text-[#505661]">
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
                <span className="flex items-center gap-1.5 text-xs font-medium text-[#586072]">
                  <Store className="h-4 w-4 text-[#2b4fc7]" aria-hidden />
                  OD Privilege Partner shops
                </span>
                <span className="text-3xl font-medium">
                  <AnimatedStatValue value={stats.shops} loaded={statsLoaded} />
                </span>
              </div>
              <div
                className={cn(gCard, "flex min-w-[140px] flex-1 flex-col gap-0.5 px-5 py-4 sm:min-w-[160px]")}
                style={gCardShadow}
              >
                <span className="flex items-center gap-1.5 text-xs font-medium text-[#586072]">
                  <Users className="h-4 w-4 text-[#0f8f61]" aria-hidden />
                  OD Gold members
                </span>
                <span className="text-3xl font-medium">
                  <AnimatedStatValue value={stats.members} loaded={statsLoaded} />
                </span>
              </div>
            </div>
            <p className="mt-3 text-xs text-[#80868b]">
              Figures show active partner listings and members with valid OD Gold membership.
            </p>
          </div>

          {/* Human + soft frame (Apple-like rounded media) */}
          <div className="relative mx-auto w-full max-w-[440px] lg:mx-0 lg:max-w-none">
            <div
              className="relative overflow-hidden rounded-[32px] bg-[#eceff5] shadow-[0_35px_90px_-34px_rgba(30,45,101,0.5)] ring-1 ring-[#dfe4f2]"
              style={{ aspectRatio: "4 / 5" }}
            >
              <img
                src="https://images.pexels.com/photos/11792247/pexels-photo-11792247.jpeg?auto=format&fit=crop&w=960&q=80"
                alt="Professional using a phone — representing members and partners connecting through OD Gold Member"
                className="h-full w-full object-cover object-[center_20%]"
                loading="eager"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0f172a]/30 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/30 bg-white/88 px-4 py-3 shadow-xl backdrop-blur-md">
                <p className="text-sm font-semibold text-[#ffffff]">Built for real shops &amp; everyday members</p>
                <p className="mt-0.5 text-xs text-[#ffffff]">Discounts you can use · privileges that feel premium</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTAs — Google card UI (warm yellow band vs page shell) */}
        <section className="-mx-4 mt-16 bg-[linear-gradient(135deg,#fff7dc_0%,#f7d870_42%,#d6a01f_100%)] px-4 py-12 sm:-mx-6 sm:mt-20 sm:px-6 sm:py-14">
          <div className="mx-auto max-w-3xl rounded-[26px] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-xl sm:px-6">
            <h2 className="text-center text-sm font-semibold uppercase tracking-[0.12em] text-[#5a4b2a]">Choose your path</h2>
            <p className="mx-auto mt-2 max-w-2xl text-center text-lg text-[#2c2413]">Join as a member or register your business</p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <article
              className={cn(
                gCard,
                "flex flex-col border-white/45 bg-white/22 p-8 backdrop-blur-xl motion-safe:hover:shadow-[0_1px_3px_0_rgba(60,64,67,.24),0_14px_26px_-14px_rgba(49,39,11,.45)]",
              )}
              style={gCardShadow}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/45 text-[#0f8f61]">
                <Gift className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-6 text-[22px] font-semibold tracking-tight text-[#1f1a10]">New OD Gold member</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#4a4333]">
                Enjoy member discounts and OD privileges at participating shops — one account, consistent benefits.
              </p>
              <Button
                asChild
                className="mt-8 h-12 rounded-full bg-[linear-gradient(90deg,#2b4fc7_0%,#1a73e8_100%)] text-[15px] font-semibold text-white shadow-[0_16px_30px_-18px_rgba(32,77,199,0.75)] hover:brightness-95"
              >
                <Link to="/od/member/signup">
                  Register as member <ArrowRight className="ml-2 h-4 w-4" strokeWidth={2.25} />
                </Link>
              </Button>
            </article>

            <article
              className={cn(
                gCard,
                "flex flex-col border-white/45 bg-white/22 p-8 backdrop-blur-xl motion-safe:hover:shadow-[0_1px_3px_0_rgba(60,64,67,.24),0_14px_26px_-14px_rgba(49,39,11,.45)]",
              )}
              style={gCardShadow}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/40 bg-white/45 text-[#2b4fc7]">
                <Store className="h-6 w-6" aria-hidden />
              </div>
              <h3 className="mt-6 text-[22px] font-semibold tracking-tight text-[#1f1a10]">New OD Privilege Partner</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#4a4333]">
                Boost sales and bring customers back with offers they can trust — tuned for repeat visits, not one-off
                deals.
              </p>
              <Button
                asChild
                variant="outline"
                className="mt-8 h-12 rounded-full border-white/60 bg-white/55 text-[15px] font-semibold text-[#1e46c0] backdrop-blur-md hover:bg-white/68"
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
          <h2 className="text-center text-sm font-semibold uppercase tracking-[0.12em] text-[#636b78]">Coverage</h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-[15px] leading-relaxed text-[#5c6470]">
            See how OD connects members with local businesses — explore the map, then pick your role above.
          </p>
          <div className="mx-auto mt-8 max-w-3xl">
            <Suspense
              fallback={
                <div
                  className="flex h-[min(360px,50vh)] min-h-[240px] items-center justify-center rounded-[28px] border border-[#e5e8f1] bg-[linear-gradient(180deg,#f7f9ff_0%,#f1f4fa_100%)] text-sm text-[#5b6370]"
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
        <section className="mt-16 border-t border-[#e7eaf2] pt-12">
          <h2 className="text-center text-sm font-semibold uppercase tracking-[0.12em] text-[#636b78]">
            Why teams choose OD Gold Member
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
                <item.icon className="h-6 w-6 text-[#2b4fc7]" aria-hidden />
                <h3 className="mt-4 text-base font-semibold text-[#171a22]">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#5c6470]">{item.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e7eaf2] bg-white py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center text-xs text-[#7a818f] sm:flex-row sm:text-left">
          <img src="/odmember.png" alt="" className="h-15 sm:h-12 opacity-50" />
          <p>© {new Date().getFullYear()} OD Gold Member. Professional loyalty for modern businesses.</p>
        </div>
      </footer>
    </div>
  );
};
