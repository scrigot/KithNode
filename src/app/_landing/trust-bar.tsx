"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
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
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [isInView, value]);

  return (
    <span ref={ref} className="font-heading text-3xl font-bold tabular-nums text-accent-teal sm:text-4xl">
      {display}{suffix}
    </span>
  );
}

const METRICS = [
  { value: 500, suffix: "+", label: "Alumni Mapped" },
  { value: 12, suffix: "", label: "Target Firms" },
  { value: 3, suffix: "x", label: "Response Rate" },
  { value: 131, suffix: "+", label: "Connections Scored" },
];

export function TrustBar() {
  return (
    <section className="bg-slate-50 py-12">
      <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:grid-cols-4">
        {METRICS.map((m) => (
          <div key={m.label} className="flex flex-col items-center text-center">
            <AnimatedNumber value={m.value} suffix={m.suffix} />
            <span className="mt-1 text-sm text-slate-600">{m.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
