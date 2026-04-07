"use client";

import { GlassCard } from "@/components/glass-card";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Radar, Sparkles, Send } from "lucide-react";

const FEATURES = [
  {
    title: "Signal Detection",
    description:
      "Automatically surface alumni at your target firms. Job changes, promotions, and shared connections — all tracked in real time.",
    Icon: Radar,
    glow: "teal" as const,
  },
  {
    title: "AI Scoring",
    description:
      "Every contact gets a warmth score based on shared affiliations, activity signals, and reachability. Focus on your highest-probability paths.",
    Icon: Sparkles,
    glow: "amber" as const,
  },
  {
    title: "Authentic Outreach",
    description:
      "Pipeline tracking and nudges that keep you consistent without feeling robotic. Build real relationships, not spray-and-pray campaigns.",
    Icon: Send,
    glow: "teal" as const,
  },
];

export function FeaturesSection() {
  return (
    <section className="relative px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-text-primary sm:text-4xl">
            Your warmest path into finance
          </h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-sm text-text-secondary">
            KithNode maps the connections you already have and scores the ones
            worth pursuing.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {FEATURES.map((feature, i) => (
            <ScrollReveal key={feature.title} delay={i * 0.05}>
              <GlassCard glowColor={feature.glow}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center bg-white/[0.06] text-accent-teal">
                  <feature.Icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-lg font-semibold text-text-primary">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {feature.description}
                </p>
              </GlassCard>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
