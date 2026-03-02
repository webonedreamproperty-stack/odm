import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, LayoutGrid, MonitorPlay } from "lucide-react";
import { templates } from "../data/templates";
import { Template } from "../types";
import { LoyaltyCard } from "./LoyaltyCard";
import { Button } from "./ui/button";
import { useAuth } from "./AuthProvider";
import { cn } from "../lib/utils";

const categories = ["All", "Food & Drink", "Beauty & Wellness", "Services"] as const;

const templateCategories: Record<string, string> = {
  "cookie-classic": "Food & Drink",
  "midnight-brew": "Food & Drink",
  "pizza-party": "Food & Drink",
  "sweet-scoops": "Food & Drink",
  "massage-bliss": "Beauty & Wellness",
  "laundry-fresh": "Services",
  "sharp-cuts": "Beauty & Wellness",
  "boba-time": "Food & Drink",
  "burger-joint": "Food & Drink",
};

interface PreviewCardProps {
  template: Template;
  onSelect: (id: string) => void;
}

const ShowcasePreviewCard: React.FC<PreviewCardProps> = ({ template, onSelect }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const width = entries[0].contentRect.width;
      setScale(width / 380);
    });

    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <article
      className="showcase-card group cursor-pointer space-y-5"
      onClick={() => onSelect(template.id)}
    >
      <div
        ref={containerRef}
        className="relative aspect-[380/750] w-full overflow-hidden rounded-[2.4rem] border border-black/5 bg-white shadow-[0_32px_80px_-40px_rgba(0,0,0,0.26)]"
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{
            width: "380px",
            height: "750px",
            transform: `scale(${scale})`,
          }}
        >
          <LoyaltyCard template={template} mode="active" className="h-full w-full pointer-events-none" />
        </div>
        <div className="absolute inset-0 bg-black/0 transition-colors duration-300 group-hover:bg-black/[0.04]" />
      </div>
      <div className="space-y-2 text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6e6e73]">
          {templateCategories[template.id] ?? "Template"}
        </p>
        <h3 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">{template.name}</h3>
        <p className="text-sm text-[#5f6368]">{template.rewardName}</p>
      </div>
    </article>
  );
};

