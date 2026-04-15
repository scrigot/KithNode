"use client";

import { useEffect, useRef } from "react";
import createGlobe from "cobe";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
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

const UNIVERSITY_MARKERS = [
  { location: [35.91, -79.05] as [number, number], size: 0.04 },  // UNC
  { location: [36.0, -78.94] as [number, number], size: 0.03 },   // Duke
  { location: [36.13, -80.28] as [number, number], size: 0.03 },  // Wake Forest
  { location: [35.79, -78.68] as [number, number], size: 0.03 },  // NC State
  { location: [38.03, -78.51] as [number, number], size: 0.03 },  // UVA
  { location: [38.91, -77.07] as [number, number], size: 0.03 },  // Georgetown
  { location: [40.73, -73.99] as [number, number], size: 0.03 },  // NYU
  { location: [42.28, -83.74] as [number, number], size: 0.03 },  // Michigan
  { location: [36.15, -86.8] as [number, number], size: 0.03 },   // Vanderbilt
  { location: [33.79, -84.32] as [number, number], size: 0.03 },  // Emory
];

export function LogoCarousel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: "start", dragFree: true },
    [Autoplay({ delay: 2000, stopOnInteraction: false, stopOnMouseEnter: true })]
  );

  useEffect(() => {
    if (!canvasRef.current) return;

    let phi = 4.4; // Start centered on US (roughly -95 degrees longitude)
    let frameId: number;

    const globe = createGlobe(canvasRef.current, {
      devicePixelRatio: 2,
      width: 1000,
      height: 1000,
      phi,
      theta: 0.25,
      dark: 1,
      diffuse: 0.8,
      mapSamples: 40000,
      mapBrightness: 2.5,
      mapBaseBrightness: 0.05,
      baseColor: [0.04, 0.08, 0.14],
      markerColor: [0.05, 0.65, 0.91],
      glowColor: [0.04, 0.2, 0.35],
      scale: 1.05,
      offset: [0, 0],
      markers: UNIVERSITY_MARKERS,
    });

    function animate() {
      phi += 0.002;
      globe.update({ phi });
      frameId = requestAnimationFrame(animate);
    }
    frameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(frameId);
      globe.destroy();
    };
  }, []);

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#060d18] via-[#0a1628] to-[#060d18] py-20">
      <ScrollReveal>
        <p className="mb-2 text-center text-sm font-medium uppercase tracking-widest text-slate-500">
          Building the network
        </p>
        <h2 className="mb-10 text-center text-2xl font-bold tracking-tight text-white sm:text-3xl">
          Trusted by students across top universities
        </h2>
      </ScrollReveal>

      {/* WebGL Globe */}
      <ScrollReveal delay={0.15}>
        <div className="mx-auto mb-14 flex justify-center px-4">
          <div className="relative h-[420px] w-[420px] sm:h-[500px] sm:w-[500px]">
            {/* Outer atmosphere glow */}
            <div className="absolute -inset-10 rounded-full bg-[#0EA5E9]/[0.06] blur-3xl" />
            <canvas
              ref={canvasRef}
              className="h-full w-full"
              style={{ width: "100%", height: "100%", contain: "layout paint size" }}
            />
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
