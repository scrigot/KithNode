"use client";

import { ALL_TRACKS, CAREER_TRACKS } from "@/lib/data/career-tracks";

/**
 * Track-grouped role picker. Renders each career track as a header with its
 * roles as toggle chips beneath. Selecting a chip stores the ROLE NAME (not the
 * track) into the caller's list — the storage shape is unchanged from the old
 * flat INDUSTRY_OPTIONS picker, so the Target Industry matcher and resume
 * extractor keep working. Drop-in replacement for the flat chip row in Settings
 * and onboarding step 2.
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
                <button
                  key={role}
                  type="button"
                  onClick={() => onToggle(role)}
                  className={`border px-3 py-1.5 text-[11px] font-bold transition-colors ${
                    active
                      ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                      : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
