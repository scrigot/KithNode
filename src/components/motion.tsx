"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

export const MotionDiv = motion.div;
export const MotionH1 = motion.h1;
export const MotionP = motion.p;
export const MotionSpan = motion.span;
export const MotionSection = motion.section;

export function StaggerContainer({
  children,
  ...props
}: HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: 0.12 } },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeUp({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.5, ease: "easeOut" },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}
