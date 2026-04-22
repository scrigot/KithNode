"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { HeroNetwork } from "./hero-network";

// Inline SVG noise as a data URI. Small, crisp, no network hit.
const NOISE_URI =
  "url(\"data:image/svg+xml;utf8,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.5 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

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

export function HeroSection({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Parallax: shapes drift slower/farther than the network.
  const shapesY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const networkY = useTransform(scrollYProgress, [0, 1], [0, 60]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, -30]);

  const LV = reduce ? reducedLineVariants : lineVariants;

  return (
    <section ref={ref} className="relative overflow-hidden">
      {/* Base gradient — unchanged palette */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0369A1] via-[#0EA5E9] to-[#06B6D4]" />

      {/* Network graph sits above base gradient, BEHIND accent shapes */}
      <div className="absolute inset-0">
        <HeroNetwork parallaxY={networkY} />
      </div>

      {/* Rotated accent shapes with slow drift + scroll parallax */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={{ y: reduce ? 0 : shapesY }}
      >
        <motion.div
          className="absolute -right-20 -top-20 h-[600px] w-[600px] rotate-12 bg-gradient-to-br from-[#06B6D4]/60 to-[#22D3EE]/40"
          animate={
            reduce
              ? undefined
              : { x: [0, 14, -8, 0], y: [0, -10, 6, 0], rotate: [12, 13.5, 11, 12] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 22, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.div
          className="absolute -left-40 bottom-0 h-[500px] w-[700px] -rotate-6 bg-gradient-to-tr from-[#0284C7]/50 to-[#0EA5E9]/30"
          animate={
            reduce
              ? undefined
              : { x: [0, -12, 8, 0], y: [0, 8, -6, 0], rotate: [-6, -4.5, -7, -6] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 25, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.div
          className="absolute right-10 bottom-20 h-[400px] w-[400px] rotate-45 bg-gradient-to-bl from-[#22D3EE]/30 to-transparent"
          animate={
            reduce
              ? undefined
              : { x: [0, 10, -6, 0], y: [0, -8, 4, 0], rotate: [45, 46.5, 43.5, 45] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 18, repeat: Infinity, ease: "easeInOut" }
          }
        />
        <motion.div
          className="absolute -left-10 -top-10 h-[300px] w-[500px] rotate-3 bg-gradient-to-r from-[#0369A1]/40 to-transparent"
          animate={
            reduce
              ? undefined
              : { x: [0, 8, -4, 0], y: [0, 4, -2, 0], rotate: [3, 4, 2, 3] }
          }
          transition={
            reduce
              ? undefined
              : { duration: 20, repeat: Infinity, ease: "easeInOut" }
          }
        />
      </motion.div>

      {/* Soft radial glow behind the headline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 45%, rgba(255,255,255,0.18), rgba(255,255,255,0) 70%)",
        }}
      />

      {/* Grain overlay — above gradient, below content */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 mix-blend-overlay"
        style={{ backgroundImage: NOISE_URI, opacity: 0.05 }}
      />

      {/* Hero text content — vertically centered in viewport */}
      <motion.div
        className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4"
        style={{ y: reduce ? 0 : contentY }}
      >
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.14, delayChildren: 0.05 } },
          }}
          className="flex flex-col items-center text-center"
        >
          {/* Pill badge */}
          <motion.div
            variants={{
              hidden: { opacity: 0, y: -10 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.5, ease: "easeOut" },
              },
            }}
          >
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              <motion.span
                className="h-1.5 w-1.5 rounded-full bg-[#D7F548]"
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
              Private alpha &middot; free for founding users
            </span>
          </motion.div>

          {/* Headline — line-by-line blur-to-sharp */}
          <h1 className="font-heading text-5xl font-bold tracking-tight text-white sm:text-7xl">
            <motion.span className="block" variants={LV}>
              Break into finance
            </motion.span>
            <motion.span className="block text-white/90" variants={LV}>
              through the people
            </motion.span>
            <motion.span className="block text-white/90" variants={LV}>
              you already know.
            </motion.span>
          </h1>

          {/* Subheading */}
          <motion.p
            className="mt-8 max-w-2xl text-xl leading-relaxed text-white/85"
            variants={{
              hidden: { opacity: 0, y: 16 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: "easeOut" },
              },
            }}
          >
            KithNode maps every UNC alum, Greek life brother, and NC native
            across 50+ target firms &mdash; scores the warmest paths &mdash;
            and drafts outreach that actually gets replies.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="mt-12 flex flex-col items-center gap-4 sm:flex-row"
            variants={{
              hidden: { opacity: 0, y: 16, scale: 0.95 },
              visible: {
                opacity: 1,
                y: 0,
                scale: 1,
                transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
              },
            }}
          >
            {children}
            <button
              onClick={() => {
                document
                  .getElementById("how-it-works")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="rounded-lg border border-white/40 px-10 py-4 text-base font-medium text-white transition-all hover:bg-white/10"
            >
              See it in action
            </button>
          </motion.div>

          {/* Footer credit */}
          <motion.p
            className="mt-10 max-w-xl text-sm text-white/70"
            variants={{
              hidden: { opacity: 0, y: 10 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { duration: 0.6, ease: "easeOut" },
              },
            }}
          >
            Built on a proven playbook &mdash; 500+ real alumni mapped, scored,
            and activated before writing a single line of outreach.
          </motion.p>
        </motion.div>
      </motion.div>
    </section>
  );
}

