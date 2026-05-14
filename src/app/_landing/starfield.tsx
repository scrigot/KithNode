"use client";

import { useMemo, type CSSProperties } from "react";

const STAR_COUNT = 120;
const SHOOTER_COUNT = 6;

type Star = {
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
};

type Shooter = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  angle: number;
  length: number;
  delay: number;
  duration: number;
};

function makeRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function generateStars(seed: number): Star[] {
  const next = makeRng(seed);
  return Array.from({ length: STAR_COUNT }, () => ({
    x: next() * 100,
    y: next() * 100,
    size: 0.6 + next() * 1.8,
    delay: next() * 6,
    duration: 2.4 + next() * 4,
  }));
}

function generateShooters(seed: number): Shooter[] {
  const next = makeRng(seed);
  return Array.from({ length: SHOOTER_COUNT }, () => {
    const dirX = next() > 0.5 ? 1 : -1;
    const dx = dirX * (50 + next() * 40); // 50-90 vw
    const dy = 35 + next() * 30; // 35-65 vh
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
    return {
      x: dirX > 0 ? next() * 40 : 60 + next() * 40,
      y: -8 + next() * 35,
      dx,
      dy,
      angle,
      length: 90 + next() * 100,
      delay: next() * 18,
      duration: 1.3 + next() * 1.4,
    };
  });
}

export function Starfield() {
  const stars = useMemo(() => generateStars(42), []);
  const shooters = useMemo(() => generateShooters(101), []);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {stars.map((star, i) => (
        <span
          key={`s-${i}`}
          className="absolute rounded-full bg-white"
          style={{
            top: `${star.y}%`,
            left: `${star.x}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `kn-twinkle ${star.duration}s ease-in-out ${star.delay}s infinite`,
            willChange: "opacity, transform",
          }}
        />
      ))}
      {shooters.map((shoot, i) => (
        <div
          key={`sh-${i}`}
          className="absolute"
          style={
            {
              top: `${shoot.y}%`,
              left: `${shoot.x}%`,
              animation: `kn-shoot ${shoot.duration}s ease-out ${shoot.delay}s infinite`,
              willChange: "transform, opacity",
              "--kn-dx": `${shoot.dx}vw`,
              "--kn-dy": `${shoot.dy}vh`,
            } as CSSProperties
          }
        >
          <span
            className="block"
            style={{
              width: `${shoot.length}px`,
              height: "1.5px",
              background:
                "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(165,243,252,0.9) 90%, rgba(255,255,255,1) 100%)",
              transform: `rotate(${shoot.angle}deg)`,
              transformOrigin: "right center",
              borderRadius: "9999px",
              filter: "drop-shadow(0 0 4px rgba(165,243,252,0.6))",
            }}
          />
        </div>
      ))}
    </div>
  );
}
