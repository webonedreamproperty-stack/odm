import React from "react";
import { CirclePlay, QrCode, Sparkles, WalletCards } from "lucide-react";
import { Link } from "react-router-dom";

interface AuthSplitLayoutProps {
  title: string;
  subtitle: string;
  badge?: string;
  mode: "login" | "signup";
  titleClassName?: string;
  children: React.ReactNode;
}

const MODE_CONFIG = {
  login: {
    panelBg: "bg-[#d1a53a]",
    navLinkLabel: "Create account",
    navLinkTo: "/signup",
    heroHandle: "/yourbrand",
    heroTitle: "Cards that live in the browser",
    stats: [
      { label: "Repeat visits", value: "+24%" },
      { label: "Downloads", value: "0" },
    ],
  },
  signup: {
    panelBg: "bg-[#c39d34]",
    navLinkLabel: "Log in",
    navLinkTo: "/login",
    heroHandle: "/stampee",
    heroTitle: "Launch digital loyalty in minutes",
    stats: [
      { label: "Setup time", value: "3 min" },
      { label: "Staff ready", value: "Same day" },
    ],
  },
} as const;

const ShowcasePanel: React.FC<{
  panelBg: string;
  heroHandle: string;
  heroTitle: string;
  stats: { label: string; value: string }[];
}> = ({ panelBg, heroHandle, heroTitle, stats }) => (
  <aside className={`relative hidden h-[100dvh] overflow-hidden lg:block ${panelBg}`}>
    <div className="absolute inset-0">
      <div className="absolute right-[-7%] top-[-2%] h-[280px] w-[280px] rounded-full border-[18px] border-[#173229]/70" />
      <div className="absolute left-[18%] top-[18%] h-56 w-56 rounded-full bg-white/10 blur-3xl" />
      <div className="absolute bottom-[10%] right-[8%] h-72 w-72 rounded-full bg-[#6e3f16]/15 blur-3xl" />
    </div>

    <div className="relative flex h-full items-center justify-center px-8 py-8">
      <div className="relative h-[min(74vh,760px)] w-full max-w-[760px]">
        <div className="absolute left-[3%] top-[12%] h-[min(24vh,250px)] w-[min(58%,440px)] rounded-[2.3rem] bg-[#857d52] p-7 text-[#dff021] shadow-[0_30px_90px_-34px_rgba(41,45,18,0.52)]">
          <div className="flex h-full flex-col justify-between">
            <div className="flex items-start justify-between gap-6">
              <div className="flex-1">
                <div className="grid grid-cols-6 gap-2 opacity-45">
                  {Array.from({ length: 18 }).map((_, index) => (
                    <div key={index} className="h-14 rounded-full bg-white/45" />
                  ))}
                </div>
              </div>
              <div className="w-[150px] text-right">
                <p className="text-4xl font-semibold tracking-tight xl:text-5xl">43,500</p>
                <p className="mt-2 text-base font-medium text-[#e8f56e]/80 xl:text-lg">Clicks</p>
              </div>
            </div>
            <p className="max-w-[17rem] text-xs leading-6 text-[#eef7a5]/80 xl:text-sm">{heroTitle}</p>
          </div>
        </div>

        <div className="absolute left-[54%] top-[12%] flex h-[min(24vh,250px)] w-[min(29%,220px)] flex-col justify-between rounded-[2.2rem] bg-[#d8b2d9] p-7 text-[#132899] shadow-[0_24px_64px_-32px_rgba(71,38,77,0.45)]">
          <WalletCards className="h-10 w-10" strokeWidth={1.75} />
          <div>
            <p className="text-4xl font-semibold tracking-tight xl:text-5xl">{stats[0].value}</p>
            <p className="mt-2 text-base font-semibold xl:text-lg">{stats[0].label}</p>
          </div>
        </div>

        <div className="absolute left-[12%] top-[30%] h-[min(27vh,270px)] w-[min(43%,320px)] rotate-[5deg] rounded-[2.6rem] bg-[linear-gradient(180deg,#d626e2_0%,#b91ede_100%)] p-6 text-white shadow-[0_28px_80px_-36px_rgba(140,24,163,0.68)]">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-full bg-[#f7c280]" />
              <div className="space-y-3 pt-2">
                <div className="h-3.5 w-20 rounded-full bg-white/30" />
                <div className="h-3.5 w-16 rounded-full bg-white/20" />
              </div>
            </div>
            <Sparkles className="h-9 w-9 text-white/90" strokeWidth={1.75} />
          </div>
          <div className="mt-10 inline-flex items-center gap-3 rounded-full bg-white px-5 py-3 text-[#161616] shadow-sm">
            <QrCode className="h-5 w-5" />
            <span className="text-[1.55rem] font-medium tracking-tight xl:text-[1.9rem]">{heroHandle}</span>
          </div>
        </div>

        <div className="absolute left-[45%] top-[14%] z-[-1] h-[min(52vh,520px)] w-[min(48%,360px)] rounded-[3rem] bg-[linear-gradient(180deg,#8d5325_0%,#d59a67_54%,#c88c58_100%)] opacity-90 shadow-[0_28px_80px_-36px_rgba(83,42,14,0.6)]" />

        <div className="absolute left-[25%] top-[42%] flex h-[min(12vh,128px)] w-[min(56%,420px)] items-center justify-between rounded-[2.2rem] bg-white/55 px-8 text-[#332f28] shadow-[0_18px_60px_-38px_rgba(0,0,0,0.45)] backdrop-blur-sm">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-[#5c564d]/70 xl:text-sm">Browser card</p>
            <p className="mt-2 text-[1.45rem] font-semibold tracking-tight xl:text-[2rem]">No downloads needed</p>
          </div>
          <p className="text-lg font-semibold xl:text-xl">{stats[1].value}</p>
        </div>

        <div className="absolute left-[10%] top-[63%] flex gap-4">
          {["X", "YT", "TT"].map((label) => (
            <div
              key={label}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-[#17203a] text-xl font-semibold text-white shadow-[0_20px_50px_-28px_rgba(12,17,36,0.6)] xl:h-24 xl:w-24 xl:text-2xl"
            >
              {label}
            </div>
          ))}
        </div>

        <div className="absolute left-[56%] top-[66%] h-[min(26vh,260px)] w-[min(38%,290px)] overflow-hidden rounded-[2.7rem] bg-[linear-gradient(180deg,#f2b46f_0%,#d38e5d_100%)] shadow-[0_28px_80px_-34px_rgba(101,52,23,0.45)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#ffffff33,transparent_48%)]" />
          <div className="absolute bottom-5 left-5 flex h-20 w-20 items-center justify-center rounded-full bg-white/85 text-[#111827] shadow-lg xl:h-24 xl:w-24">
            <CirclePlay className="h-9 w-9 fill-current xl:h-10 xl:w-10" />
          </div>
        </div>
      </div>
    </div>
  </aside>
);

export const AuthSplitLayout: React.FC<AuthSplitLayoutProps> = ({
  title,
  subtitle,
  badge,
  mode,
  titleClassName,
  children,
}) => {
  const config = MODE_CONFIG[mode];

  return (
    <div className="min-h-[100dvh] overflow-hidden bg-[#ecebe6] text-[#111111] antialiased">
      <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[0.96fr_1.04fr]">
        <section className="relative flex min-h-[100dvh] flex-col overflow-hidden bg-[#ecebe6]">
          <header className="flex items-center justify-between px-6 py-5 sm:px-9 sm:py-6">
            <Link to="/" className="inline-flex items-center">
              <img src="/stampee.svg" alt="Stampee" className="h-10 w-auto" />
            </Link>
            <Link
              to={config.navLinkTo}
              className="rounded-full border border-black/[0.08] bg-white/70 px-5 py-2.5 text-sm font-medium text-[#111111] transition-colors hover:bg-white"
            >
              {config.navLinkLabel}
            </Link>
          </header>

          <div className="flex flex-1 items-center justify-center px-6 py-6 sm:px-9 sm:py-8">
            <div className="w-full max-w-[640px]">
              <div className="mx-auto max-w-[560px]">
                {badge && (
                  <p className="text-center text-[11px] font-semibold uppercase tracking-[0.24em] text-[#6f7066]">
                    {badge}
                  </p>
                )}
                <h1 className={`mt-2 text-center text-[clamp(2.2rem,4.4vw,3.9rem)] font-semibold leading-[0.98] tracking-tight text-[#050505] ${titleClassName ?? ""}`}>
                  {title}
                </h1>
                <p className="mx-auto mt-3 max-w-[34rem] text-center text-base leading-relaxed text-[#6b6b63] sm:text-lg">
                  {subtitle}
                </p>

                <div className="mx-auto mt-8 max-w-[580px]">{children}</div>
              </div>
            </div>
          </div>
        </section>

        <ShowcasePanel
          panelBg={config.panelBg}
          heroHandle={config.heroHandle}
          heroTitle={config.heroTitle}
          stats={config.stats}
        />
      </div>
    </div>
  );
};
