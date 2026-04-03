"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { GlassCard } from "@/components/glass-card";

const STATS = [
  { value: "500+", label: "Alumni Mapped", color: "text-accent-teal" },
  { value: "12", label: "Target Firms", color: "text-accent-amber" },
  { value: "3x", label: "Response Rate", color: "text-accent-green" },
];

export function StatsSection() {
  return (
    <section className="relative px-4 py-24">
      <ScrollReveal className="mx-auto max-w-4xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {STATS.map((stat) => (
            <GlassCard key={stat.label} className="text-center">
              <p
                className={`font-heading text-4xl font-bold tabular-nums ${stat.color}`}
              >
                {stat.value}
              </p>
              <p className="mt-2 text-sm text-text-secondary">{stat.label}</p>
            </GlassCard>
          ))}
        </div>
      </ScrollReveal>
    </section>
  );
}
