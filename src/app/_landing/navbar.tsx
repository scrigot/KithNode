"use client";

import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { LogoIcon } from "@/components/logo";

export function Navbar() {
  const { scrollY } = useScroll();
  const scrolled = useTransform(scrollY, [0, 100], [0, 1]);

  return (
    <motion.nav
      className="fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between px-6"
      style={{
        backgroundColor: useTransform(scrolled, (v) =>
          v > 0.5 ? `rgba(255, 255, 255, ${v})` : "transparent"
        ),
        borderBottom: useTransform(scrolled, (v) =>
          v > 0.5 ? `1px solid rgba(15, 23, 42, ${v * 0.08})` : "none"
        ),
        backdropFilter: useTransform(scrolled, (v) =>
          v > 0.5 ? `blur(${v * 12}px)` : "none"
        ),
      }}
    >
      <div className="flex items-center gap-8">
        <motion.span
          className="inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight"
          style={{
            color: useTransform(scrolled, (v) => (v > 0.5 ? "#0f172a" : "#ffffff")),
          }}
        >
          <LogoIcon className="h-7 w-7" />
          <span>
            Kith<span className="text-[#0EA5E9]">Node</span>
          </span>
        </motion.span>
        <div className="hidden items-center gap-6 md:flex">
          {["Products", "Solutions", "How It Works"].map((label) => (
            <motion.a
              key={label}
              href={`#${label.toLowerCase().replace(/ /g, "-")}`}
              className="text-sm font-medium transition-colors"
              style={{
                color: useTransform(scrolled, (v) =>
                  v > 0.5 ? "#475569" : "rgba(255,255,255,0.8)"
                ),
              }}
            >
              {label}
            </motion.a>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="/waitlist"
          className="rounded-lg bg-white/20 px-5 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-all hover:bg-white/30"
        >
          Request Access
        </Link>
      </div>
    </motion.nav>
  );
}
