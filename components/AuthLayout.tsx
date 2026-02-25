import React from "react";
import { cn } from "../lib/utils";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  badge?: string;
  theme?: "login" | "signup" | "staff";
  children: React.ReactNode;
}

const THEME_STYLES: Record<NonNullable<AuthLayoutProps["theme"]>, { blobA: string; blobB: string }> = {
  login: {
    blobA: "bg-amber-300/45",
    blobB: "bg-sky-300/40",
  },
  signup: {
    blobA: "bg-teal-300/45",
    blobB: "bg-orange-300/40",
  },
  staff: {
    blobA: "bg-cyan-300/45",
    blobB: "bg-lime-300/35",
  },
};

const METRICS_BY_THEME: Record<NonNullable<AuthLayoutProps["theme"]>, Array<{ label: string; value: string }>> = {
  login: [
    { label: "Cards issued", value: "12k+" },
    { label: "Repeat visits", value: "+24%" },
  ],
  signup: [
    { label: "Setup time", value: "3 min" },
    { label: "Staff onboarded", value: "5k+" },
  ],
  staff: [
    { label: "Scans completed", value: "30k+" },
    { label: "Avg issue speed", value: "12 sec" },
  ],
};

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, badge, theme = "login", children }) => {
  const themeStyles = THEME_STYLES[theme];
  const metrics = METRICS_BY_THEME[theme];
  const blendLogoWithBackground = theme === "login" || theme === "signup";

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#f8faf8] text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className={`absolute -left-24 -top-32 h-[26rem] w-[26rem] rounded-full blur-3xl ${themeStyles.blobA}`} />
        <div className={`absolute -bottom-36 -right-16 h-[28rem] w-[28rem] rounded-full blur-3xl ${themeStyles.blobB}`} />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(15, 23, 42, 0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(15, 23, 42, 0.07) 1px, transparent 1px)",
            backgroundSize: "42px 42px",
            maskImage: "radial-gradient(circle at center, black 35%, transparent 95%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-10 md:px-10 md:py-14 lg:grid-cols-[1.12fr_0.88fr]">
        <section className="max-w-2xl space-y-8 md:space-y-10">
          <div
            className={cn(
              "inline-flex items-center",
              blendLogoWithBackground
                ? "px-1 py-1"
                : "rounded-xl border border-white/70 bg-white/85 px-4 py-3 shadow-panel backdrop-blur-xl"
            )}
          >
            <img
              src="/stampee.svg"
              alt="Stampee logo"
              className={cn(
                "h-11 w-auto",
                blendLogoWithBackground && "opacity-75 mix-blend-multiply saturate-[0.9] contrast-[0.9]"
              )}
            />
          </div>

          {badge && (
            <div
              className={cn(
                "inline-flex items-center rounded-full border border-white/75 bg-white/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 shadow-subtle backdrop-blur-xl",
                theme === "login" && "-mt-2"
              )}
            >
              {badge}
            </div>
          )}

          <div className="space-y-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-slate-900 md:text-6xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600 md:text-lg">
              {subtitle}
            </p>
          </div>

          <div className="grid max-w-xl gap-4 sm:grid-cols-2 md:gap-5">
            {metrics.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/70 bg-white/75 px-5 py-4 shadow-subtle backdrop-blur-xl"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="max-w-xl rounded-2xl border border-white/75 bg-white/70 px-5 py-4 shadow-subtle backdrop-blur-xl">
            <p className="text-sm text-slate-700">
              Built for coffee shops, bakeries, and local stores that want faster rewards without paper cards.
            </p>
          </div>
        </section>

        <section className="w-full lg:justify-self-end lg:max-w-xl">
          <div className="rounded-[1.75rem] border border-white/75 bg-white/85 p-7 shadow-panel backdrop-blur-xl md:p-10">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
};
