"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { stepNav } from "../_data";

export function StepRail() {
  const [active, setActive] = React.useState<string>(stepNav[0].id);

  React.useEffect(() => {
    const ids = stepNav.map((s) => s.id);
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the first panel whose top is in the upper half of viewport.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => {
            return (
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top)
            );
          });
        if (visible[0]) {
          setActive(visible[0].target.id);
        }
      },
      {
        // Panel is considered active when its top crosses ~1/3 from top.
        rootMargin: "-20% 0px -60% 0px",
        threshold: [0, 0.1, 0.5],
      }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      aria-label="Demo walkthrough progress"
      className="sticky top-24 hidden lg:block"
    >
      <div className="relative pl-4">
        {/* Vertical rail background */}
        <div className="absolute left-0 top-2 h-[calc(100%-16px)] w-px bg-slate-200" />
        {/* Animated fill proportional to active step */}
        <motion.div
          className="absolute left-0 top-2 w-px bg-gradient-to-b from-[#0EA5E9] to-[#06B6D4]"
          animate={{
            height: `${
              ((stepNav.findIndex((s) => s.id === active) + 1) /
                stepNav.length) *
              100
            }%`,
          }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        />

        <ol className="flex flex-col gap-6">
          {stepNav.map((step) => {
            const isActive = step.id === active;
            return (
              <li key={step.id} className="relative">
                <a
                  href={`#${step.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(step.id)
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="group flex items-start gap-3 text-left"
                >
                  <span
                    className={`absolute -left-4 top-1 h-2 w-2 -translate-x-1/2 rounded-full border-2 transition-colors ${
                      isActive
                        ? "border-[#0EA5E9] bg-[#0EA5E9]"
                        : "border-slate-300 bg-white"
                    }`}
                  />
                  <div className="min-w-0">
                    <p
                      className={`font-mono text-[10px] font-semibold uppercase tracking-wider transition-colors ${
                        isActive ? "text-[#0EA5E9]" : "text-slate-400"
                      }`}
                    >
                      Step {step.step}
                    </p>
                    <p
                      className={`mt-0.5 text-sm font-semibold transition-colors ${
                        isActive
                          ? "text-slate-900"
                          : "text-slate-500 group-hover:text-slate-700"
                      }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
