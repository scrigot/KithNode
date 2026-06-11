"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { CAREER_INFO } from "@/lib/data/career-info";
import { roleToTrack } from "@/lib/data/career-tracks";

// Career-explorer modal. Opens off the "i" affordance on each role chip in the
// track/role picker (Settings + onboarding step 2) and renders the read-only
// CAREER_INFO entry for that role as dense Bloomberg-style sections: aliases,
// what it is, how to recruit, timeline, pay-by-stage, outlook. Read-only, so no
// unsaved-state guard: Escape and backdrop both close immediately. Overlay
// conventions (fixed inset-0 z-50, bg-black/80 backdrop-blur, body scroll lock,
// max-h scrollable body) mirror the edit-profile modal.

// Uppercase micro-label heading the DETAILS/AFFILIATIONS look.
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="text-[10px] font-bold uppercase tracking-wider text-accent-teal">
      {children}
    </h4>
  );
}

// A wrapped row of small read-only chips (aliases, skills, majors).
function ChipRow({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <span
          key={item}
          className="border border-white/[0.06] bg-muted px-2 py-1 text-[11px] font-medium text-foreground"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

// One labeled sub-block inside HOW TO RECRUIT.
function SubBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

export function CareerInfoModal({
  role,
  onClose,
}: {
  role: string;
  onClose: () => void;
}) {
  // Lock body scroll + Escape closes. No dirty-state guard: this view is
  // read-only, so every close path is unconditional.
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  const info = CAREER_INFO[role];
  if (!info) return null;
  const track = roleToTrack(role);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="career-info-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col border border-primary/30 bg-card shadow-2xl shadow-primary/20">
        {/* Header: role name + owning track chip + close X */}
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <h3
              id="career-info-title"
              className="text-[13px] font-bold uppercase tracking-wider text-primary"
            >
              {role}
            </h3>
            {track && (
              <span className="border border-accent-teal/40 bg-accent-teal/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-accent-teal">
                {track}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* ALSO KNOWN AS */}
          <section className="space-y-2">
            <SectionLabel>ALSO KNOWN AS</SectionLabel>
            <ChipRow items={info.alsoKnownAs} />
          </section>

          {/* WHAT IT IS */}
          <section className="space-y-2">
            <SectionLabel>WHAT IT IS</SectionLabel>
            <p className="text-[12px] leading-relaxed text-muted-foreground">{info.summary}</p>
          </section>

          {/* HOW TO RECRUIT — majors / skills / experience */}
          <section className="space-y-3">
            <SectionLabel>HOW TO RECRUIT</SectionLabel>
            <SubBlock label="Majors">
              <ChipRow items={info.majors} />
            </SubBlock>
            <SubBlock label="Skills to build">
              <ChipRow items={info.skills} />
            </SubBlock>
            <SubBlock label="Experience">
              <ul className="space-y-1.5">
                {info.experience.map((item) => (
                  <li
                    key={item}
                    className="flex gap-2 text-[12px] leading-relaxed text-muted-foreground"
                  >
                    <span className="mt-1.5 h-1 w-1 shrink-0 bg-accent-teal" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </SubBlock>
          </section>

          {/* TIMELINE */}
          <section className="space-y-2">
            <SectionLabel>TIMELINE</SectionLabel>
            <p className="text-[12px] leading-relaxed text-muted-foreground">{info.timeline}</p>
          </section>

          {/* PAY BY STAGE */}
          <section className="space-y-2">
            <SectionLabel>PAY BY STAGE</SectionLabel>
            <div className="border border-white/[0.06]">
              {info.pay.map((p, i) => (
                <div
                  key={p.stage}
                  className={`flex items-start justify-between gap-3 px-3 py-2 ${
                    i > 0 ? "border-t border-white/[0.06]" : ""
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    {p.stage}
                  </span>
                  <span className="text-right text-[11px] text-muted-foreground">{p.range}</span>
                </div>
              ))}
            </div>
          </section>

          {/* OUTLOOK */}
          <section className="space-y-2">
            <SectionLabel>OUTLOOK</SectionLabel>
            <p className="text-[12px] leading-relaxed text-muted-foreground">{info.outlook}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
