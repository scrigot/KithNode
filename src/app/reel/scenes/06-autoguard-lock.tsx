"use client";

import { CreamBg, KineticWords } from "../primitives";

export function AutoGuardLock() {
  return (
    <div className="absolute inset-0">
      <CreamBg />
      <KineticWords
        startOpen
        words={[
          { text: "AI", x: "12%", y: "10%", delay: 0.05, size: "280px", font: "serif", color: "#1D3FE0" },
          { text: "steps", x: "42%", y: "28%", delay: 0.18, size: "220px", color: "#1D3FE0" },
          { text: "back", x: "14%", y: "44%", delay: 0.32, size: "280px", color: "#1D3FE0" },
          { text: "when", x: "50%", y: "54%", delay: 0.46, size: "200px", font: "serif", color: "#1D3FE0" },
          { text: "they", x: "14%", y: "68%", delay: 0.6, size: "220px", color: "#1D3FE0" },
          { text: "reply.", x: "46%", y: "76%", delay: 0.74, size: "260px", font: "serif", color: "#1D3FE0" },
        ]}
      />
    </div>
  );
}
