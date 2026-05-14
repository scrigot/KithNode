"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type VantaInstance = { destroy: () => void };

export function HeroNetwork() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [effect, setEffect] = useState<VantaInstance | null>(null);

  useEffect(() => {
    if (!containerRef.current || effect) return;
    let cancelled = false;

    (async () => {
      const NET = await import(
        // @ts-expect-error vanta has no type declarations
        "vanta/dist/vanta.net.min"
      );
      if (cancelled || !containerRef.current) return;
      const instance = NET.default({
        el: containerRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200.0,
        minWidth: 200.0,
        scale: 1.0,
        scaleMobile: 1.0,
        backgroundColor: 0x0369a1,
        backgroundAlpha: 0,
        color: 0x22d3ee,
        points: 14.0,
        maxDistance: 22.0,
        spacing: 17.0,
        showDots: true,
      }) as VantaInstance;
      setEffect(instance);
    })();

    return () => {
      cancelled = true;
    };
  }, [effect]);

  useEffect(() => () => effect?.destroy(), [effect]);

  return <div ref={containerRef} aria-hidden className="absolute inset-0" />;
}
