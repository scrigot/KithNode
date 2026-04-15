"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { useCallback } from "react";

const TESTIMONIALS = [
  {
    quote: "KithNode found connections I didn't even know I had. Landed a coffee chat with a VP at Evercore within two weeks.",
    name: "Alex M.",
    school: "UNC Chapel Hill '27",
  },
  {
    quote: "The warmth scoring is a game-changer. Instead of blasting 100 people, I focused on my top 10 and got 4 responses.",
    name: "Jordan K.",
    school: "Duke '26",
  },
  {
    quote: "The outreach drafts feel authentic — not like ChatGPT wrote them. People actually respond because the messages reference real shared connections.",
    name: "Priya S.",
    school: "Wake Forest '27",
  },
  {
    quote: "I was spending hours on LinkedIn research every week. KithNode automated the entire process and surfaced better leads than I found manually.",
    name: "Marcus T.",
    school: "UVA '26",
  },
];

export function Testimonials() {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <section className="bg-slate-50 py-24 px-4">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            What students are saying
          </h2>
          <p className="mx-auto mb-12 max-w-lg text-center text-sm text-slate-600">
            Early alpha users are already seeing results.
          </p>
        </ScrollReveal>

        <div className="relative">
          <div className="overflow-hidden" ref={emblaRef}>
            <div className="flex">
              {TESTIMONIALS.map((t) => (
                <div
                  key={t.name}
                  className="min-w-0 shrink-0 basis-full px-3 sm:basis-1/2"
                >
                  <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-6">
                    {/* Quote mark */}
                    <svg className="mb-3 h-8 w-8 text-[#0EA5E9]/20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                    </svg>
                    <p className="flex-1 text-sm leading-relaxed text-slate-600">
                      &ldquo;{t.quote}&rdquo;
                    </p>
                    <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-4">
                      {/* Avatar placeholder */}
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#0EA5E9]/10 text-xs font-bold text-[#0EA5E9]">
                        {t.name.split(" ").map((n) => n[0]).join("")}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{t.name}</p>
                        <p className="text-xs text-slate-400">{t.school}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation arrows */}
          <div className="mt-6 flex justify-center gap-3">
            <button
              onClick={scrollPrev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <button
              onClick={scrollNext}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-400 transition-colors hover:border-slate-300 hover:text-slate-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
