"use client";

import Link from "next/link";
import { StaggerContainer, FadeUp } from "@/components/motion";

export function HeroSection({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden">
      {/* Bold gradient background — covers full viewport */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0369A1] via-[#0EA5E9] to-[#06B6D4]">
        {/* Angular geometric accent shapes */}
        <div className="absolute -right-20 -top-20 h-[600px] w-[600px] rotate-12 bg-gradient-to-br from-[#06B6D4]/60 to-[#22D3EE]/40" />
        <div className="absolute -left-40 bottom-0 h-[500px] w-[700px] -rotate-6 bg-gradient-to-tr from-[#0284C7]/50 to-[#0EA5E9]/30" />
        <div className="absolute right-10 bottom-20 h-[400px] w-[400px] rotate-45 bg-gradient-to-bl from-[#22D3EE]/30 to-transparent" />
        <div className="absolute -left-10 -top-10 h-[300px] w-[500px] rotate-3 bg-gradient-to-r from-[#0369A1]/40 to-transparent" />
      </div>

      {/* Hero text content — vertically centered in viewport */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4">
        <StaggerContainer className="flex flex-col items-center text-center">
          <FadeUp>
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D7F548]" />
              Private alpha &middot; free for founding users
            </span>
          </FadeUp>

          <FadeUp>
            <h1 className="font-heading text-5xl font-bold tracking-tight text-white sm:text-7xl">
              Break into finance
              <br />
              <span className="text-white/90">through the people</span>
              <br />
              <span className="text-white/90">you already know.</span>
            </h1>
          </FadeUp>

          <FadeUp>
            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-white/85">
              KithNode maps every UNC alum, Chi Phi brother, and Charlotte native across 50+ target firms &mdash; scores the warmest paths &mdash; and drafts outreach that actually gets replies.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
              {children}
              <button
                onClick={() => {
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-lg border border-white/40 px-10 py-4 text-base font-medium text-white transition-all hover:bg-white/10"
              >
                See it in action
              </button>
            </div>
          </FadeUp>

          <FadeUp>
            <p className="mt-10 max-w-xl text-sm text-white/70">
              Built by <Link href="https://www.linkedin.com/in/samrigot" target="_blank" rel="noopener noreferrer" className="font-semibold text-white underline underline-offset-4 hover:text-[#D7F548]">Sam Rigot</Link>, a UNC freshman who scored 500+ real alumni connections on LinkedIn before writing a line of outreach.
            </p>
          </FadeUp>
        </StaggerContainer>
      </div>
    </section>
  );
}
