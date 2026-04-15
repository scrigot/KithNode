"use client";

import { BlueBg, KineticWords } from "../primitives";

export function ColdInbox() {
  return (
    <div className="absolute inset-0">
      <BlueBg />
      <KineticWords
        startOpen
        words={[
          { text: "cold", x: "12%", y: "18%", delay: 0, size: "220px", font: "serif" },
          { text: "outreach", x: "42%", y: "42%", delay: 0.15, size: "240px" },
          { text: "is", x: "18%", y: "62%", delay: 0.3, size: "200px", font: "serif" },
          { text: "dead.", x: "55%", y: "72%", delay: 0.45, size: "260px" },
        ]}
      />
    </div>
  );
}
