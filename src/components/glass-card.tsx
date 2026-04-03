"use client";

import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  glowColor = "teal",
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: "teal" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-none border border-white/[0.08] bg-white/[0.04] p-6 backdrop-blur-xl transition-all",
        glowColor === "teal"
          ? "hover:glow-teal hover:border-accent-teal/20"
          : "hover:glow-amber hover:border-accent-amber/20",
        className,
      )}
    >
      {children}
    </div>
  );
}
