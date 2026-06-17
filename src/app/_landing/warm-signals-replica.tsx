"use client";

import { Users } from "lucide-react";
import { WarmSignalCard } from "@/app/dashboard/contacts/warm-signal-card";
import type { RankedContact } from "@/lib/api";

// ---------------------------------------------------------------------------
// 1:1 Warm Signals replica for the landing. Reuses the REAL dashboard
// WarmSignalCard so it is pixel-identical to the app (sharp corners, navy,
// FIT bars, tier badges, MUTUAL / +PIPELINE / DRAFT). Dashboard branding only
// (brand/dashboard.md) -- this is a product screenshot, do not round it.
// ---------------------------------------------------------------------------

const base = {
  email: "",
  email_status: "",
  signal_score: 0,
  engagement_score: 0,
  relationship_class: "" as const,
  dormant: false,
  is_friend: false,
  speak_frequency: "",
  last_spoken_at: "",
  created_at: "",
};

export const REPLICA_CONTACTS: RankedContact[] = [
  {
    ...base,
    id: "demo-riley",
    name: "Riley Chen",
    title: "Analyst",
    linkedin_url: "https://www.linkedin.com/in/riley-chen",
    education: "UNC Kenan-Flagler",
    linkedin_location: "New York, NY",
    track: "finance",
    role: "ib",
    why_now: "",
    warm_path: "Via Jake Bennett (Chi Phi) to Analyst at Goldman Sachs",
    affiliations: [
      { name: "Chi Phi", boost: 0 },
      { name: "Kenan-Flagler", boost: 0 },
    ],
    company: {
      name: "Goldman Sachs",
      domain: "gs.com",
      website: "",
      location: "New York, NY",
      industry_tags: ["Investment Banking"],
    },
    score: { fit_score: 100, signal_score: 0, engagement_score: 0, total_score: 100, tier: "kith" },
    relationship_class: "kith",
    is_friend: true,
    speak_frequency: "weekly",
    graduation_year: 2021,
  },
  {
    ...base,
    id: "demo-drew",
    name: "Drew Castro",
    title: "Associate",
    linkedin_url: "https://www.linkedin.com/in/drew-castro",
    education: "UNC Kenan-Flagler",
    linkedin_location: "Charlotte, NC",
    track: "finance",
    role: "ib",
    why_now: "",
    warm_path: "Via UNC alumni network to Associate at Lazard",
    affiliations: [
      { name: "UNC Alumni", boost: 0 },
      { name: "Kenan-Flagler", boost: 0 },
    ],
    company: {
      name: "Lazard",
      domain: "lazard.com",
      website: "",
      location: "Charlotte, NC",
      industry_tags: ["Investment Banking"],
    },
    score: { fit_score: 96, signal_score: 0, engagement_score: 0, total_score: 96, tier: "hot" },
    graduation_year: 2022,
  },
  {
    ...base,
    id: "demo-nisha",
    name: "Nisha Rao",
    title: "Vice President",
    linkedin_url: "https://www.linkedin.com/in/nisha-rao",
    education: "UNC Chapel Hill",
    linkedin_location: "New York, NY",
    track: "finance",
    role: "ib",
    why_now: "",
    warm_path: "Via Chi Phi to Vice President at Centerview",
    affiliations: [{ name: "Chi Phi", boost: 0 }],
    company: {
      name: "Centerview Partners",
      domain: "centerview.com",
      website: "",
      location: "New York, NY",
      industry_tags: ["Investment Banking"],
    },
    score: { fit_score: 88, signal_score: 0, engagement_score: 0, total_score: 88, tier: "warm" },
    graduation_year: 2019,
  },
];

const noop = () => {};
const noopAsync = async () => {};

function TierTile({
  label,
  value,
  cls,
  icon,
}: {
  label: string;
  value: number;
  cls: string;
  icon?: boolean;
}) {
  return (
    <div className={`border px-3 py-2 ${cls}`}>
      <p className="text-[9px] font-bold uppercase tracking-wider">{label}</p>
      <p className="mt-0.5 flex items-center gap-1.5 font-mono text-lg font-bold tabular-nums">
        {icon && <Users className="h-3 w-3 text-muted-foreground" />}
        {value}
      </p>
    </div>
  );
}

/**
 * The Warm Signals dashboard panel, top 3. `interactive` left false by default
 * so the demo buttons render (1:1) but the card Links/handlers are inert noops.
 */
export function WarmSignalsReplica({
  limit,
  highlightFirst,
}: {
  limit?: number;
  highlightFirst?: boolean;
}) {
  return (
    <div className="bg-bg-primary p-4">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            WARM SIGNALS
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Ranked by priority score
          </p>
        </div>
      </div>

      {/* Tier counts strip (compact 4-tile) */}
      <div className="mt-3 grid grid-cols-4 gap-2">
        <TierTile label="KITH" value={10} cls="border-amber-400/40 bg-amber-400/5 text-amber-300" />
        <TierTile label="HOT" value={24} cls="border-red-500/20 bg-red-500/5 text-red-400" />
        <TierTile label="WARM" value={32} cls="border-blue-500/20 bg-blue-500/5 text-blue-400" />
        <TierTile label="Total" value={633} cls="border-white/[0.06] bg-card text-foreground" icon />
      </div>

      <div className="mt-3 h-px bg-border" />

      {/* Top 3 contact rows -- the real WarmSignalCard */}
      <div className="mt-3 space-y-2">
        {REPLICA_CONTACTS.slice(0, limit ?? REPLICA_CONTACTS.length).map((c, i) => (
          <div
            key={c.id}
            className={
              highlightFirst && i === 0
                ? "ring-2 ring-primary/70 transition-shadow duration-300"
                : "transition-shadow duration-300"
            }
          >
            <WarmSignalCard
              contact={c}
              onAddToPipeline={noopAsync}
              onDraftOutreach={noop}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
