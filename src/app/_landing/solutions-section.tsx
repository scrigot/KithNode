"use client";

import { ScrollReveal } from "@/components/scroll-reveal";
import { TrendingUp, Building2, Briefcase } from "lucide-react";
import { signIn } from "next-auth/react";

const FIRMS = [
  "Goldman Sachs", "Morgan Stanley", "J.P. Morgan", "Evercore", "Centerview",
  "Lazard", "PJT Partners", "Moelis", "KKR", "Blackstone", "Apollo",
  "Carlyle", "Warburg Pincus", "McKinsey", "Bain & Company", "BCG",
  "Deloitte", "EY", "PwC", "KPMG", "Citadel", "Point72", "Two Sigma",
  "Bridgewater", "D.E. Shaw",
];

const SOLUTIONS = [
  {
    title: "Investment Banking",
    subtitle: "Break into bulge bracket and elite boutiques",
    Icon: TrendingUp,
    points: [
      "Map alumni at Goldman, Evercore, Centerview, and 50+ firms",
      "Score connections by shared school, Greek org, and hometown",
      "Draft authentic cold outreach that gets responses",
    ],
  },
  {
    title: "Private Equity & Hedge Funds",
    subtitle: "Build relationships at mega funds and top HFs",
    Icon: Building2,
    points: [
      "Discover warm paths to KKR, Blackstone, Apollo, and more",
      "Track who changed roles or got promoted recently",
      "Pipeline management from first email to coffee chat",
    ],
  },
  {
    title: "Consulting",
    subtitle: "Connect with MBB and Big 4 alumni",
    Icon: Briefcase,
    points: [
      "Find McKinsey, Bain, BCG alumni in your network",
      "AI scoring highlights your strongest connections",
      "Authentic outreach drafts — no spray-and-pray",
    ],
  },
];

export function SolutionsSection() {
  return (
    <section id="solutions" className="bg-gradient-to-br from-[#0369A1] via-[#0EA5E9] to-[#06B6D4] py-24 px-4">
      <style jsx>{`
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-ticker {
          animation: ticker 40s linear infinite;
        }
      `}</style>
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Built for ambitious students
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-white/70">
            Whether you&apos;re targeting IB, PE, or consulting — KithNode maps the fastest path to the people who matter.
          </p>
        </ScrollReveal>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {SOLUTIONS.map((sol, i) => (
            <ScrollReveal key={sol.title} delay={i * 0.05}>
              <div className="flex h-full flex-col rounded-xl border border-white/10 bg-white p-6 transition-transform duration-300 hover:scale-[1.03]">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9]">
                  <sol.Icon className="h-5 w-5" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-slate-900">
                  {sol.title}
                </h3>
                <p className="mt-1 text-sm text-slate-400">{sol.subtitle}</p>
                <ul className="mt-4 flex-1 space-y-2">
                  {sol.points.map((point) => (
                    <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                      <svg className="mt-0.5 h-4 w-4 shrink-0 text-[#0EA5E9]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {point}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                  className="mt-6 w-full rounded-lg border border-[#0EA5E9] bg-white py-2.5 text-sm font-medium text-[#0EA5E9] transition-colors duration-300 hover:bg-[#0EA5E9] hover:text-white"
                >
                  Get Started
                </button>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Firm ticker */}
        <div className="mt-16 overflow-hidden border-t border-white/10 pt-6">
          <p className="mb-4 text-center text-xs font-medium uppercase tracking-widest text-white/40">
            Target Firms
          </p>
          <div className="relative flex overflow-hidden">
            <div className="animate-ticker flex shrink-0 gap-8">
              {FIRMS.map((firm) => (
                <span key={firm} className="whitespace-nowrap text-sm font-medium text-white/60">
                  {firm}
                </span>
              ))}
            </div>
            <div className="animate-ticker flex shrink-0 gap-8" aria-hidden>
              {FIRMS.map((firm) => (
                <span key={firm} className="whitespace-nowrap text-sm font-medium text-white/60">
                  {firm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
