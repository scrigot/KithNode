"use client";

import { useEffect, useState, useCallback } from "react";
import { GitBranch } from "lucide-react";
import { trackEvent } from "@/lib/posthog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { PipelineContact, PipelineResponse } from "@/lib/api";

const STAGE_LABELS: Record<string, string> = {
  researched: "RESEARCHED",
  connected: "CONNECTED",
  email_sent: "EMAIL SENT",
  follow_up: "FOLLOW UP",
  responded: "RESPONDED",
  meeting_set: "MEETING SET",
};

const STAGE_HEADER_COLORS: Record<string, string> = {
  researched: "bg-zinc-500/10 border-zinc-500/30 border-l-zinc-500",
  connected: "bg-blue-500/10 border-blue-500/30 border-l-blue-500",
  email_sent: "bg-sky-500/10 border-sky-500/30 border-l-sky-400",
  follow_up: "bg-amber-500/10 border-amber-500/30 border-l-amber-500",
  responded: "bg-green-500/10 border-green-500/30 border-l-green-500",
  meeting_set: "bg-purple-500/10 border-purple-500/30 border-l-purple-500",
};

const STAGE_BADGE_COLORS: Record<string, string> = {
  researched: "bg-zinc-500/20 text-zinc-400",
  connected: "bg-blue-500/20 text-blue-400",
  email_sent: "bg-sky-500/20 text-sky-400",
  follow_up: "bg-amber-500/20 text-amber-400",
  responded: "bg-green-500/20 text-green-400",
  meeting_set: "bg-primary/20 text-primary",
};

const TIER_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

const TIER_BADGE_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function PipelinePage() {
  const [data, setData] = useState<PipelineResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPipeline = useCallback(async () => {
    try {
      const res = await fetch("/api/pipeline");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      // silently fail
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  const moveStage = async (contactId: string, newStage: string) => {
    const res = await fetch(`/api/pipeline/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.conversion) {
        trackEvent("conversion_tracked", {
          contactId: json.conversion.contactId,
          source: json.conversion.source,
          stage: json.conversion.stage,
          warmPathCount: json.conversion.warmPathCount,
        });
      }
    }
    fetchPipeline();
  };

  const getNextStage = (current: string): string | null => {
    if (!data) return null;
    const idx = data.stages.indexOf(current);
    return idx < data.stages.length - 1 ? data.stages[idx + 1] : null;
  };

  if (loading) {
    return (
      <div className="min-h-full p-5">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 w-full animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="min-h-full p-5">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          PIPELINE
        </h2>
        <p className="mt-1 text-[10px] text-muted-foreground">
          ACTIVE OUTREACH WORKFLOW
        </p>
        <div className="mt-4 h-px bg-border" />
        <div className="mt-8 border border-white/[0.06] bg-bg-card p-10 text-center">
          <GitBranch size={32} strokeWidth={1.5} className="mx-auto mb-3 text-accent-teal" />
          <p className="text-lg font-semibold text-white">Your pipeline is empty</p>
          <p className="mt-2 text-[12px] text-text-secondary">
            Start by discovering and rating contacts, then add your top matches to the outreach pipeline.
          </p>
          <a
            href="/dashboard/discover"
            className="mt-5 inline-flex items-center gap-2 bg-accent-teal px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-teal/80"
          >
            Discover Alumni
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full p-5">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          PIPELINE
        </h2>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {data.total} CONTACTS IN PIPELINE
        </span>
      </div>
      <div className="mb-5 h-px bg-border" />

      {/* Vertical Kanban — stages stack top-to-bottom */}
      <div className="space-y-4">
        {data.stages.map((stage) => {
          const contacts = data.contacts[stage] || [];
          return (
            <div key={stage}>
              {/* Stage header bar */}
              <div
                className={`flex items-center justify-between border border-l-4 px-4 py-2.5 ${STAGE_HEADER_COLORS[stage]}`}
              >
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {STAGE_LABELS[stage]}
                </span>
                <span
                  className={`inline-flex h-5 min-w-[20px] items-center justify-center px-1.5 text-[10px] font-bold tabular-nums ${STAGE_BADGE_COLORS[stage]}`}
                >
                  {contacts.length}
                </span>
              </div>

              {/* Cards row or empty state */}
              {contacts.length === 0 ? (
                <div className="border border-dashed border-white/[0.15] bg-transparent px-6 py-6 text-center">
                  <span className="text-[12px] text-text-muted">
                    No contacts in this stage
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-3 border border-t-0 border-white/[0.06] bg-bg-card/30 p-3">
                  {contacts.map((contact: PipelineContact) => {
                    const next = getNextStage(stage);
                    const addedDate = new Date(contact.added_at || Date.now());
                    const daysSince = Math.floor(
                      (Date.now() - addedDate.getTime()) / (1000 * 60 * 60 * 24),
                    );
                    const freshness =
                      daysSince < 7
                        ? "bg-green-400"
                        : daysSince < 21
                          ? "bg-amber-400"
                          : "bg-red-400";

                    return (
                      <div
                        key={contact.id}
                        className="w-full sm:w-[220px] lg:w-[260px] border border-white/[0.06] bg-bg-card p-3"
                      >
                        {/* Name + freshness */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`h-1.5 w-1.5 shrink-0 rounded-full ${freshness}`}
                            title={`${daysSince}d since activity`}
                          />
                          <p className="truncate text-[13px] font-bold text-foreground">
                            {contact.name}
                          </p>
                        </div>

                        {/* Company */}
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {contact.company_name || contact.title}
                        </p>

                        {/* Score + Tier */}
                        <div className="mt-2 flex items-center gap-2">
                          <span
                            className={`text-[13px] font-bold tabular-nums ${TIER_STYLES[contact.tier] || "text-zinc-400"}`}
                          >
                            {Math.round(contact.total_score)}
                          </span>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 uppercase ${TIER_BADGE_STYLES[contact.tier] || TIER_BADGE_STYLES.cold}`}
                          >
                            {contact.tier}
                          </Badge>
                          {contact.linkedin_url && (
                            <a
                              href={contact.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="ml-auto text-[10px] text-accent-blue hover:underline"
                            >
                              LI
                            </a>
                          )}
                        </div>

                        {/* Affiliations */}
                        {contact.affiliations.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-0.5">
                            {contact.affiliations.map((a) => (
                              <Badge
                                key={a}
                                variant="outline"
                                className="text-[9px] px-1 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30"
                              >
                                {a}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Advance button */}
                        {next && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 h-6 w-full text-[11px]"
                            onClick={() => moveStage(contact.id, next)}
                          >
                            Advance &rarr;
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
