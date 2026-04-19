"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { GradientBlob } from "./gradient-blob";
import { ShowcaseTicker } from "./showcase-ticker";
import { ShowcaseKanban } from "./showcase-kanban";
import { ShowcaseDashboard } from "./showcase-dashboard";

export function Showcase() {
  return (
    <section className="relative overflow-hidden px-4 py-24">
      <GradientBlob className="-right-40 top-10" size={500} variant="cyan" />
      <GradientBlob className="-left-40 bottom-10" size={420} variant="teal" />

      <div className="relative mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            From warm path to coffee chat
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-slate-600">
            Every KithNode user sees their alumni network become a scored,
            actionable pipeline &mdash; the exact workflow that works in finance
            recruiting.
          </p>
        </ScrollReveal>

        {/* Layer 1: Marketing Kanban */}
        <ScrollReveal>
          <ShowcaseTicker />
          <ShowcaseKanban />
        </ScrollReveal>

        {/* Between-layer hint */}
        <ScrollReveal delay={0.1}>
          <div className="my-10 flex items-center justify-center gap-3">
            <div className="h-px w-16 bg-slate-200" />
            <p className="text-sm font-normal lowercase text-slate-500">
              and here&apos;s what you see when you log in <span aria-hidden>↓</span>
            </p>
            <div className="h-px w-16 bg-slate-200" />
          </div>
        </ScrollReveal>

        {/* Layer 2: Dashboard preview */}
        <ScrollReveal>
          <ShowcaseDashboard />
        </ScrollReveal>
      </div>
    </section>
  );
}
