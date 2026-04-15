"use client";

import { signIn } from "next-auth/react";
import { StaggerContainer, FadeUp } from "@/components/motion";
import { ReelEmbed } from "./reel-embed";

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
            <span className="mb-6 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
              Now in private alpha at UNC
            </span>
          </FadeUp>

          <FadeUp>
            <h1 className="font-heading text-6xl font-bold tracking-tight text-white sm:text-8xl">
              Your Warmest Path
              <br />
              <span className="text-white/90">Into Finance</span>
            </h1>
          </FadeUp>

          <FadeUp>
            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-white/80">
              KithNode uses AI to surface your strongest alumni connections, score
              every relationship, and draft authentic outreach &mdash; so you land
              the coffee chat, not the cold shoulder.
            </p>
          </FadeUp>

          <FadeUp>
            <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row">
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="rounded-lg bg-white px-10 py-4 text-base font-semibold text-[#0EA5E9] shadow-lg transition-all hover:bg-white/90 hover:shadow-xl"
              >
                Get Started Free
              </button>
              <button
                onClick={() => {
                  document
                    .getElementById("how-it-works")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="rounded-lg border border-white/40 px-10 py-4 text-base font-medium text-white transition-all hover:bg-white/10"
              >
                See How It Works
              </button>
            </div>
          </FadeUp>
        </StaggerContainer>
      </div>

      {/* Animated hero reel — below the fold, still on gradient bg */}
      <div className="relative z-10 flex justify-center px-4 pb-24">
        <FadeUp>
          <div className="relative w-full max-w-[1200px]">
            <ReelEmbed />
            <div className="absolute -bottom-6 left-1/2 h-12 w-3/4 -translate-x-1/2 rounded-full bg-black/10 blur-2xl" />
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
