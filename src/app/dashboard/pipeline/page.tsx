"use client";

import { useEffect, useState, useCallback } from "react";
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

const STAGE_COLORS: Record<string, string> = {
  researched: "border-zinc-500/30",
  connected: "border-blue-500/30",
  email_sent: "border-accent-blue",
  follow_up: "border-amber-500/30",
  responded: "border-green-500/30",
  meeting_set: "border-primary",
};

const TIER_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
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
    await fetch(`/api/pipeline/${contactId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    fetchPipeline();
  };

  const getNextStage = (current: string): string | null => {
    if (!data) return null;
    const idx = data.stages.indexOf(current);
    return idx < data.stages.length - 1 ? data.stages[idx + 1] : null;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-4 w-32 animate-pulse bg-muted" />
        <div className="mt-4 flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 w-40 animate-pulse bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className="p-6">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          PIPELINE
        </h2>
        <p className="mt-1 text-[10px] text-muted-foreground">
          ACTIVE OUTREACH WORKFLOW
        </p>
        <div className="mt-4 h-px bg-border" />
        <div className="mt-8 border border-white/[0.06] bg-bg-card p-10 text-center">
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
    <div className="p-6">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
          PIPELINE
        </h2>
        <span className="text-[10px] tabular-nums text-muted-foreground">
          {data.total} CONTACTS IN PIPELINE
        </span>
      </div>
      <div className="mb-4 h-px bg-border" />

      {/* Kanban columns */}
      <div className="flex gap-2 overflow-x-auto pb-4">
        {data.stages.map((stage) => {
          const contacts = data.contacts[stage] || [];
          return (
            <div
              key={stage}
              className={`min-w-[220px] flex-shrink-0 border-t-2 ${STAGE_COLORS[stage]} bg-card`}
            >
              {/* Column header */}
              <div className="border-b border-border px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {STAGE_LABELS[stage]}
                </p>
                <p className="text-[10px] tabular-nums text-muted-foreground">
                  {contacts.length}
                </p>
              </div>

              {/* Cards */}
              <div className="space-y-1 p-2">
                {contacts.map((contact: PipelineContact) => {
                  const next = getNextStage(stage);
                  // Freshness dot
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
                      className="border border-border bg-background p-2 text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-1.5 w-1.5 shrink-0 rounded-full ${freshness}`}
                          title={`${daysSince}d since activity`}
                        />
                        <p className="truncate font-bold text-foreground">
                          {contact.name}
                        </p>
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {contact.title}
                        {contact.company_name ? ` @ ${contact.company_name}` : ""}
                      </p>
                      <div className="mt-1 flex items-center justify-between">
                        <span
                          className={`text-[10px] font-bold tabular-nums ${TIER_STYLES[contact.tier] || "text-zinc-400"}`}
                        >
                          {Math.round(contact.total_score)}
                        </span>
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-accent-blue hover:underline"
                          >
                            LI
                          </a>
                        )}
                      </div>
                      {contact.affiliations.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {contact.affiliations.map((a) => (
                            <Badge
                              key={a}
                              variant="outline"
                              className="text-[10px] px-1 py-0 bg-blue-500/20 text-blue-400 border-blue-500/30"
                            >
                              {a}
                            </Badge>
                          ))}
                        </div>
                      )}
                      {next && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 h-5 w-full text-[10px]"
                          onClick={() => moveStage(contact.id, next)}
                        >
                          → {STAGE_LABELS[next]}
                        </Button>
                      )}
                      {stage === "responded" && (
                        <p className="mt-1 text-[10px] text-amber-400">
                          AutoGuard active
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
