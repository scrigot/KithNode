"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GradientBlob({
  className,
  variant = "teal",
  size = 400,
  animate = true,
}: {
  className?: string;
  variant?: "teal" | "cyan";
  size?: number;
  animate?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        "gradient-blob",
        variant === "teal" ? "gradient-blob-teal" : "gradient-blob-cyan",
        className,
      )}
      style={{ width: size, height: size }}
      animate={
        animate
          ? {
              scale: [1, 1.15, 1],
              x: [0, 20, -10, 0],
              y: [0, -15, 10, 0],
            }
          : undefined
      }
      transition={
        animate
          ? {
              duration: 12,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
    />
  );
}
