"use client";

import { ScrollReveal } from "@/components/scroll-reveal";

export function Testimonials() {
  return (
    <section className="bg-slate-50 py-24 px-4">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-[#0EA5E9]">
            A Note from the Founder
          </p>
          <h2 className="mb-10 text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Why I built KithNode
          </h2>
        </ScrollReveal>

        <ScrollReveal>
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="space-y-5 text-base leading-relaxed text-slate-700">
              <p>
                I&apos;m Sam, a freshman at UNC Chapel Hill and a Raleigh native.
                Last year, I landed a Fortune 500 internship as a freshman —
                not through luck, and not by cold emailing a hundred people.
                I did it by finding the right <span className="font-semibold text-slate-900">warm paths</span>:
                people two degrees away who could actually vouch for me.
              </p>
              <p>
                That process was brutal. Hours on LinkedIn, spreadsheets of
                alumni, awkward guesses about who knew who. I realized the
                entire recruiting game comes down to discovering the connections
                you already have... but nobody builds the tool to surface them.
              </p>
              <p>
                <span className="font-semibold text-slate-900">KithNode is that tool.</span>{" "}
                It imports your network, scores every contact, and shows you the
                warm paths you didn&apos;t know existed. The same method that got
                me my internship, automated for every student who doesn&apos;t
                have a Goldman VP in their family group chat.
              </p>
              <p>
                I&apos;m onboarding alpha users this summer before fall recruiting
                kicks off. If you&apos;re serious about IB, PE, or consulting
                recruiting, join the waitlist below.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0EA5E9]/10 text-sm font-bold text-[#0EA5E9]">
                SR
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Sam Rigot</p>
                <p className="text-xs text-slate-500">
                  Founder, KithNode · UNC Chapel Hill &apos;29
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
