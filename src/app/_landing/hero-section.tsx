"use client";

import Link from "next/link";
import { Suspense, useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { HeroNetwork } from "./hero-network";
import { Starfield } from "./starfield";

const lineVariants = {
  hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
  visible: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const reducedLineVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: "easeOut" as const },
  },
};

export function HeroSection({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -40]);

  const LV = reduce ? reducedLineVariants : lineVariants;

  return (
    <section
      ref={ref}
      className="relative min-h-screen overflow-hidden bg-black"
    >
      {/* Twinkling starfield */}
      <Starfield />

      {/* Soft cyan glow behind the network column */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 lg:block"
        style={{
          background:
            "radial-gradient(ellipse 55% 55% at 60% 50%, rgba(34,211,238,0.18), rgba(34,211,238,0) 70%)",
        }}
      />

      {/* Two-column hero */}
      <motion.div
        className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col items-center gap-12 px-6 py-24 lg:flex-row lg:items-center lg:gap-12 lg:px-12 lg:py-0"
        style={{ y: reduce ? 0 : contentY }}
      >
        {/* LEFT: copy column */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: {
              transition: { staggerChildren: 0.14, delayChildren: 0.05 },
            },
          }}
          className="flex flex-col items-start text-left lg:flex-[3]"
        >
          {/* Pill badge */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: -10 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, ease: "easeOut" as const },
              },
            }}
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-cyan-300"
                animate={
                  reduce
                    ? undefined
                    : {
                        opacity: [0.4, 1, 0.4],
                        scale: [1, 1.25, 1],
                      }
                }
                transition={
                  reduce
                    ? undefined
                    : { duration: 2.2, repeat: Infinity, ease: "easeInOut" }
                }
              />
              Private alpha &middot; 17 of 50 founding seats left
            </span>
          </motion.div>

          {/* Headline with gradient on the third line */}
          <h1 className="font-heading text-5xl font-bold tracking-tight text-white sm:text-6xl xl:text-7xl">
            <motion.span className="block" variants={LV}>
              Find a warm path
            </motion.span>
            <motion.span className="block text-white/80" variants={LV}>
              into every firm
            </motion.span>
            <motion.span
              className="block bg-gradient-to-r from-cyan-300 via-cyan-400 to-sky-500 bg-clip-text text-transparent"
              variants={LV}
            >
              on your target list.
            </motion.span>
          </h1>

          {/* Subhead */}
          <motion.p
            className="mt-8 max-w-xl text-lg leading-relaxed text-white/70 lg:text-xl"
            variants={fadeUp}
          >
            KithNode maps every alum at the firms you care about, ranks each
            warm path by shared signals (school, club, Greek, hometown), and
            drafts the message. Warm intros land replies 5x more often than
            cold emails.
          </motion.p>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center"
            variants={fadeUp}
          >
            {children}
            <Link
              href="/demo"
              className="rounded-lg border border-white/20 bg-white/5 px-10 py-4 text-center text-base font-medium text-white backdrop-blur-sm transition-all hover:border-cyan-400/50 hover:bg-cyan-500/10 hover:text-cyan-100"
            >
              Watch a warm path get found
            </Link>
          </motion.div>

          {/* Footer credit */}
          <motion.p
            className="mt-10 max-w-xl text-sm text-white/50"
            variants={fadeUp}
          >
            500+ alumni mapped. 32% reply rate. 23 founding students already
            shipping intros.
          </motion.p>
        </motion.div>

        {/* RIGHT: spinning 3D node network */}
        <div className="relative h-[420px] w-full lg:h-[640px] lg:flex-[2]">
          <Suspense fallback={<div className="h-full w-full" />}>
            <HeroNetwork />
          </Suspense>
        </div>
      </motion.div>
    </section>
  );
}
