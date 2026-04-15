"use client";

import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { motion } from "framer-motion";
import { ScrollReveal } from "@/components/scroll-reveal";

const UNIVERSITIES = [
  "UNC Chapel Hill",
  "Duke",
  "Wake Forest",
  "NC State",
  "UVA",
  "Georgetown",
  "NYU",
  "Michigan",
  "Vanderbilt",
  "Emory",
];

const UNIVERSITY_DOTS = [
  { name: "UNC Chapel Hill", x: "47%", y: "44%", ping: 2.5 },
  { name: "Duke University", x: "48%", y: "42%", ping: 3.0 },
  { name: "Wake Forest", x: "46%", y: "41%", ping: 2.8 },
  { name: "NC State", x: "47.5%", y: "43%", ping: 3.2 },
  { name: "UVA", x: "46%", y: "39%", ping: 2.7 },
  { name: "Georgetown", x: "47%", y: "38%", ping: 3.1 },
  { name: "NYU", x: "49%", y: "36%", ping: 2.6 },
  { name: "Michigan", x: "40%", y: "37%", ping: 3.4 },
  { name: "Vanderbilt", x: "39%", y: "44%", ping: 2.9 },
  { name: "Emory", x: "42%", y: "46%", ping: 3.3 },
];

// Real country outline paths - orthographic projection centered on US (~40N, 95W)
const WORLD_PATHS = [
  // USA (lower 48)
  {
    d: "M165,195 L168,192 L172,190 L178,188 L185,186 L192,185 L200,184 L210,183 L218,184 L225,186 L232,189 L238,192 L242,196 L245,200 L248,205 L250,210 L252,216 L253,222 L252,228 L250,232 L247,235 L243,238 L238,240 L232,242 L225,243 L218,243 L210,242 L202,240 L195,238 L190,235 L186,232 L182,228 L178,222 L174,215 L170,208 L167,200 Z",
    stroke: "rgba(14, 165, 233, 0.5)",
    fill: "rgba(14, 165, 233, 0.08)",
    highlighted: true,
  },
  // Canada
  {
    d: "M155,140 L165,135 L180,130 L195,128 L210,127 L225,128 L240,132 L255,138 L265,145 L272,155 L275,165 L272,175 L265,182 L255,186 L248,188 L242,192 L238,192 L232,189 L225,186 L218,184 L210,183 L200,184 L192,185 L185,186 L178,188 L172,190 L168,192 L165,195 L160,190 L155,180 L152,170 L150,160 L152,150 Z",
    stroke: "rgba(14, 165, 233, 0.3)",
    fill: "rgba(14, 165, 233, 0.04)",
    highlighted: false,
  },
  // Mexico + Central America
  {
    d: "M165,195 L167,200 L170,208 L174,215 L178,222 L175,228 L170,235 L165,242 L160,248 L158,255 L160,262 L165,268 L170,272 L175,275 L180,278 L185,280 L188,275 L190,270 L195,265 L200,260 L205,255 L208,250 L210,242 L202,240 L195,238 L190,235 L186,232 L182,228 Z",
    stroke: "rgba(14, 165, 233, 0.25)",
    fill: "rgba(14, 165, 233, 0.03)",
    highlighted: false,
  },
  // South America (visible portion)
  {
    d: "M185,280 L190,285 L198,292 L208,300 L218,310 L225,322 L228,335 L226,348 L220,360 L212,370 L202,375 L192,372 L185,365 L180,355 L178,342 L180,328 L182,315 L183,300 L182,290 Z",
    stroke: "rgba(14, 165, 233, 0.2)",
    fill: "rgba(14, 165, 233, 0.02)",
    highlighted: false,
  },
  // Europe (partial, right edge)
  {
    d: "M320,140 L330,135 L340,138 L348,145 L352,155 L350,165 L345,175 L338,182 L330,185 L322,183 L315,178 L310,170 L308,160 L310,150 L315,143 Z",
    stroke: "rgba(14, 165, 233, 0.18)",
    fill: "rgba(14, 165, 233, 0.02)",
    highlighted: false,
  },
  // Africa (partial, right edge)
  {
    d: "M335,195 L345,200 L355,210 L360,225 L358,242 L352,258 L342,268 L332,265 L325,255 L322,240 L324,225 L328,210 Z",
    stroke: "rgba(14, 165, 233, 0.12)",
    fill: "rgba(14, 165, 233, 0.01)",
    highlighted: false,
  },
  // Greenland
  {
    d: "M260,95 L270,90 L282,88 L290,92 L295,100 L292,110 L285,118 L275,122 L265,120 L258,112 L256,104 Z",
    stroke: "rgba(14, 165, 233, 0.2)",
    fill: "rgba(14, 165, 233, 0.03)",
    highlighted: false,
  },
  // Alaska
  {
    d: "M115,145 L125,140 L138,138 L148,142 L152,150 L150,158 L144,162 L135,160 L125,156 L118,150 Z",
    stroke: "rgba(14, 165, 233, 0.25)",
    fill: "rgba(14, 165, 233, 0.03)",
    highlighted: false,
  },
];

// Latitude line Y-offsets from center
const LAT_OFFSETS = [-150, -100, -50, 0, 50, 100, 150];
// Longitude line X-offsets from center
const LON_OFFSETS = [-150, -100, -50, 0, 50, 100, 150];

