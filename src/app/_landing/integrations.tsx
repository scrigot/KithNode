"use client";

import { ScrollReveal } from "@/components/scroll-reveal";

const INTEGRATIONS = [
  { name: "LinkedIn", description: "Import & enrich" },
  { name: "Google", description: "OAuth sign-in" },
  { name: "Supabase", description: "Database & auth" },
  { name: "Vercel", description: "Edge deployment" },
  { name: "Stripe", description: "Billing" },
  { name: "PostHog", description: "Analytics" },
];

export function Integrations() {
  return (
    <section className="py-20 px-4">
      <div className="mx-auto max-w-5xl">
        <ScrollReveal>
          <h2 className="mb-4 text-center font-heading text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Built on best-in-class infrastructure
          </h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-sm text-slate-600">
            Enterprise-grade tools powering your networking intelligence.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-3 gap-6 sm:grid-cols-6">
          {INTEGRATIONS.map((int, i) => (
            <ScrollReveal key={int.name} delay={i * 0.03}>
              <div className="flex flex-col items-center gap-1.5 rounded-lg p-4 transition-colors hover:bg-slate-50">
                <span className="text-lg font-bold tracking-tight text-slate-300 transition-colors hover:text-slate-500">
                  {int.name}
                </span>
                <span className="text-[10px] text-slate-400">{int.description}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
