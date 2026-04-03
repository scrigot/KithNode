import { GlassCard } from "@/components/glass-card";
import { Link2, Radar, Send } from "lucide-react";

const STEPS = [
  {
    step: 1,
    title: "Connect",
    description: "Link your LinkedIn to import your network",
    Icon: Link2,
  },
  {
    step: 2,
    title: "Discover",
    description: "KithNode scores and ranks your warmest alumni paths",
    Icon: Radar,
  },
  {
    step: 3,
    title: "Reach out",
    description: "Get personalized, authentic outreach drafts",
    Icon: Send,
  },
];

export function HowItWorksSection() {
  return (
    <section className="relative px-4 py-24">
      <div className="mx-auto max-w-5xl">
        <h2 className="mb-4 text-center font-heading text-3xl font-bold text-text-primary sm:text-4xl">
          How it works
        </h2>
        <p className="mx-auto mb-12 max-w-lg text-center text-sm text-text-secondary">
          Three steps from cold outreach to warm introduction.
        </p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <GlassCard key={step.step}>
              <div className="mb-4 flex items-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center bg-accent-teal/10 font-mono text-sm font-bold text-accent-teal">
                  {step.step}
                </span>
                <step.Icon className="h-5 w-5 text-text-muted" />
              </div>
              <h3 className="font-heading text-lg font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {step.description}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </section>
  );
}
