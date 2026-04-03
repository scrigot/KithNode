"use client";

import { StaggerContainer, FadeUp } from "@/components/motion";

export function HeroSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <StaggerContainer className="flex flex-col items-center text-center">
        <FadeUp>
          <h1 className="font-heading text-6xl font-bold tracking-tight sm:text-8xl">
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
            Alpha access restricted to @unc.edu emails
          </p>
        </FadeUp>
      </StaggerContainer>

      {/* Scroll indicator */}
      <FadeUp className="absolute bottom-8">
        <div className="flex flex-col items-center gap-2 text-text-muted">
          <span className="text-[10px] uppercase tracking-widest">Scroll</span>
          <div className="h-6 w-px animate-pulse bg-text-muted/40" />
        </div>
      </FadeUp>
    </section>
  );
}
