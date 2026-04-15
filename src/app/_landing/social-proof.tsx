"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";

function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    const duration = 1500;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, value]);

  return (
    <span ref={ref} className="font-heading text-4xl font-bold tabular-nums text-white sm:text-5xl">
      {display}{suffix}
    </span>
  );
}

const METRICS = [
  { value: 3, suffix: "x", label: "Higher Response Rate" },
  { value: 50, suffix: "%", label: "Less Time Researching" },
  { value: 500, suffix: "+", label: "Alumni Mapped" },
  { value: 12, suffix: "", label: "Target Firms Covered" },
];

export function SocialProof() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-[#0EA5E9] to-[#0284C7] py-20 px-4">
      {/* Decorative circles */}
      <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10" />
      <div className="absolute -bottom-10 -left-10 h-40 w-40 rounded-full bg-white/5" />

      <div className="relative mx-auto max-w-5xl">
        <ScrollReveal>
          <h2 className="mb-12 text-center font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Results that speak for themselves
          </h2>
        </ScrollReveal>

        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {METRICS.map((m) => (
            <ScrollReveal key={m.label}>
              <div className="flex flex-col items-center text-center">
                <CountUp value={m.value} suffix={m.suffix} />
                <span className="mt-2 text-sm font-medium text-white/80">{m.label}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
