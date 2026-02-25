import React from "react";

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  badge?: string;
  children: React.ReactNode;
}

const METRICS = [
  { label: "Cards issued", value: "12k+" },
  { label: "Avg. repeat visits", value: "+24%" },
];

export const AuthLayout: React.FC<AuthLayoutProps> = ({ title, subtitle, badge, children }) => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto grid max-w-7xl items-start gap-16 px-6 py-12 md:px-10 md:py-20 lg:grid-cols-[1.15fr_0.85fr]">
        <section className="max-w-2xl space-y-10">
          <div className="inline-flex items-center rounded-md border border-border/80 bg-card px-4 py-3 shadow-subtle">
            <img src="/stampee.svg" alt="Stampee logo" className="h-11 w-auto" />
          </div>

          {badge && (
            <div className="inline-flex items-center rounded-md border border-border bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {badge}
            </div>
          )}

          <div className="space-y-4">
            <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground md:text-6xl">
              {title}
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              {subtitle}
            </p>
          </div>

          <div className="grid max-w-xl gap-4 sm:grid-cols-2">
            {METRICS.map((item) => (
              <div key={item.label} className="rounded-lg border border-border/80 bg-card px-4 py-4 shadow-subtle">
                <p className="text-xs font-medium uppercase tracking-[0.08em] text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{item.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="w-full lg:justify-self-end">
          <div className="rounded-lg border border-border/80 bg-card p-8 shadow-panel md:p-10">
            {children}
          </div>
        </section>
      </div>
    </div>
  );
};
