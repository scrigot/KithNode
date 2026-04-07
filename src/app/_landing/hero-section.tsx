"use client";

import { StaggerContainer, FadeUp } from "@/components/motion";

const MOCK_CONTACTS = [
  { name: "Jacob Goldstein", company: "KKR", score: 78, tier: "HOT", tierColor: "bg-tier-hot" },
  { name: "Sarah Chen", company: "Goldman Sachs", score: 71, tier: "HOT", tierColor: "bg-tier-hot" },
  { name: "Mike Park", company: "Evercore", score: 65, tier: "WARM", tierColor: "bg-tier-warm" },
  { name: "James Liu", company: "McKinsey", score: 58, tier: "WARM", tierColor: "bg-tier-warm" },
  { name: "Priya Nair", company: "Centerview", score: 34, tier: "MONITOR", tierColor: "bg-tier-monitor" },
];

export function HeroSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex flex-col items-center justify-center px-4 pt-32 pb-16">
      <StaggerContainer className="flex flex-col items-center text-center">
        <FadeUp>
          <h1 className="font-heading text-6xl font-bold tracking-tighter sm:text-8xl">
            <span className="text-text-primary">Kith</span>
            <span className="text-accent-teal">Node</span>
          </h1>
        </FadeUp>

        <FadeUp>
          <p className="mt-3 text-xs font-medium uppercase tracking-[0.3em] text-text-muted">
            warm signals intelligence
          </p>
        </FadeUp>

        <FadeUp>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-text-secondary sm:text-lg">
            Surface your strongest alumni connections. AI&#8209;powered scoring,
            signal detection, and authentic outreach&nbsp;&mdash; built for
            students breaking into finance.
          </p>
        </FadeUp>

        <FadeUp>
          <div className="mt-10">{children}</div>
          <p className="mt-4 text-xs text-text-muted">
            Private alpha &middot; UNC students only
          </p>
        </FadeUp>

        {/* Product mock */}
        <FadeUp>
          <div className="mt-14 w-full max-w-[420px] border border-white/[0.06] bg-[#111D2E]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
              <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-accent-teal">
                Warm Signals
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                LIVE
              </span>
            </div>

            {/* Table header */}
            <div className="grid grid-cols-[1fr_1fr_56px_60px] gap-2 border-b border-white/[0.06] px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-text-muted">
              <span>Name</span>
              <span>Company</span>
              <span className="text-right">Score</span>
              <span className="text-right">Tier</span>
            </div>

            {/* Rows */}
            {MOCK_CONTACTS.map((contact, i) => {
              const isBlurred = i >= 3;
              return (
                <div
                  key={contact.name}
                  className={`grid grid-cols-[1fr_1fr_56px_60px] gap-2 border-b border-white/[0.06] px-4 py-2 text-[11px] last:border-b-0 ${
                    isBlurred ? "select-none blur-[3px]" : ""
                  }`}
                >
                  <span className="truncate text-text-primary">{contact.name}</span>
                  <span className="truncate text-text-secondary">{contact.company}</span>
                  <span className="text-right font-mono tabular-nums text-text-primary">{contact.score}</span>
                  <span className="flex justify-end">
                    <span
                      className={`${contact.tierColor} inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white`}
                    >
                      {contact.tier}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </FadeUp>
      </StaggerContainer>
    </section>
  );
}
