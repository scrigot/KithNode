"use client";

import { ScrollReveal } from "@/components/scroll-reveal";

export function Testimonials() {
  return (
    <section className="bg-slate-50 py-24 px-4">
      <div className="mx-auto max-w-3xl">
        <ScrollReveal>
          <p className="mb-3 text-center text-xs font-semibold uppercase tracking-widest text-[#0EA5E9]">
            From the Founder
          </p>
          <h2 className="mb-10 text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Why KithNode exists
          </h2>
        </ScrollReveal>

        <ScrollReveal>
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm sm:p-10">
            <div className="space-y-5 text-base leading-relaxed text-slate-700">
              <p>
                Every finance hire traces back to the same pattern &mdash; a{" "}
                <span className="font-semibold text-slate-900">warm connection</span> two or
                three degrees away that surfaced at the right moment. The pattern is
                well documented. The execution &mdash; finding those connections,
                scoring them, and drafting outreach that doesn&apos;t feel robotic
                &mdash; is what kills candidates.
              </p>
              <p>
                KithNode was built by an operator who ran this exact playbook
                manually. That playbook landed a{" "}
                <span className="font-semibold text-slate-900">Fortune 500 internship</span>{" "}
                freshman year. Every feature in the product exists because a
                student tried it at 2am and found the friction. We&apos;re not
                shipping theories. We&apos;re shipping the method that already works.
              </p>
              <p>
                Private alpha opens this spring. If you&apos;re serious about 2026
                recruiting, request access below.
              </p>
            </div>

            <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0EA5E9]/10 text-sm font-bold text-[#0EA5E9]">
                SR
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">Sam Rigot</p>
                <p className="text-xs text-slate-500">
                  Founder &middot; UNC Chapel Hill &apos;29 &middot; Fortune 500 Intern, Summer 2026
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
