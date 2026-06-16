"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { Starfield } from "./starfield";
import { EmailMacDemo } from "./section-email-mac";

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
    <section ref={ref} className="relative overflow-hidden bg-black">
      {/* Twinkling starfield */}
      <Starfield />

      {/* Centered copy column */}
      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center px-6 pt-28 text-center sm:pt-36"
        style={{ y: reduce ? 0 : contentY }}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: { staggerChildren: 0.14, delayChildren: 0.05 },
          },
        }}
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
          <span className="mb-6 inline-flex w-fit items-center gap-2 whitespace-nowrap rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-cyan-200 backdrop-blur-sm">
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
            Private alpha &middot; free for early users
          </span>
        </motion.div>

        {/* Headline */}
        <h1 className="font-heading text-[clamp(2.75rem,7vw,80px)] font-medium leading-[1.05] tracking-[-0.0125em] text-white">
          <motion.span className="block" variants={LV}>
            #1 CRM for
          </motion.span>
          <motion.span
            className="block bg-gradient-to-r from-cyan-300 via-cyan-400 to-sky-500 bg-clip-text text-transparent"
            variants={LV}
          >
            Finance Recruiting
          </motion.span>
        </h1>

        {/* Subhead */}
        <motion.p
          className="mx-auto mt-6 max-w-2xl text-[19px] leading-relaxed tracking-[-0.02em] text-white/60"
          variants={fadeUp}
        >
          KithNode maps warm connections you already have and drafts personalized
          outreach emails.
        </motion.p>

        {/* Single CTA */}
        <motion.div className="mt-10 flex justify-center" variants={fadeUp}>
          {children}
        </motion.div>
      </motion.div>

      {/* Bare product demo -- the email being drafted on the warmest path */}
      <motion.div
        className="relative z-10 mx-auto mt-14 w-full max-w-6xl px-6 pb-24 sm:mt-20"
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <EmailMacDemo />
      </motion.div>
    </section>
  );
}
