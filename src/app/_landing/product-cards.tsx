"use client";

import * as React from "react";
import { ScrollReveal } from "@/components/scroll-reveal";
import { Radar, Sparkles, Send, Search, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface Product {
  title: string;
  description: string;
  Icon: LucideIcon;
  gradientFrom: string;
  gradientTo: string;
  shadowColor: string;
}

const PRODUCTS: Product[] = [
  {
    title: "Signal Detection",
    description:
      "Automatically surface alumni at your target firms. Job changes, promotions, and shared connections — tracked in real time.",
    Icon: Radar,
    gradientFrom: "#0EA5E9",
    gradientTo: "#06B6D4",
    shadowColor: "rgba(14,165,233,0.25)",
  },
  {
    title: "AI Scoring",
    description:
      "Every contact gets a warmth score based on shared affiliations, activity signals, and reachability. Focus on your highest-probability paths.",
    Icon: Sparkles,
    gradientFrom: "#F59E0B",
    gradientTo: "#F97316",
    shadowColor: "rgba(245,158,11,0.25)",
  },
  {
    title: "Smart Outreach",
    description:
      "AI-drafted messages that feel authentic, not robotic. Personalized to every contact's background and your shared connections.",
    Icon: Send,
    gradientFrom: "#22C55E",
    gradientTo: "#10B981",
    shadowColor: "rgba(34,197,94,0.25)",
  },
  {
    title: "Discover Pipeline",
    description:
      "Find new contacts beyond your existing network. KithNode searches, scores, and surfaces warm paths you didn't know existed.",
    Icon: Search,
    gradientFrom: "#8B5CF6",
    gradientTo: "#7C3AED",
    shadowColor: "rgba(139,92,246,0.25)",
  },
  {
    title: "Pipeline Management",
    description:
      "Track every relationship from first touch to coffee chat. Never drop the ball on a warm lead again.",
    Icon: Layers,
    gradientFrom: "#3B82F6",
    gradientTo: "#6366F1",
    shadowColor: "rgba(59,130,246,0.25)",
  },
];

function ProductCard({ product }: { product: Product }) {
  const [cardHovered, setCardHovered] = React.useState(false);
  const [arrowHovered, setArrowHovered] = React.useState(false);

  return (
    <div
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1"
      style={{
        boxShadow: cardHovered
          ? `0 20px 40px -12px ${product.shadowColor}`
          : "none",
      }}
      onMouseEnter={() => setCardHovered(true)}
      onMouseLeave={() => setCardHovered(false)}
    >
      {/* Gradient header strip */}
      <div
        className="h-2"
        style={{
          background: `linear-gradient(to right, ${product.gradientFrom}, ${product.gradientTo})`,
        }}
      />

      {/* Visual header area with abstract pattern */}
      <div
        className="relative h-32 p-6"
        style={{
          background: `linear-gradient(135deg, ${product.gradientFrom}15, ${product.gradientTo}08)`,
        }}
      >
        {/* Abstract dot pattern */}
        <svg
          className="absolute right-4 top-4 opacity-20"
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
        >
          {[0, 16, 32, 48].map((x) =>
            [0, 16, 32, 48].map((y) => (
              <circle
                key={`${x}-${y}`}
                cx={x + 4}
                cy={y + 4}
                r="2.5"
                fill={product.gradientFrom}
              />
            ))
          )}
        </svg>

        {/* Abstract wave */}
        <svg
          className="absolute bottom-0 left-0 w-full opacity-10"
          height="40"
          viewBox="0 0 400 40"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d="M0 30 C100 10, 200 40, 300 15 S400 25, 400 25 L400 40 L0 40 Z"
            fill={product.gradientFrom}
          />
        </svg>

        {/* Icon container */}
        <div
          className="flex h-14 w-14 items-center justify-center rounded-xl text-white shadow-lg"
          style={{
            background: `linear-gradient(135deg, ${product.gradientFrom}, ${product.gradientTo})`,
            boxShadow: `0 8px 16px -4px ${product.shadowColor}`,
          }}
        >
          <product.Icon className="h-6 w-6" />
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-6 pt-4">
        <h3 className="font-heading text-lg font-semibold text-slate-900">
          {product.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">
          {product.description}
        </p>

        {/* Arrow button */}
        <div className="mt-4 flex items-center">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-full border transition-all duration-300"
            style={{
              borderColor: arrowHovered ? product.gradientFrom : "#e2e8f0",
              backgroundColor: arrowHovered ? product.gradientFrom : "transparent",
              color: arrowHovered ? "#fff" : "#94a3b8",
            }}
            onMouseEnter={() => setArrowHovered(true)}
            onMouseLeave={() => setArrowHovered(false)}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}

export function ProductCards() {
  return (
    <section
      id="products"
      className="bg-gradient-to-b from-white via-slate-50 to-white py-24 px-4"
    >
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <h2 className="mb-4 text-center font-heading text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Everything you need to network smarter
          </h2>
          <p className="mx-auto mb-16 max-w-xl text-center text-slate-600">
            From finding the right people to landing the meeting — KithNode
            handles the entire networking workflow.
          </p>
        </ScrollReveal>

        {/* First 4 cards in 2x2 grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {PRODUCTS.slice(0, 4).map((product, i) => (
            <ScrollReveal key={product.title} delay={i * 0.05}>
              <ProductCard product={product} />
            </ScrollReveal>
          ))}
        </div>

        {/* 5th card centered below */}
        <div className="mt-6 flex justify-center">
          <div className="w-full sm:w-[calc(50%-12px)]">
            <ScrollReveal delay={4 * 0.05}>
              <ProductCard product={PRODUCTS[4]} />
            </ScrollReveal>
          </div>
        </div>
      </div>
    </section>
  );
}
