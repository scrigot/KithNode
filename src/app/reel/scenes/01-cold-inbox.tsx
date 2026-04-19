"use client";

import { BlueBg, KineticWords } from "../primitives";

// Intentionally NO `startOpen`. The previous pop-from-55%-opacity created a
// visible snap at the top of the loop. Each word fades in from zero with a
// small delay so the scene begins on a nearly pure blue frame — seamless when
// the logo-lockup outro fades to the same blue before cutting back here.
export function ColdInbox() {
  return (
    <div className="absolute inset-0">
      <BlueBg />
      <KineticWords
        words={[
          { text: "cold", x: "12%", y: "18%", delay: 0.15, size: "220px", font: "serif" },
          { text: "outreach", x: "42%", y: "42%", delay: 0.3, size: "240px" },
          { text: "is", x: "18%", y: "62%", delay: 0.45, size: "200px", font: "serif" },
          { text: "dead.", x: "55%", y: "72%", delay: 0.6, size: "260px" },
        ]}
      />
    </div>
  );
}
