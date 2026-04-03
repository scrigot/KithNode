"use client";

import { useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trackEvent } from "@/lib/posthog";
import type { DiscoverContact, DiscoverResponse } from "@/lib/api";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

export default function DiscoverPage() {
  const [contacts, setContacts] = useState<DiscoverContact[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [totalUnrated, setTotalUnrated] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [learningActive, setLearningActive] = useState(false);
  const [ratingsNeeded, setRatingsNeeded] = useState(10);
  const [loading, setLoading] = useState(true);
  const [animating, setAnimating] = useState<string | null>(null);
  const [showPipelinePrompt, setShowPipelinePrompt] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Filters
  const [filterUniversity, setFilterUniversity] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterUniversity) params.set("university", filterUniversity);
    if (filterRole) params.set("role", filterRole);
    if (filterIndustry) params.set("industry", filterIndustry);
    if (filterLocation) params.set("location", filterLocation);
    const qs = params.toString();
    try {
      const res = await fetch(`/api/discover${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error();
      const data: DiscoverResponse = await res.json();
      setContacts(data.contacts);
      setTotalUnrated(data.total_unrated);
      setTotalRatings(data.ratings_progress.total_ratings);
      setLearningActive(data.ratings_progress.learning_active);
      setRatingsNeeded(data.ratings_progress.ratings_needed);
      setCurrentIndex(0);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [filterUniversity, filterRole, filterIndustry, filterLocation]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts, filterUniversity, filterRole, filterIndustry, filterLocation]);

  const handleRate = async (rating: "high_value" | "skip" | "not_interested") => {
    const contact = contacts[currentIndex];
    if (!contact) return;

    setAnimating(rating);

    try {
      const res = await fetch(`/api/contacts/${contact.id}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      if (res.ok) {
        const data = await res.json();
        setTotalRatings(data.total_ratings);
        setLearningActive(data.learning_active);
        setRatingsNeeded(Math.max(0, 10 - data.total_ratings));

        trackEvent("contact_rated", {
          contact_id: contact.id,
          rating,
          contact_name: contact.name,
        });
      }
    } catch {
      // silently fail
    }

    // Show "Also add to Pipeline?" prompt for high_value swipes
    if (rating === "high_value") {
      setShowPipelinePrompt({ id: contact.id, name: contact.name });
    }

    setTimeout(() => {
      setAnimating(null);
      if (currentIndex < contacts.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        fetchContacts();
      }
    }, 300);
  };

  const contact = contacts[currentIndex];

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="h-6 w-6 animate-spin border-2 border-muted border-t-primary" />
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <div className="max-w-sm border border-white/[0.06] bg-bg-card p-10 text-center">
          <p className="text-lg font-semibold text-white">Discovery</p>
          <p className="mt-2 text-[12px] text-text-secondary">
            Discovery is powered by your preferences. Set your target firms and industries in Settings to see scored alumni.
          </p>
          <a
            href="/dashboard/settings"
            className="mt-5 inline-flex items-center gap-2 bg-accent-teal px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-teal/80"
          >
            Configure Preferences
          </a>
          {totalRatings > 0 && (
            <p className="mt-3 text-[10px] tabular-nums text-text-muted">
              {totalRatings} total ratings
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            DISCOVER
          </h2>
          <p className="text-[10px] text-muted-foreground">
            Rate contacts to train your algorithm
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          { label: "ALL", value: "", setter: () => { setFilterUniversity(""); setFilterRole(""); setFilterIndustry(""); setFilterLocation(""); } },
          { label: "UNC ONLY", value: "unc", setter: () => setFilterUniversity(filterUniversity === "unc" ? "" : "unc") },
          { label: "DUKE", value: "duke", setter: () => setFilterUniversity(filterUniversity === "duke" ? "" : "duke") },
          { label: "FOUNDERS", value: "founder", setter: () => setFilterRole(filterRole === "founder" ? "" : "founder") },
          { label: "RECRUITERS", value: "recruiter", setter: () => setFilterRole(filterRole === "recruiter" ? "" : "recruiter") },
          { label: "FINTECH", value: "fintech", setter: () => setFilterIndustry(filterIndustry === "fintech" ? "" : "fintech") },
          { label: "AI", value: "ai", setter: () => setFilterIndustry(filterIndustry === "ai" ? "" : "ai") },
        ].map((f) => {
          const isActive =
            (f.label === "ALL" && !filterUniversity && !filterRole && !filterIndustry && !filterLocation) ||
            (f.value === filterUniversity) ||
            (f.value === filterRole) ||
            (f.value === filterIndustry);
          return (
            <button
              key={f.label}
              onClick={f.setter}
              className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                isActive
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          );
        })}
        <input
          type="text"
          placeholder="Custom filter..."
          className="border border-border bg-muted px-2 py-1 text-[10px] text-foreground placeholder:text-muted-foreground w-28"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = (e.target as HTMLInputElement).value.trim();
              if (val) setFilterUniversity(val);
            }
          }}
        />
        <div className="text-right">
          <p className="text-[10px] tabular-nums text-muted-foreground">
            {totalRatings} rated | {totalUnrated} remaining
          </p>
          {learningActive ? (
            <Badge
              variant="outline"
              className="mt-1 bg-green-500/20 text-green-400 border-green-500/30 text-[10px]"
            >
              LEARNING ACTIVE
            </Badge>
          ) : (
            <div className="mt-1">
              <Progress
                value={((10 - ratingsNeeded) / 10) * 100}
                className="h-1 w-24 bg-muted [&>div]:bg-primary"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">
                {ratingsNeeded} more to activate
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Card */}
      <div className="flex flex-1 items-center justify-center">
        <div
          className={`w-full max-w-sm border border-border bg-card p-6 transition-all duration-300 ${
            animating === "high_value"
              ? "translate-x-20 rotate-3 opacity-0 border-green-500"
              : animating === "not_interested"
                ? "-translate-x-20 -rotate-3 opacity-0 border-red-500"
                : animating === "skip"
                  ? "-translate-y-10 opacity-0"
                  : ""
          }`}
        >
          {/* Name + Company */}
          <h3 className="text-lg font-bold text-foreground">{contact.name}</h3>
          <p className="text-xs text-muted-foreground">
            {contact.title}
            {contact.title && contact.company_name ? " @ " : ""}
            {contact.company_name}
          </p>

          {/* Score + Tier */}
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums text-foreground">
              {Math.round(contact.total_score)}
            </span>
            <span className="text-xs text-muted-foreground">/100</span>
            <Badge
              variant="outline"
              className={`ml-2 text-[10px] font-bold ${TIER_STYLES[contact.tier] || TIER_STYLES.cold}`}
            >
              {contact.tier.toUpperCase()}
            </Badge>
          </div>

          {/* Details */}
          <div className="mt-4 space-y-1 text-[10px] text-muted-foreground">
            {contact.company_location && <p>{contact.company_location}</p>}
            {contact.education && <p>Education: {contact.education}</p>}
            {contact.company_industry_tags.length > 0 && (
              <p>{contact.company_industry_tags.join(", ")}</p>
            )}
          </div>

          {/* Affiliations */}
          {contact.affiliations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1">
              {contact.affiliations.map((aff) => (
                <Badge
                  key={aff}
                  variant="outline"
                  className="text-[10px] bg-blue-500/20 text-blue-400 border-blue-500/30"
                >
                  {aff}
                </Badge>
              ))}
            </div>
          )}

          {/* Signals */}
          {contact.signals.length > 0 && (
            <div className="mt-3 space-y-1">
              {contact.signals.map((s, i) => (
                <p key={i} className="text-[10px] text-accent-amber">
                  {s.description}
                </p>
              ))}
            </div>
          )}

          {/* LinkedIn — prominent button for evaluation */}
          <div className="mt-4 flex gap-2">
            {contact.linkedin_url ? (
              <a
                href={contact.linkedin_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-accent-blue bg-accent-blue/10 py-2 text-center text-xs font-bold text-accent-blue hover:bg-accent-blue/20"
              >
                VIEW LINKEDIN PROFILE
              </a>
            ) : (
              <a
                href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(contact.name + " " + contact.company_name)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 border border-border bg-muted py-2 text-center text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                SEARCH ON LINKEDIN
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="mt-6 flex items-center justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 border-red-500/30 text-red-400 hover:bg-red-500/20"
          onClick={() => handleRate("not_interested")}
        >
          X
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-10 w-10 border-zinc-500/30 text-zinc-400 hover:bg-zinc-500/20"
          onClick={() => handleRate("skip")}
        >
          &gt;
        </Button>
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-12 border-green-500/30 text-green-400 hover:bg-green-500/20"
          onClick={() => handleRate("high_value")}
        >
          +
        </Button>
      </div>
      <div className="mt-2 flex justify-center gap-8 text-[10px] text-muted-foreground">
        <span>NOT INTERESTED</span>
        <span>SKIP</span>
        <span>HIGH VALUE</span>
      </div>

      {/* Pipeline prompt after high_value swipe */}
      {showPipelinePrompt && (
        <div className="mt-4 flex items-center justify-center gap-2 border border-primary/30 bg-primary/10 px-4 py-2">
          <span className="text-xs text-primary">
            Added {showPipelinePrompt.name} to Warm Signals
          </span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-[10px] text-accent-amber hover:bg-accent-amber/20"
            onClick={async () => {
              await fetch(`/api/pipeline/${showPipelinePrompt.id}`, {
                method: "POST",
              });
              setShowPipelinePrompt(null);
            }}
          >
            + ADD TO PIPELINE
          </Button>
          <button
            onClick={() => setShowPipelinePrompt(null)}
            className="text-[10px] text-muted-foreground hover:text-foreground"
          >
            DISMISS
          </button>
        </div>
      )}
    </div>
  );
}
