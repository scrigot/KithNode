"use client";

import { useState } from "react";
import { Info } from "lucide-react";
import { ALL_TRACKS, CAREER_TRACKS } from "@/lib/data/career-tracks";
import { CareerInfoModal } from "@/components/career-info-modal";

/**
 * Track-grouped role picker. Renders each career track as a header with its
 * roles as toggle chips beneath. Selecting a chip stores the ROLE NAME (not the
 * track) into the caller's list — the storage shape is unchanged from the old
 * flat INDUSTRY_OPTIONS picker, so the Target Industry matcher and resume
 * extractor keep working. Drop-in replacement for the flat chip row in Settings
 * and onboarding step 2.
 *
 * Each chip carries a small "i" affordance that opens a read-only career-explorer
 * modal for that role. The info button calls stopPropagation so it never toggles
 * the chip's selection.
 *
 * Controlled: caller owns `selected` (the role-name list) and `onToggle`.
 */
export function TrackRolePicker({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (role: string) => void;
}) {
  // Role whose career-explorer modal is open, or null when closed.
  const [infoRole, setInfoRole] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {ALL_TRACKS.map((track) => (
        <div key={track}>
          <h4 className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
            {track}
          </h4>
          <div className="flex flex-wrap gap-2">
            {CAREER_TRACKS[track].map((role) => {
              const active = selected.includes(role);
              return (
                <div
                  key={role}
                  className={`flex items-center border transition-colors ${
                    active
                      ? "border-accent-teal bg-accent-teal/15"
                      : "border-white/[0.06] hover:border-white/[0.12]"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onToggle(role)}
                    className={`py-1.5 pl-3 pr-2 text-[11px] font-bold transition-colors ${
                      active
                        ? "text-accent-teal"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {role}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInfoRole(role);
                    }}
                    aria-label={`About ${role}`}
                    title={`About ${role}`}
                    className={`flex h-full items-center py-1.5 pl-1 pr-2 transition-colors ${
                      active
                        ? "text-accent-teal/70 hover:text-accent-teal"
                        : "text-muted-foreground/50 hover:text-foreground"
                    }`}
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {infoRole && (
        <CareerInfoModal role={infoRole} onClose={() => setInfoRole(null)} />
      )}
    </div>
  );
}
