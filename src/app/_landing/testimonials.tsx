"use client";

import { useRef, useCallback } from "react";
import {
  motion,
  useScroll,
  useTransform,
} from "framer-motion";

// ---------------------------------------------------------------------------
// SVG mesh -- same node/edge data as solutions-section for consistency
// ---------------------------------------------------------------------------

const MESH_NODES = [
  { x: 5, y: 8 }, { x: 20, y: 5 }, { x: 35, y: 12 }, { x: 50, y: 6 },
  { x: 65, y: 10 }, { x: 80, y: 7 }, { x: 95, y: 4 }, { x: 12, y: 22 },
  { x: 28, y: 28 }, { x: 45, y: 20 }, { x: 60, y: 25 }, { x: 75, y: 18 },
  { x: 90, y: 22 }, { x: 3, y: 40 }, { x: 18, y: 45 }, { x: 33, y: 38 },
  { x: 50, y: 42 }, { x: 67, y: 36 }, { x: 82, y: 44 }, { x: 97, y: 38 },
  { x: 8, y: 60 }, { x: 25, y: 58 }, { x: 42, y: 62 }, { x: 58, y: 55 },
  { x: 73, y: 60 }, { x: 88, y: 57 }, { x: 14, y: 78 }, { x: 30, y: 75 },
  { x: 48, y: 80 }, { x: 64, y: 76 }, { x: 80, y: 82 }, { x: 95, y: 74 },
];

const MESH_EDGES: { x1: number; y1: number; x2: number; y2: number }[] = [];
for (let i = 0; i < MESH_NODES.length; i++) {
  const a = MESH_NODES[i];
  const distances = MESH_NODES
    .map((b, j) => ({ j, d: Math.hypot(b.x - a.x, b.y - a.y) }))
    .filter(({ j }) => j !== i)
    .sort((p, q) => p.d - q.d)
    .slice(0, 2);
  for (const { j } of distances) {
    if (j > i) {
      const b = MESH_NODES[j];
      MESH_EDGES.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
  }
}

// ---------------------------------------------------------------------------
// FounderCard -- glass card with 3D mouse tilt (max 4 degrees)
// ---------------------------------------------------------------------------

function FounderCard() {
  const cardRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = cardRef.current;
    if (!el) return;
    if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(() => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const nx = (e.clientX - cx) / (rect.width / 2);
      const ny = (e.clientY - cy) / (rect.height / 2);
      // Max 4 degrees -- gentler than solution cards since this is a long text card
      const rx = ny * -4;
      const ry = nx * 4;
      el.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.005)`;
      el.style.transition = "transform 0.05s linear";
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    const el = cardRef.current;
    if (!el) return;
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    el.style.transform = "perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)";
    el.style.transition = "transform 0.4s ease-out";
  }, []);

  return (
    /* Gradient border wrapper -- same conic pattern as solutions-section */
    <div className="card-border-wrapper-founder group relative rounded-xl p-px">
      <div
        className="card-border-ring-founder pointer-events-none absolute inset-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />
      {/* Inner glass card */}
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.04] p-8 backdrop-blur-sm md:p-10"
      >
        {/* Body copy */}
        <div className="space-y-5 text-base leading-relaxed text-white/80">
          <p>
            Every finance hire traces back to the same pattern. A{" "}
            <span className="font-bold text-[#0EA5E9]">
              warm connection
            </span>{" "}
            two or three degrees away that surfaced at the right moment. The
            pattern is well documented. The execution, finding those
            connections, scoring them, and drafting outreach that
            doesn&apos;t feel robotic, is what kills candidates.
          </p>
          <p>
            KithNode was built by an operator who ran this exact playbook
            manually. That playbook landed a{" "}
            <span className="font-bold text-[#0EA5E9]">
              Fortune 500 internship
            </span>{" "}
            freshman year. Every feature in the product exists because a
            student tried it at 2am and found the friction. We&apos;re not
            shipping theories. We&apos;re shipping the method that already
            works.
          </p>
          <p>
            Founding access is open now. If you&apos;re serious about 2026
            recruiting, request access below.
          </p>
        </div>

        {/* Teal divider above signature */}
        <div className="mt-8 h-px bg-gradient-to-r from-transparent via-[#0EA5E9]/30 to-transparent" />

        {/* Signature */}
        <div className="mt-6 flex items-center gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0EA5E9]/15 text-sm font-bold text-[#0EA5E9]">
            SR
          </div>
          <div>
            <p className="text-sm font-bold text-white">Sam Rigot</p>
            <p className="text-xs text-white/60">
              Founder &middot; UNC Chapel Hill &apos;29 &middot; Fortune 500
              Intern, Summer 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Testimonials (Founder Letter)
// ---------------------------------------------------------------------------

export function Testimonials() {
  const sectionRef = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const headingOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0.4]);

  return (
    <section
      id="founder"
      ref={sectionRef}
      className="relative bg-black py-24 px-4"
    >
      {/* ------------------------------------------------------------------ */}
      {/* Keyframes */}
      {/* ------------------------------------------------------------------ */}
      <style>{`
        @keyframes mesh-pulse-founder {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.9; }
        }
        .mesh-node-founder {
          animation: mesh-pulse-founder var(--df, 3s) ease-in-out infinite;
        }

        @keyframes border-spin-founder {
          to { --border-angle-founder: 360deg; }
        }

        @property --border-angle-founder {
          syntax: "<angle>";
          inherits: false;
          initial-value: 0deg;
        }

        .card-border-ring-founder {
          background: conic-gradient(
            from var(--border-angle-founder, 0deg),
            #0EA5E9, #22D3EE, #06B6D4, #0EA5E9
          );
          animation: border-spin-founder 4s linear infinite;
        }

        .card-border-wrapper-founder {
          position: relative;
        }
        .card-border-ring-founder::before {
          content: "";
          position: absolute;
          inset: 1px;
          border-radius: calc(0.75rem - 1px);
          background: #050d1a;
        }
      `}</style>

      {/* ------------------------------------------------------------------ */}
      {/* SVG mesh background */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        {/* Radial teal halo centered on the card */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 70% at 50% 55%, rgba(14,165,233,0.06) 0%, transparent 70%)",
          }}
        />
        {/* Dot + line mesh */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="xMidYMid slice"
        >
          {MESH_EDGES.map((e, i) => (
            <line
              key={i}
              x1={`${e.x1}%`}
              y1={`${e.y1}%`}
              x2={`${e.x2}%`}
              y2={`${e.y2}%`}
              stroke="#0EA5E9"
              strokeOpacity="0.10"
              strokeWidth="0.15"
            />
          ))}
          {MESH_NODES.map((n, i) => (
            <circle
              key={i}
              cx={`${n.x}%`}
              cy={`${n.y}%`}
              r="0.4"
              fill="#0EA5E9"
              className="mesh-node-founder"
              style={{ "--df": `${2.5 + (i % 5) * 0.4}s` } as React.CSSProperties}
            />
          ))}
        </svg>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Sticky heading */}
      {/* ------------------------------------------------------------------ */}
      <div className="sticky top-20 z-10 mb-16">
        <motion.div style={{ opacity: headingOpacity }}>
          <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-widest text-[#0EA5E9]">
            From the Founder
          </p>
          <h2 className="text-center font-heading text-4xl font-bold text-white md:text-5xl">
            Why KithNode exists
          </h2>
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Founder card -- scroll-reveal + perspective */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="relative mx-auto max-w-3xl"
        style={{ perspective: 1200 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <FounderCard />
        </motion.div>
      </div>
    </section>
  );
}
