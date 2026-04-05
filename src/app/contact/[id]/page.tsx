"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { OutreachSheet } from "@/app/dashboard/contacts/outreach-sheet";
import { trackEvent } from "@/lib/posthog";
import type { ContactDetail } from "@/lib/api";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-green-500/20 text-green-400 border-green-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const AFFILIATION_COLORS: Record<string, string> = {
  "Chi Phi": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Kenan-Flagler": "bg-indigo-500/20 text-indigo-300 border-indigo-500/30",
  "UNC Alumni": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  "UNC Faculty": "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  Duke: "bg-blue-700/20 text-blue-300 border-blue-700/30",
  "NC Local": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  "Consulting Background": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const SIGNAL_ICONS: Record<string, string> = {
  funding: "$$",
  hiring: ">>",
  tech_stack: "<>",
  news: "!!",
};

function ScoreSection({ score }: { score: ContactDetail["score"] }) {
  if (!score) return null;
  return (
    <div className="border border-border bg-card p-4">
      <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        SCORE BREAKDOWN
      </h3>
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-3xl font-bold tabular-nums text-foreground">
          {Math.round(score.total_score)}
        </span>
        <span className="text-sm text-muted-foreground">/100</span>
        <Badge
          variant="outline"
          className={`ml-2 text-[10px] font-bold tracking-wider ${TIER_STYLES[score.tier] || TIER_STYLES.cold}`}
        >
          {score.tier.toUpperCase()}
        </Badge>
      </div>

      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">FIT</span>
            <span className="tabular-nums text-accent-blue">
              {Math.round(score.fit_score)}/50
            </span>
          </div>
          <Progress
            value={(score.fit_score / 50) * 100}
            className="h-1.5 bg-muted [&>div]:bg-accent-blue"
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">SIGNAL</span>
            <span className="tabular-nums text-accent-amber">
              {Math.round(score.signal_score)}/30
            </span>
          </div>
          <Progress
            value={(score.signal_score / 30) * 100}
            className="h-1.5 bg-muted [&>div]:bg-accent-amber"
          />
        </div>
        <div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">ENGAGEMENT</span>
            <span className="tabular-nums text-accent-green">
              {Math.round(score.engagement_score)}/20
            </span>
          </div>
          <Progress
            value={(score.engagement_score / 20) * 100}
            className="h-1.5 bg-muted [&>div]:bg-accent-green"
          />
        </div>
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [contact, setContact] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOutreach, setShowOutreach] = useState(false);

  useEffect(() => {
    fetch(`/api/contacts/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Contact not found");
        return res.json();
      })
      .then((data) => {
        setContact(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted" />
          <div className="h-8 w-64 bg-muted" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-48 bg-muted" />
            <div className="h-48 bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="min-h-screen bg-background p-6">
        <Link
          href="/dashboard/contacts"
          className="text-xs text-muted-foreground hover:text-primary"
        >
          &lt; BACK TO SIGNALS
        </Link>
        <div className="mt-8 border border-destructive/30 bg-destructive/10 p-4 text-xs text-destructive">
          {error || "Contact not found"}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/contacts"
            className="text-[10px] text-muted-foreground hover:text-primary"
          >
            &lt; BACK TO SIGNALS
          </Link>
          <h1 className="mt-1 text-xl font-bold text-foreground">
            {contact.name}
          </h1>
          <p className="text-xs text-muted-foreground">
            {contact.title}
            {contact.title && contact.company.name ? " @ " : ""}
            <span className="text-foreground">{contact.company.name}</span>
          </p>
          {contact.company.location && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              {contact.company.location}
            </p>
          )}
        </div>
        {contact.outreach_history.some((o) => o.status === "replied") ? (
          <Badge
            variant="outline"
            className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs"
          >
            AUTOGUARD ACTIVE
          </Badge>
        ) : (
          <Button
            variant="outline"
            className="text-xs text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => setShowOutreach(true)}
          >
            DRAFT OUTREACH
          </Button>
        )}
      </div>

      <OutreachSheet
        contactId={contact.id}
        contactName={contact.name}
        contactEmail={contact.email}
        open={showOutreach}
        onClose={() => setShowOutreach(false)}
      />

      <Separator className="mb-4" />

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Score */}
        <ScoreSection score={contact.score} />

        {/* Affiliations */}
        <div className="border border-border bg-card p-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            AFFILIATIONS
          </h3>
          {contact.affiliations.length > 0 ? (
            <div className="space-y-2">
              {contact.affiliations.map((aff) => (
                <div
                  key={aff.id}
                  className="flex items-center justify-between"
                >
                  <Badge
                    variant="outline"
                    className={`text-xs ${AFFILIATION_COLORS[aff.name] || "bg-zinc-500/20 text-zinc-400"}`}
                  >
                    {aff.name}
                  </Badge>
                  <span className="text-[10px] tabular-nums text-muted-foreground">
                    +{aff.boost}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No shared affiliations detected
            </p>
          )}

          {/* Contact info */}
          <Separator className="my-3" />
          <div className="space-y-1 text-[10px]">
            {contact.education && (
              <p>
                <span className="text-muted-foreground">Education: </span>
                <span className="text-foreground">{contact.education}</span>
              </p>
            )}
            <p>
              <a
                href={`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(contact.company.name)}&network=%5B%22F%22%5D`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-blue hover:underline"
              >
                Check Mutual Connections
              </a>
            </p>
            {contact.linkedin_url && (
              <p>
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue hover:underline"
                >
                  LinkedIn Profile
                </a>
              </p>
            )}
            {contact.email && (
              <p>
                <span className="text-muted-foreground">Email: </span>
                <span className="text-foreground">{contact.email}</span>
                {contact.email_status && (
                  <span className="ml-1 text-muted-foreground">
                    ({contact.email_status})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Signals */}
        <div className="border border-border bg-card p-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            SIGNAL TIMELINE
          </h3>
          {contact.signals.length > 0 ? (
            <div className="space-y-2">
              {contact.signals.map((signal) => (
                <div
                  key={signal.id}
                  className="flex items-start gap-2 text-xs"
                >
                  <span className="w-5 font-bold text-accent-amber">
                    {SIGNAL_ICONS[signal.signal_type] || "**"}
                  </span>
                  <div className="flex-1">
                    <p className="text-foreground">{signal.description}</p>
                    <div className="flex gap-2 text-[10px] text-muted-foreground">
                      <span>Strength: {signal.strength}/10</span>
                      {signal.source_url && (
                        <a
                          href={signal.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent-blue hover:underline"
                        >
                          source
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No signals detected yet
            </p>
          )}
        </div>

        {/* Outreach History */}
        <div className="border border-border bg-card p-4">
          <h3 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            OUTREACH HISTORY
          </h3>
          {contact.outreach_history.length > 0 ? (
            <div className="space-y-3">
              {contact.outreach_history.map((outreach) => {
                const isLocked = outreach.status === "replied";
                const isSent = outreach.status === "sent";
                return (
                  <div
                    key={outreach.id}
                    className={`border p-2 text-xs ${isLocked ? "border-amber-500/30 bg-amber-500/5" : "border-border"}`}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-foreground">
                        {outreach.email_subject || "Untitled draft"}
                      </p>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          isLocked
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : isSent
                              ? "bg-green-500/20 text-green-400 border-green-500/30"
                              : "bg-zinc-500/20 text-zinc-400 border-zinc-500/30"
                        }`}
                      >
                        {isLocked ? "LOCKED" : outreach.status.toUpperCase()}
                      </Badge>
                    </div>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {outreach.created_at}
                    </p>
                    {isSent && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2 h-6 text-[10px] text-amber-400 hover:bg-amber-500/20"
                        onClick={async () => {
                          await fetch(
                            `/api/contacts/${outreach.id}/status`,
                            {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                              },
                              body: JSON.stringify({
                                status: "replied",
                              }),
                            },
                          );
                          trackEvent("autoguard_locked", {
                            contact_id: contact.id,
                            contact_name: contact.name,
                          });
                          // Reload to show AutoGuard state
                          window.location.reload();
                        }}
                      >
                        MARK AS RESPONDED
                      </Button>
                    )}
                    {isLocked && (
                      <p className="mt-1 text-[10px] text-amber-400">
                        AutoGuard active — AI automation disabled
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No outreach history
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
