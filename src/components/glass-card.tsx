"use client";

import { cn } from "@/lib/utils";

const accentBorderMap = {
  teal: "border-l-accent-teal",
  amber: "border-l-accent-amber",
  green: "border-l-accent-green",
};

export function GlassCard({
  children,
  className,
  glowColor = "teal",
  accentColor,
}: {
  children: React.ReactNode;
  className?: string;
  glowColor?: "teal" | "amber";
  accentColor?: "teal" | "amber" | "green";
}) {
  return (
    <div
      className={cn(
        "rounded-none border border-white/[0.08] border-l-2 bg-white/[0.04] p-6 backdrop-blur-xl transition-all",
        accentBorderMap[accentColor ?? "teal"],
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