export const ShowcasePage: React.FC = () => {
  const { currentUser, isStaff } = useAuth();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>("All");
  const primaryPath = currentUser ? (isStaff ? "/issued-cards" : "/dashboard") : "/signup";
  const primaryLabel = currentUser ? "Open dashboard" : "Create account";

  const filteredTemplates = templates.filter((template) => {
    if (activeCategory === "All") return true;
    return templateCategories[template.id] === activeCategory;
  });

  return (
    <div className="min-h-screen bg-[#f4f1e8] text-[#1d1d1f]">
      <style>{`
        @keyframes showcase-drift-a { 0%,100%{transform:translateY(0px) scale(1)} 55%{transform:translateY(-28px) scale(1.03)} }
        @keyframes showcase-drift-b { 0%,100%{transform:translateY(0px) scale(1)} 50%{transform:translateY(20px) scale(0.98)} }
        @keyframes showcase-chip { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-3px)} }
        @keyframes showcase-float { 0%,100%{transform:translate3d(0,0,0)} 50%{transform:translate3d(0,-8px,0)} }
        .showcase-drift-a { animation: showcase-drift-a 10s ease-in-out infinite; }
        .showcase-drift-b { animation: showcase-drift-b 12s ease-in-out infinite 1.5s; }
        .showcase-chip { animation: showcase-chip 5.4s ease-in-out infinite; }
        .showcase-panel { animation: showcase-float 8.4s ease-in-out infinite; }
        .showcase-card {
          transition: transform 280ms cubic-bezier(0.16,1,0.3,1), box-shadow 280ms cubic-bezier(0.16,1,0.3,1);
        }
        .showcase-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 36px 90px -42px rgba(0,0,0,0.28);
        }
        @media (prefers-reduced-motion: reduce) {
          .showcase-drift-a, .showcase-drift-b, .showcase-chip, .showcase-panel { animation: none !important; }
          .showcase-card { transition: none !important; }
          .showcase-card:hover { transform: none !important; }
        }
      `}</style>

      <header className="fixed top-0 z-30 w-full border-b border-black/[0.06] bg-white/75 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-[88rem] items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="inline-flex items-center">
            <img src="/stampee.svg" alt="Stampee" className="h-8 w-auto" />
          </Link>
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" className="hidden rounded-full text-sm font-medium text-[#1d1d1f] hover:bg-black/[0.06] sm:inline-flex">
              <Link to="/articles/getting-started">Getting started</Link>
            </Button>
            <Button asChild className="rounded-full bg-[#1d1d1f] px-5 text-sm font-medium text-white hover:bg-black/80">
              <Link to={primaryPath}>{primaryLabel}</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="pt-20">
        <section className="relative overflow-hidden bg-[#d3eb22]">
          <div className="pointer-events-none absolute inset-0">
            <div className="showcase-drift-a absolute left-[-8%] top-[10%] h-[460px] w-[460px] rounded-full bg-[#f4ff9a]/70 blur-[120px]" />
            <div className="showcase-drift-b absolute right-[-10%] bottom-[-5%] h-[520px] w-[520px] rounded-full bg-[#94b90d]/25 blur-[130px]" />
            <div className="absolute left-[46%] top-[22%] h-[280px] w-[280px] rounded-full bg-white/20 blur-[90px]" />
          </div>

          <div className="relative flex min-h-[72svh] w-full items-center px-6 pb-16 pt-24 sm:px-8 lg:px-10 lg:pb-20">
            <div className="max-w-[62rem]">
              <div className="showcase-chip mb-7 inline-flex items-center gap-2 rounded-full border border-[#17351a]/10 bg-white/35 px-5 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.24em] text-[#284b1f] backdrop-blur-sm">
                <MonitorPlay className="h-3.5 w-3.5" />
                Demos & Templates
              </div>
              <h1 className="max-w-[14ch] text-[clamp(3.2rem,6.5vw,6rem)] font-black leading-[0.92] tracking-[-0.05em] text-[#17351a]">
                See how loyalty looks before you launch it.
              </h1>
              <p className="mt-8 max-w-[50rem] text-[clamp(1.08rem,1.65vw,1.42rem)] leading-[1.45] text-[#23461d]/82">
                Browse live card demos, explore ready-made templates, and find a starting point that already feels close to your brand.
              </p>
              <div className="mt-10 flex flex-wrap gap-4">
                <Button asChild className="h-14 rounded-[1.4rem] bg-[#17351a] px-8 text-base font-semibold text-white shadow-[0_26px_50px_-28px_rgba(23,53,26,0.85)] hover:bg-[#102712]">
                  <Link to="#templates">Browse templates</Link>
                </Button>
                <Button asChild variant="ghost" className="h-14 rounded-[1.4rem] bg-white/55 px-8 text-base font-medium text-[#17351a] hover:bg-white/75">
                  <Link to="/articles/getting-started">How to launch</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section id="templates" className="relative overflow-hidden bg-[#f4f1e8] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-[96rem]">
            <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-[38rem]">
                <div className="showcase-chip inline-flex items-center gap-2 rounded-full border border-black/[0.06] bg-white px-4 py-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#6e6e73]">
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Template library
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setActiveCategory(category)}
                    className={cn(
                      "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                      activeCategory === category
                        ? "bg-[#1d1d1f] text-white shadow-[0_20px_45px_-28px_rgba(0,0,0,0.35)]"
                        : "bg-white text-[#5f6368] ring-1 ring-black/[0.06] hover:bg-black/[0.03]"
                    )}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-10">
              {filteredTemplates.map((template) => (
                <ShowcasePreviewCard
                  key={template.id}
                  template={template}
                  onSelect={(id) => {
                    if (currentUser && !isStaff) {
                      navigate(`/preview/${id}`);
                      return;
                    }
                    navigate("/signup");
                  }}
                />
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#6d28d9] px-4 py-20 text-white sm:px-6 lg:px-8">
          <div className="pointer-events-none absolute inset-0">
            <div className="showcase-drift-a absolute left-[-6%] top-[12%] h-[320px] w-[320px] rounded-full bg-fuchsia-300/16 blur-[110px]" />
            <div className="showcase-drift-b absolute right-[-8%] bottom-[6%] h-[360px] w-[360px] rounded-full bg-violet-300/16 blur-[120px]" />
          </div>
          <div className="relative mx-auto max-w-[82rem] text-center">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.26em] text-white/55">Next step</p>
            <h2 className="mt-6 text-[clamp(3rem,6vw,5.5rem)] font-semibold leading-[0.98] tracking-tight">
              Take a demo into your own brand.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-[clamp(1.06rem,1.45vw,1.3rem)] leading-relaxed text-white/72">
              Start with a template, adjust the reward and style, and get your first loyalty program live fast.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild className="h-[3.6rem] rounded-full bg-white px-10 text-base font-semibold text-[#1d1d1f] hover:bg-white/92">
                <Link to={primaryPath}>{primaryLabel}</Link>
              </Button>
              <Button asChild variant="ghost" className="h-[3.6rem] rounded-full border border-white/20 bg-white/10 px-10 text-base font-medium text-white hover:bg-white/16">
                <Link to="/articles/getting-started">
                  Read the guide
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default ShowcasePage;
