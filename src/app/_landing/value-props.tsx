"use client";

import { useRef } from "react";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Link2, Brain, MessageCircle } from "lucide-react";

const STEPS = [
  {
    step: "01",
    title: "Import your network",
    description:
      "Connect your LinkedIn and let KithNode map every alumni connection at your target firms. No manual research, no spreadsheets.",
    Icon: Link2,
  },
  {
    step: "02",
    title: "AI scores every path",
    description:
      "Warmth scoring based on shared school, firm, Greek org, hometown, and activity signals. Know exactly who to reach out to first.",
    Icon: Brain,
  },
  {
    step: "03",
    title: "Reach out authentically",
    description:
      "AI-drafted messages that feel real, with pipeline tracking to stay consistent. Build genuine relationships, not spray-and-pray campaigns.",
    Icon: MessageCircle,
  },
];

function TimelineStep({
  step,
  index,
}: {
  step: (typeof STEPS)[0];
  index: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { margin: "-100px", once: false });
  const isLeft = index % 2 === 0;

  return (
    <div ref={ref} className="relative flex items-center gap-8">
      {/* Timeline dot — centered on the line */}
      <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10">
        <motion.div
          animate={
            isInView
              ? {
                  scale: [1, 1.3, 1],
                  boxShadow: [
                    "0 0 0 0 rgba(14,165,233,0)",
                    "0 0 20px 4px rgba(14,165,233,0.4)",
                    "0 0 0 0 rgba(14,165,233,0)",
                  ],
                }
              : {}
          }
          transition={{ duration: 1.5, repeat: isInView ? Infinity : 0 }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#0EA5E9] to-[#06B6D4] text-white font-bold text-sm shadow-lg"
        >
          {step.step}
        </motion.div>
      </div>

      {/* Content card — mobile: always right of line; desktop: zigzag */}
      <motion.div
        initial={{ opacity: 0, x: isLeft ? -60 : 60 }}
        animate={
          isInView
            ? { opacity: 1, x: 0 }
            : { opacity: 0, x: isLeft ? -60 : 60 }
        }
        transition={{ duration: 0.6, ease: "easeOut" }}
        className={`
          w-[calc(100%-56px)] ml-auto
          md:w-[calc(50%-40px)] md:ml-0
          ${isLeft ? "md:mr-auto md:ml-0" : "md:ml-auto md:mr-0"}
        `}
      >
        <div className="group rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#0EA5E9]/10">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-lg bg-[#0EA5E9]/10 text-[#0EA5E9]">
            <step.Icon className="h-5 w-5" />
          </div>
          <h3 className="font-heading text-xl font-semibold text-slate-900">
            {step.title}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {step.description}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

export function ValueProps() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);

  return (
    <section id="how-it-works" className="py-24 px-4">
      <div className="mx-auto max-w-4xl">
        {/* Heading */}
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl"
        >
          Three steps to your warmest path
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mx-auto mb-20 max-w-xl text-center text-slate-600"
        >
          From cold outreach to warm introductions — KithNode transforms how you
          network.
        </motion.p>

        {/* Timeline */}
        <div ref={containerRef} className="relative">
          {/* Vertical line (background track) */}
          <div className="absolute left-4 md:left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-200" />
          {/* Vertical line (animated gradient fill) */}
          <motion.div
            className="absolute left-4 md:left-1/2 top-0 w-px -translate-x-1/2 bg-gradient-to-b from-[#0EA5E9] to-[#06B6D4]"
            style={{ height: lineHeight }}
          />

          {/* Steps */}
          <div className="space-y-24">
            {STEPS.map((step, i) => (
              <TimelineStep key={step.step} step={step} index={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
