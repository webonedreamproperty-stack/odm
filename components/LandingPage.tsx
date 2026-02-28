import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "./ui/button";
import { useAuth } from "./AuthProvider";

// ── Hooks ─────────────────────────────────────────────────────────────────────

const useScrollY = () => {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const h = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setY(window.scrollY));
    };
    window.addEventListener("scroll", h, { passive: true });
    return () => { window.removeEventListener("scroll", h); cancelAnimationFrame(raf); };
  }, []);
  return y;
};

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// Smooth spring-eased fade + slide animation helper
const rise = (on: boolean, delay = 0) => ({
  opacity: on ? 1 : 0,
  transform: on ? "translateY(0px)" : "translateY(40px)",
  transition: `opacity 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms, transform 1s cubic-bezier(0.16,1,0.3,1) ${delay}ms`,
});

// ── Mockup: iPhone with loyalty card ─────────────────────────────────────────
const PhoneMockup: React.FC = () => (
  <div className="relative mx-auto w-full max-w-[270px] select-none drop-shadow-[0_40px_80px_rgba(0,0,0,0.22)]">
    <div className="relative rounded-[3rem] border-[8px] border-[#1d1d1f] bg-[#1d1d1f]">
      <div className="absolute left-1/2 top-3 z-10 h-[22px] w-[100px] -translate-x-1/2 rounded-full bg-[#1d1d1f]" />
      <div className="overflow-hidden rounded-[2.4rem] bg-[#f5f5f7]">
        <div className="flex items-center justify-between px-6 pt-4 pb-1">
          <span className="text-[11px] font-semibold text-[#1d1d1f]">9:41</span>
          <div className="flex items-center gap-1.5">
            <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
              <rect x="0" y="7" width="3" height="4" rx="0.6" fill="#1d1d1f" fillOpacity="0.5"/>
              <rect x="4.5" y="4.5" width="3" height="6.5" rx="0.6" fill="#1d1d1f" fillOpacity="0.5"/>
              <rect x="9" y="2" width="3" height="9" rx="0.6" fill="#1d1d1f" fillOpacity="0.85"/>
              <rect x="13.5" y="0" width="1.5" height="11" rx="0.4" fill="#1d1d1f" fillOpacity="0.2"/>
            </svg>
            <div className="flex h-3 w-6 items-center rounded-[3px] border border-[#1d1d1f]/50 p-[2px]">
              <div className="h-full w-[70%] rounded-[1px] bg-[#1d1d1f]/80" />
              <div className="ml-[1px] h-[5px] w-[2px] rounded-r-[1px] bg-[#1d1d1f]/30" />
            </div>
          </div>
        </div>
        <div className="mx-3 mt-2 overflow-hidden rounded-2xl shadow-lg">
          <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-rose-500 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-white/60">LOYALTY CARD</p>
                <p className="mt-0.5 text-[15px] font-bold leading-tight text-white">The Daily Brew</p>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/25">
                <div className="h-5 w-5 rounded-full bg-white/70" />
              </div>
            </div>
            <div className="mt-5 grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={`aspect-square rounded-full border-[1.5px] flex items-center justify-center ${i < 7 ? "border-white bg-white" : "border-white/40 bg-white/10"}`}>
                  {i < 7 && <div className="h-2 w-2 rounded-full bg-orange-400/80" />}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between">
              <p className="text-[9px] font-semibold text-white/80">7 / 10 stamps</p>
              <p className="text-[9px] font-semibold text-white/80">3 to go ✦</p>
            </div>
          </div>
        </div>
        <div className="mx-3 mt-2 flex items-center justify-between rounded-xl bg-white px-4 py-3 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold text-[#1d1d1f]">Scan to stamp</p>
            <p className="text-[8px] text-[#6e6e73]">Show this to staff</p>
          </div>
          <div className="h-8 w-8 rounded-lg bg-[#f5f5f7] flex items-center justify-center">
            <div className="grid grid-cols-3 gap-[2px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={`h-[3.5px] w-[3.5px] rounded-[0.5px] bg-[#1d1d1f] ${i === 4 ? "opacity-0" : ""}`} />
              ))}
            </div>
          </div>
        </div>
        <div className="mx-3 mt-2 mb-5 rounded-xl border border-black/[0.06] bg-white px-4 py-3">
          <p className="text-[8px] font-bold uppercase tracking-widest text-[#6e6e73]">Recent Stamps</p>
          <div className="mt-2 space-y-1.5">
            {[{ l: "+1 stamp", t: "Today, 10:24 AM" }, { l: "+1 stamp", t: "Yesterday, 3:15 PM" }, { l: "+1 stamp", t: "Feb 22, 9:00 AM" }].map(item => (
              <div key={item.t} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                  <p className="text-[8px] font-medium text-[#1d1d1f]">{item.l}</p>
                </div>
                <p className="text-[7px] text-[#6e6e73]">{item.t}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Mockup: Analytics dashboard ───────────────────────────────────────────────
const AnalyticsMockup: React.FC = () => (
  <div className="select-none overflow-hidden rounded-2xl border border-black/[0.08] shadow-[0_24px_72px_-12px_rgba(0,0,0,0.14)]">
    <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-[#e4e4e4] px-4 py-2.5">
      <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <div className="h-3 w-3 rounded-full bg-[#28c840]" />
      <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1">
        <p className="text-[9px] text-[#6e6e73]">app.cookees.co/analytics</p>
      </div>
    </div>
    <div className="flex bg-[#f8f8f8]">
      <div className="flex w-10 flex-col items-center gap-3 border-r border-black/[0.06] bg-white py-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`h-5 w-5 rounded-lg ${i === 2 ? "bg-[#1d1d1f]" : "bg-[#1d1d1f]/10"}`} />
        ))}
      </div>
      <div className="flex-1 p-4">
        <p className="text-sm font-semibold text-[#1d1d1f]">Analytics</p>
        <p className="text-[9px] text-[#6e6e73]">Feb 12 – Feb 25 · 14 days</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[{ l: "Customers", v: "142" }, { l: "Active Cards", v: "89" }, { l: "Redemption", v: "68%" }].map(s => (
            <div key={s.l} className="rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-sm">
              <p className="text-[8px] text-[#6e6e73]">{s.l}</p>
              <p className="mt-0.5 text-base font-semibold text-[#1d1d1f]">{s.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm">
          <p className="text-[9px] font-semibold text-[#1d1d1f]">Activity Over Time</p>
          <div className="mt-2 flex h-20 items-end gap-[3px]">
            {[28,45,22,60,38,75,52,65,42,80,58,90,70,85].map((h, i) => (
              <div key={i} className="flex-1 rounded-t-[2px]" style={{ height: `${h}%`, background: i === 13 ? "#1d1d1f" : `rgba(29,29,31,${0.07 + (h/100)*0.18})` }} />
            ))}
          </div>
          <div className="mt-1.5 flex justify-between text-[8px] text-[#6e6e73]">
            <span>Feb 12</span><span>Feb 25</span>
          </div>
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-black/[0.06] bg-white p-3 shadow-sm">
          <p className="text-[9px] font-semibold text-[#1d1d1f]">Campaign Performance</p>
          <div className="mt-2 space-y-2.5">
            {[{ n: "Summer Treats", p: 68 }, { n: "Morning Rush", p: 42 }].map(c => (
              <div key={c.n}>
                <div className="flex justify-between text-[9px]">
                  <span className="text-[#1d1d1f]/70">{c.n}</span>
                  <span className="font-semibold text-[#1d1d1f]">{c.p}%</span>
                </div>
                <div className="mt-1 h-[5px] overflow-hidden rounded-full bg-[#1d1d1f]/[0.07]">
                  <div className="h-full rounded-full bg-[#1d1d1f]/60" style={{ width: `${c.p}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ── Mockup: Customers directory ───────────────────────────────────────────────
const CustomersMockup: React.FC = () => {
  const rows = [
    { i: "ES", n: "Emma S.", e: "emma@example.com", c: 3, col: "bg-blue-100 text-blue-600" },
    { i: "LW", n: "Liam W.", e: "liam@example.com", c: 1, col: "bg-emerald-100 text-emerald-600" },
    { i: "AM", n: "Ava M.", e: "ava@example.com", c: 2, col: "bg-violet-100 text-violet-600" },
    { i: "NT", n: "Noah T.", e: "noah@example.com", c: 1, col: "bg-amber-100 text-amber-600" },
    { i: "SL", n: "Sophia L.", e: "sophia@example.com", c: 2, col: "bg-rose-100 text-rose-600" },
  ];
  return (
    <div className="select-none overflow-hidden rounded-2xl border border-black/[0.08] shadow-[0_24px_72px_-12px_rgba(0,0,0,0.14)]">
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-[#e4e4e4] px-4 py-2.5">
        <div className="h-3 w-3 rounded-full bg-[#ff5f57]" />
        <div className="h-3 w-3 rounded-full bg-[#febc2e]" />
        <div className="h-3 w-3 rounded-full bg-[#28c840]" />
        <div className="ml-3 flex-1 rounded-md bg-white/80 px-3 py-1">
          <p className="text-[9px] text-[#6e6e73]">app.cookees.co/customers</p>
        </div>
      </div>
      <div className="flex bg-[#f8f8f8]">
        <div className="flex w-10 flex-col items-center gap-3 border-r border-black/[0.06] bg-white py-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`h-5 w-5 rounded-lg ${i === 3 ? "bg-[#1d1d1f]" : "bg-[#1d1d1f]/10"}`} />
          ))}
        </div>
        <div className="flex-1 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#1d1d1f]">Customers</p>
              <p className="text-[9px] text-[#6e6e73]">142 contacts</p>
            </div>
            <div className="rounded-full bg-[#1d1d1f] px-3 py-1">
              <p className="text-[9px] font-semibold text-white">+ Add</p>
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-black/[0.06] bg-white px-2.5 py-2 shadow-sm">
            <div className="h-3 w-3 rounded-full border-[1.5px] border-[#6e6e73]/40" />
            <p className="text-[9px] text-[#6e6e73]/60">Search customers...</p>
          </div>
          <div className="mt-2.5 overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-sm">
            <div className="grid grid-cols-[1fr_1.8fr_0.4fr] border-b border-black/[0.05] bg-[#f5f5f7] px-3 py-2 text-[8px] font-semibold uppercase tracking-widest text-[#6e6e73]">
              <span>Name</span><span>Contact</span><span className="text-right">Cards</span>
            </div>
            {rows.map((row, i) => (
              <div key={row.n} className={`grid grid-cols-[1fr_1.8fr_0.4fr] items-center px-3 py-2 ${i < rows.length - 1 ? "border-b border-black/[0.04]" : ""}`}>
                <div className="flex items-center gap-1.5">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-[7px] font-bold ${row.col}`}>{row.i}</div>
                  <span className="text-[9px] font-medium text-[#1d1d1f]">{row.n}</span>
                </div>
                <span className="text-[8px] text-[#6e6e73]">{row.e}</span>
                <span className="text-right text-[9px] font-semibold text-[#1d1d1f]">{row.c}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── Label badge ───────────────────────────────────────────────────────────────
const SectionLabel: React.FC<{ children: React.ReactNode; light?: boolean }> = ({ children, light }) => (
  <p className={`text-xs font-semibold uppercase tracking-[0.2em] ${light ? "text-white/40" : "text-[#6e6e73]"}`}>
    {children}
  </p>
);

// ── Landing Page ──────────────────────────────────────────────────────────────
export const LandingPage: React.FC = () => {
  const { currentUser, isStaff } = useAuth();
  const scrollY = useScrollY();
  const dashboardPath = isStaff ? "/issued-cards" : "/dashboard";

  const hero       = useInView(0.05);
  const simplicity = useInView(0.18);
  const design     = useInView(0.15);
  const experience = useInView(0.18);
  const intel      = useInView(0.15);
  const trust      = useInView(0.18);
  const value      = useInView(0.15);
  const cta        = useInView(0.18);

  return (
    <div className="text-[#1d1d1f] antialiased">

      {/* Keyframe animations */}
      <style>{`
        @keyframes blob-drift-a { 0%,100%{transform:translateY(0px) scale(1)} 55%{transform:translateY(-28px) scale(1.03)} }
        @keyframes blob-drift-b { 0%,100%{transform:translateY(0px) scale(1)} 50%{transform:translateY(22px) scale(0.97)} }
        @keyframes blob-drift-c { 0%,100%{transform:translateY(0px)} 60%{transform:translateY(-18px)} }
        @keyframes scroll-pulse { 0%,100%{opacity:0.6;transform:translateY(0)} 50%{opacity:1;transform:translateY(6px)} }
        .drift-a { animation: blob-drift-a 10s ease-in-out infinite; }
        .drift-b { animation: blob-drift-b 13s ease-in-out infinite 2s; }
        .drift-c { animation: blob-drift-c 9s ease-in-out infinite 4s; }
        .scroll-cue { animation: scroll-pulse 2.2s ease-in-out infinite; }
      `}</style>

      {/* ── Sticky Nav ── */}
      <header className="fixed top-0 z-50 w-full border-b border-black/[0.06] bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <img src="/stampee.svg" alt="Cookees" className="h-8 w-auto" />
          <nav className="flex items-center gap-1.5 sm:gap-2">
            {currentUser ? (
              <Button asChild className="rounded-full bg-[#1d1d1f] px-4 text-sm font-medium text-white hover:bg-black/80 sm:px-5">
                <Link to={dashboardPath}>Go to Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" className="hidden rounded-full text-sm font-medium text-[#1d1d1f] hover:bg-black/[0.06] sm:inline-flex">
                  <Link to="/login">Log in</Link>
                </Button>
                <Button asChild className="rounded-full bg-[#1d1d1f] px-4 text-sm font-medium text-white hover:bg-black/80 sm:px-5">
                  <Link to="/signup">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 1 · HERO                                                       */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#fafafa]">
        {/* Parallax warm glow */}
        <div className="pointer-events-none absolute inset-0">
          <div
            className="drift-a absolute right-[-10%] top-[-10%] h-[700px] w-[700px] rounded-full bg-amber-200/50 blur-[120px]"
            style={{ transform: `translateY(${scrollY * 0.18}px)` }}
          />
          <div
            className="drift-b absolute left-[-15%] bottom-[-10%] h-[500px] w-[500px] rounded-full bg-orange-100/60 blur-[100px]"
            style={{ transform: `translateY(${scrollY * -0.1}px)` }}
          />
          <div className="drift-c absolute left-[40%] top-[20%] h-[300px] w-[300px] rounded-full bg-rose-100/30 blur-[80px]" />
        </div>

        {/* Content */}
        <div ref={hero.ref} className="relative mx-auto grid min-h-[100svh] max-w-5xl grid-cols-1 items-center gap-12 px-6 pb-16 pt-28 lg:grid-cols-2 lg:pb-20">
          <div>
            <div style={rise(hero.visible, 0)}>
              <span className="mb-6 inline-flex items-center rounded-full border border-black/[0.08] bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-[#6e6e73] backdrop-blur-sm shadow-sm">
                Digital Loyalty Platform
              </span>
            </div>
            <h1
              style={rise(hero.visible, 80)}
              className="text-[clamp(2.6rem,7vw,5.2rem)] font-semibold leading-[1.04] tracking-tight text-[#1d1d1f]"
            >
              Loyalty,<br />beautifully<br />reimagined.
            </h1>
            <p style={rise(hero.visible, 180)} className="mt-6 max-w-md text-xl leading-relaxed text-[#6e6e73]">
              A digital stamp card designed for modern businesses.
              No apps. No paper. No friction.
            </p>
            <div style={rise(hero.visible, 280)} className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild className="h-12 rounded-full bg-[#1d1d1f] px-8 text-base font-medium text-white shadow-lg shadow-black/20 hover:bg-black/80">
                <Link to="/signup">Create Your Card</Link>
              </Button>
              <Button asChild variant="ghost" className="h-12 rounded-full px-6 text-base font-medium text-[#1d1d1f] hover:bg-black/[0.06]">
                <a href="#simplicity" className="flex items-center gap-1.5">
                  Learn More <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          {/* Phone mockup with parallax float */}
          <div
            style={{ ...rise(hero.visible, 100), transform: `translateY(${-scrollY * 0.06}px)` }}
            className="flex justify-center lg:justify-end"
          >
            <div className="rotate-[3deg]">
              <PhoneMockup />
            </div>
          </div>
        </div>

        {/* Scroll cue */}
        <div
          className="scroll-cue absolute bottom-8 left-1/2 -translate-x-1/2"
          style={{ opacity: Math.max(0, 1 - scrollY / 120) }}
        >
          <ChevronDown className="h-5 w-5 text-[#6e6e73]" />
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 2 · SIMPLICITY                                                 */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section id="simplicity" className="relative min-h-[100svh] overflow-hidden bg-white">
        {/* Radial center glow */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="drift-b h-[600px] w-[600px] rounded-full bg-slate-100/80 blur-[120px]" />
        </div>
        <div ref={simplicity.ref} className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-20 text-center">
          <div style={rise(simplicity.visible, 0)}>
            <SectionLabel>Simplicity</SectionLabel>
          </div>
          <h2 style={rise(simplicity.visible, 80)} className="mt-5 text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-tight tracking-tight text-[#1d1d1f]">
            It just works.
          </h2>
          <div className="mx-auto mt-16 max-w-xs space-y-6">
            {["Customers scan.", "You tap.", "Rewards unlock."].map((line, i) => (
              <p key={line} style={rise(simplicity.visible, 200 + i * 100)} className="text-[clamp(1.6rem,4vw,2.2rem)] font-light text-[#1d1d1f]">
                {line}
              </p>
            ))}
          </div>
          <p style={rise(simplicity.visible, 550)} className="mt-12 text-xl font-medium text-[#6e6e73]">
            That's it.
          </p>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 3 · DESIGN — Customers mockup                                  */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#f5f5f7]">
        <div className="pointer-events-none absolute inset-0">
          <div className="drift-a absolute -left-32 top-1/4 h-[500px] w-[500px] rounded-full bg-blue-100/50 blur-[100px]" />
          <div className="drift-c absolute -right-32 bottom-1/4 h-[400px] w-[400px] rounded-full bg-violet-100/40 blur-[80px]" />
        </div>
        <div ref={design.ref} className="relative mx-auto grid min-h-[100svh] max-w-5xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2">
          <div style={rise(design.visible, 0)} className="order-2 lg:order-1">
            <CustomersMockup />
          </div>
          <div className="order-1 lg:order-2">
            <div style={rise(design.visible, 60)}><SectionLabel>Design</SectionLabel></div>
            <h2 style={rise(design.visible, 140)} className="mt-5 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-[#1d1d1f]">
              Designed to feel premium.
            </h2>
            <p style={rise(design.visible, 220)} className="mt-6 text-xl leading-relaxed text-[#1d1d1f]">
              Your logo.<br />Your colors.<br />Your brand — elevated.
            </p>
            <div style={rise(design.visible, 300)} className="mt-6 space-y-2 text-base text-[#6e6e73]">
              <p>Minimal interface.</p>
              <p>Fast performance.</p>
              <p>Seamless on iPhone and Android.</p>
            </div>
            <p style={rise(design.visible, 380)} className="mt-6 text-base font-medium text-[#1d1d1f]">
              Because loyalty should feel effortless.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 4 · EXPERIENCE                                                 */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="drift-b absolute -right-24 top-1/3 h-[450px] w-[450px] rounded-full bg-teal-100/40 blur-[90px]" />
          <div className="drift-a absolute -left-24 bottom-1/4 h-[350px] w-[350px] rounded-full bg-emerald-50/60 blur-[80px]" />
        </div>
        <div ref={experience.ref} className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-20 text-center">
          <div style={rise(experience.visible, 0)}><SectionLabel>Experience</SectionLabel></div>
          <h2 style={rise(experience.visible, 80)} className="mt-5 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-tight tracking-tight text-[#1d1d1f]">
            Always with your customer.
          </h2>
          <div style={rise(experience.visible, 200)} className="mx-auto mt-14 grid max-w-2xl gap-10 text-left sm:grid-cols-2">
            <div className="space-y-4">
              {["No more lost cards.", "No more faded ink.", "No more printing."].map(l => (
                <p key={l} className="text-lg text-[#1d1d1f]">{l}</p>
              ))}
            </div>
            <div className="space-y-4">
              {["A simple link.", "A QR code.", "One tap to stamp."].map(l => (
                <p key={l} className="text-lg text-[#1d1d1f]">{l}</p>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 5 · INTELLIGENCE — Analytics mockup                            */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-gradient-to-br from-[#eff4ff] via-[#f5f5f7] to-[#f0f0f5]">
        <div className="pointer-events-none absolute inset-0">
          <div className="drift-a absolute right-[-5%] top-[-5%] h-[500px] w-[500px] rounded-full bg-sky-200/40 blur-[100px]" />
          <div className="drift-c absolute left-[-5%] bottom-0 h-[400px] w-[400px] rounded-full bg-indigo-100/40 blur-[90px]" />
        </div>
        <div ref={intel.ref} className="relative mx-auto grid min-h-[100svh] max-w-5xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2">
          <div>
            <div style={rise(intel.visible, 0)}><SectionLabel>Intelligence</SectionLabel></div>
            <h2 style={rise(intel.visible, 80)} className="mt-5 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-[#1d1d1f]">
              See what matters.
            </h2>
            <div style={rise(intel.visible, 180)} className="mt-8 space-y-4">
              {["Track visits.", "Measure retention.", "Understand growth."].map(l => (
                <p key={l} className="text-lg text-[#1d1d1f]">{l}</p>
              ))}
              <p className="mt-4 text-base font-medium text-[#1d1d1f]">
                Real insights — without complexity.
              </p>
            </div>
          </div>
          <div style={rise(intel.visible, 60)}>
            <AnalyticsMockup />
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 6 · TRUST                                                      */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="drift-b absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-100/70 blur-[120px]" />
        </div>
        <div ref={trust.ref} className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-20 text-center">
          <div style={rise(trust.visible, 0)}><SectionLabel>Trust</SectionLabel></div>
          <h2 style={rise(trust.visible, 80)} className="mt-5 text-[clamp(2.25rem,6vw,4rem)] font-semibold leading-tight tracking-tight text-[#1d1d1f]">
            Secure by design.
          </h2>
          <div className="mx-auto mt-12 max-w-sm space-y-4">
            {[
              ["Each stamp is validated.", 200],
              ["Protected from abuse.", 300],
              ["Built for real businesses.", 400],
            ].map(([l, d]) => (
              <p key={String(l)} style={rise(trust.visible, Number(d))} className="text-xl text-[#1d1d1f]">
                {l}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 7 · VALUE                                                      */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#fffbf5]">
        <div className="pointer-events-none absolute inset-0">
          <div className="drift-a absolute right-0 top-0 h-[500px] w-[500px] translate-x-1/4 -translate-y-1/4 rounded-full bg-amber-200/40 blur-[100px]" />
          <div className="drift-b absolute left-0 bottom-0 h-[400px] w-[400px] -translate-x-1/4 translate-y-1/4 rounded-full bg-orange-100/50 blur-[90px]" />
        </div>
        <div ref={value.ref} className="relative mx-auto grid min-h-[100svh] max-w-5xl grid-cols-1 items-center gap-16 px-6 py-20 lg:grid-cols-2 lg:items-center">
          <div>
            <div style={rise(value.visible, 0)}><SectionLabel>Value</SectionLabel></div>
            <h2 style={rise(value.visible, 80)} className="mt-5 text-[clamp(2rem,5vw,3.5rem)] font-semibold leading-tight tracking-tight text-[#1d1d1f]">
              Stop paying for paper.
            </h2>
          </div>
          <div className="space-y-4">
            {[
              ["Eliminate printing costs.", 100],
              ["Reduce operational friction.", 200],
              ["Increase repeat visits.", 300],
            ].map(([l, d]) => (
              <p key={String(l)} style={rise(value.visible, Number(d))} className="text-xl text-[#1d1d1f]">
                {l}
              </p>
            ))}
            <p style={rise(value.visible, 400)} className="mt-4 text-base font-medium text-[#1d1d1f]">
              A smarter loyalty system — built to last.
            </p>
          </div>
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────────────── */}
      {/* SECTION 8 · CTA                                                        */}
      {/* ─────────────────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[100svh] overflow-hidden bg-[#1d1d1f]">
        <div className="pointer-events-none absolute inset-0">
          <div className="drift-c absolute left-1/2 top-1/2 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-600/10 blur-[140px]" />
          <div className="drift-a absolute right-[-5%] bottom-[-5%] h-[400px] w-[400px] rounded-full bg-orange-500/8 blur-[100px]" />
        </div>
        <div ref={cta.ref} className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 py-20 text-center">
          <div style={rise(cta.visible, 0)}><SectionLabel light>Get started</SectionLabel></div>
          <h2 style={rise(cta.visible, 80)} className="mt-5 text-[clamp(2.5rem,7vw,5rem)] font-semibold leading-tight tracking-tight text-white">
            Turn moments<br />into loyalty.
          </h2>
          <p style={rise(cta.visible, 180)} className="mx-auto mt-6 max-w-sm text-xl leading-relaxed text-white/50">
            Create your digital stamp card today.
          </p>
          <div style={rise(cta.visible, 280)}>
            <Button asChild className="mt-10 h-14 rounded-full bg-white px-12 text-base font-semibold text-[#1d1d1f] shadow-xl shadow-white/10 hover:bg-white/90">
              <Link to="/signup">Start Free</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.07] bg-[#1d1d1f] px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <img src="/stampee.svg" alt="Cookees" className="h-7 w-auto opacity-35 invert" />
          <p className="text-xs text-white/25">© {new Date().getFullYear()} Cookees. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
};
