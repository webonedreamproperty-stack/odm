import React from "react";
import { Sparkles, Stamp, Wand2 } from "lucide-react";
import { cn } from "../lib/utils";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, badge, children }) => {
  return (
    <div className="min-h-screen bg-[#f7f5ff] text-slate-900 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -right-32 h-80 w-80 rounded-full bg-gradient-to-br from-lime-300 via-amber-300 to-orange-400 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute top-1/3 -left-40 h-96 w-96 rounded-full bg-gradient-to-br from-cyan-300 via-sky-200 to-indigo-300 blur-3xl opacity-60" />
      <div className="pointer-events-none absolute bottom-[-10rem] right-[10%] h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-200 via-pink-200 to-rose-300 blur-3xl opacity-60" />

      <div className="relative mx-auto max-w-6xl px-6 py-14 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div className="space-y-8">
          <div className="inline-flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-sm border border-white">
            <img src="/stampverse-logo.svg" alt="Stampverse" className="h-8 w-auto" />
            <span className="font-display text-lg font-semibold">Stampverse</span>
          </div>

          {badge && (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-3 py-1 text-xs uppercase tracking-[0.2em] shadow-lg">
              <Sparkles size={14} /> {badge}
            </div>
          )}

          <div className="space-y-3">
            <h1 className="font-display text-4xl md:text-5xl leading-tight">
              {title}
            </h1>
            <p className="text-lg text-slate-600 max-w-xl">{subtitle}</p>
          </div>

          <div className="flex flex-wrap gap-3">
            {[
              { icon: Stamp, label: "Playful loyalty vibes" },
              { icon: Wand2, label: "Launch in minutes" },
              { icon: Sparkles, label: "Make every visit magical" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-full bg-white/80 px-3 py-1.5 text-sm text-slate-700 shadow-sm border border-white"
              >
                <item.icon size={14} className="text-slate-700" />
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-md">
            {[
              { label: "Cards issued", value: "12k+" },
              { label: "Reward smiles", value: "98%" },
              { label: "Avg. visits", value: "+24%" },
              { label: "Campaigns", value: "36" },
            ].map((item, index) => (
              <div
                key={item.label}
                className={cn(
                  "rounded-2xl bg-white/80 px-4 py-3 shadow-md border border-white",
                  index % 2 === 0 ? "rotate-[-1deg]" : "rotate-[1deg]"
                )}
              >
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {item.label}
                </div>
                <div className="text-2xl font-display font-semibold text-slate-900">
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-white/40 blur-2xl" />
          <div className="relative rounded-[2.5rem] border border-white bg-white/80 backdrop-blur-xl p-8 shadow-2xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
