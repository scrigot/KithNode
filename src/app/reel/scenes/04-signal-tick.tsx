"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { BlueBg } from "../primitives";

const WORDS = [
  "job change",
  "promotion",
  "LinkedIn post",
  "alumni mixer",
  "company move",
  "fundraise",
  "conference talk",
  "recruiting signal",
  "warm intro",
  "hometown hit",
];

const STEP = 120;

export function SignalTick() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setActive((i) => {
        if (i >= WORDS.length - 1) {
          clearInterval(t);
          return i;
        }
        return i + 1;
      });
    }, 400);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden">
      <BlueBg />

      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.35 }}
        className="absolute left-[8%] top-1/2 -translate-y-1/2 font-heading text-[120px] font-bold leading-none tracking-tight text-white"
      >
        catch every
      </motion.div>

      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ left: "55%", height: STEP, overflow: "visible" }}
      >
        <motion.div
          animate={{ y: -active * STEP }}
          transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.7 }}
          className="absolute left-0 top-0"
          style={{ width: "900px" }}
        >
          {WORDS.map((w, i) => {
            const isActive = i === active;
            return (
              <div
                key={w}
                style={{ height: STEP }}
                className="flex items-center font-heading font-bold leading-none tracking-tight text-white"
              >
                <motion.span
                  animate={{
                    fontSize: isActive ? "120px" : "36px",
                    opacity: isActive ? 1 : 0.2,
                  }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  {w}
                </motion.span>
              </div>
            );
          })}
        </motion.div>
      </div>
    </div>
  );
}