export function LogoCarousel() {
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: true },
    [Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#060d18] via-[#0a1628] to-[#060d18] py-20">
      {/* Custom ping keyframes for variable durations */}
      <style>{`
        @keyframes uni-ping {
          75%, 100% {
            transform: scale(2.5);
            opacity: 0;
          }
        }
      `}</style>

      <ScrollReveal>
        <p className="mb-2 text-center text-sm font-medium uppercase tracking-widest text-slate-500">
          Building the network
        </p>
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Trusted by students across top universities
        </h2>
      </ScrollReveal>

      {/* Globe */}
      <ScrollReveal delay={0.15}>
        <div className="mx-auto mb-14 px-4">
          <div className="relative mx-auto h-[420px] w-[420px] sm:h-[500px] sm:w-[500px]">
            {/* Outer atmosphere glow */}
            <div className="absolute -inset-8 rounded-full bg-[#0EA5E9]/5 blur-3xl" />
            <div className="absolute -inset-3 rounded-full bg-[#0EA5E9]/[0.08] blur-xl" />

            {/* Globe sphere */}
            <div
              className="absolute inset-0 overflow-hidden rounded-full"
              style={{
                background:
                  "radial-gradient(circle at 35% 35%, #1a2744, #0c1929 50%, #060d18)",
              }}
            >
              {/* Grid lines */}
              <svg
                viewBox="0 0 500 500"
                className="absolute inset-0 h-full w-full"
              >
                <defs>
                  <clipPath id="globe-mask">
                    <circle cx="250" cy="250" r="249" />
                  </clipPath>
                </defs>
                <g clipPath="url(#globe-mask)">
                  {/* Latitude lines */}
                  {LAT_OFFSETS.map((y) => {
                    const r = Math.sqrt(Math.max(0, 249 * 249 - y * y));
                    return (
                      <ellipse
                        key={`lat-${y}`}
                        cx="250"
                        cy={250 + y}
                        rx={r}
                        ry={r * 0.15}
                        fill="none"
                        stroke="rgba(14, 165, 233, 0.06)"
                        strokeWidth="0.5"
                      />
                    );
                  })}
                  {/* Longitude lines */}
                  {LON_OFFSETS.map((x) => (
                    <ellipse
                      key={`lon-${x}`}
                      cx={250 + x}
                      cy="250"
                      rx={Math.abs(Math.cos((x / 250) * Math.PI / 2) * 15)}
                      ry="249"
                      fill="none"
                      stroke="rgba(14, 165, 233, 0.06)"
                      strokeWidth="0.5"
                    />
                  ))}
                </g>
              </svg>

              {/* Country outlines - gentle sway */}
              <motion.svg
                viewBox="0 0 500 500"
                className="absolute inset-0 h-full w-full"
                animate={{ rotate: [0, 3, 0, -3, 0] }}
                transition={{
                  duration: 120,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <defs>
                  <clipPath id="globe-clip">
                    <circle cx="250" cy="250" r="248" />
                  </clipPath>
                </defs>
                <g clipPath="url(#globe-clip)">
                  {WORLD_PATHS.map((path, i) => (
                    <path
                      key={i}
                      d={path.d}
                      fill={path.fill}
                      stroke={path.stroke}
                      strokeWidth={path.highlighted ? "1.2" : "0.6"}
                    />
                  ))}
                </g>
              </motion.svg>

              {/* Specular highlight */}
              <div className="absolute left-[10%] top-[8%] h-[45%] w-[45%] rounded-full bg-gradient-to-br from-white/[0.04] to-transparent" />

              {/* Edge shadow for sphere depth */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: "inset 0 0 80px 20px rgba(0,0,0,0.5)",
                }}
              />
            </div>

            {/* University dots (fixed, don't rotate) */}
            {UNIVERSITY_DOTS.map((uni) => (
              <div
                key={uni.name}
                className="group absolute cursor-pointer"
                style={{
                  left: uni.x,
                  top: uni.y,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <div className="relative">
                  {/* Ping animation */}
                  <div
                    className="absolute -inset-2 rounded-full bg-[#0EA5E9]/30"
                    style={{
                      animation: `uni-ping ${uni.ping}s cubic-bezier(0, 0, 0.2, 1) infinite`,
                    }}
                  />
                  {/* Dot */}
                  <div className="relative h-3 w-3 rounded-full bg-[#0EA5E9] shadow-[0_0_8px_2px_rgba(14,165,233,0.5)] transition-transform group-hover:scale-150" />
                </div>
                {/* Tooltip */}
                <span className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#0EA5E9]/90 px-2.5 py-1 text-[10px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  {uni.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>

      {/* Carousel */}
      <ScrollReveal delay={0.3}>
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex">
            {UNIVERSITIES.map((uni) => (
              <div
                key={uni}
                className="flex min-w-0 shrink-0 basis-1/3 items-center justify-center px-6 sm:basis-1/4 md:basis-1/5"
              >
                <span className="whitespace-nowrap text-lg font-bold tracking-tight text-slate-400 transition-colors hover:text-white">
                  {uni}
                </span>
              </div>
            ))}
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
