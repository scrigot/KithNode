"use client";

import { useEffect, useState } from "react";
import { WarmSignalCard } from "./warm-signal-card";
import { FilterBar, type SortOption } from "./filter-bar";
import { OutreachSheet } from "./outreach-sheet";
import { trackEvent } from "@/lib/posthog";
import { apiFetch } from "@/lib/api-client";
import { Users } from "lucide-react";
import type { RankedContact } from "@/lib/api";
import { ALL_TRACKS, CAREER_TRACKS, type CareerTrack } from "@/lib/data/career-tracks";
import Link from "next/link";
import { Upload } from "lucide-react";

// Pure tab-filter predicate (exported for unit testing). A contact matches when:
// no track is selected (ALL), OR its track equals the active track AND — when a
// role sub-chip is active — its role equals that role. Empty role filter means
// "all roles in this track".
export function matchesTrackRole(
  c: Pick<RankedContact, "track" | "role">,
  track: string,
  role: string,
): boolean {
  if (!track) return true;
  if (c.track !== track) return false;
  if (role && c.role !== role) return false;
  return true;
}

// Count loaded contacts per track for the tab labels. Pure; unit-tested.
export function countByTrack(
  contacts: Pick<RankedContact, "track">[],
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of contacts) {
    if (c.track) counts[c.track] = (counts[c.track] || 0) + 1;
  }
  return counts;
}

export function matchesContactSearch(
  contact: Pick<RankedContact, "name" | "title" | "skills"> & {
    company: Pick<RankedContact["company"], "name" | "location" | "industry_tags">;
  },
  search: string,
): boolean {
  if (!search.trim()) return true;
  const searchable = [
    contact.name,
    contact.title,
    contact.skills || "",
    contact.company.name,
    contact.company.location,
    ...contact.company.industry_tags,
  ].join(" ").toLocaleLowerCase();
  return searchable.includes(search.trim().toLocaleLowerCase());
}

const SORT_OPTIONS: SortOption[] = ["score", "name", "company", "new"];
const SESSION_KEY = "warm-signals-state";

interface SavedState {
  activeTrack: CareerTrack | "";
  activeRole: string;
  activeTier: string;
  sort: SortOption;
  search: string;
}

function loadSavedState(): SavedState | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedState>;
    // Type-guard activeTrack against ALL_TRACKS union (includes "")
    const validTracks: Array<CareerTrack | ""> = ["", ...ALL_TRACKS];
    const track: CareerTrack | "" = validTracks.includes(parsed.activeTrack as CareerTrack | "")
      ? (parsed.activeTrack as CareerTrack | "")
      : "";
    // Type-guard sort against SortOption values
    const sort: SortOption = SORT_OPTIONS.includes(parsed.sort as SortOption)
      ? (parsed.sort as SortOption)
      : "score";
    return {
      activeTrack: track,
      activeRole: typeof parsed.activeRole === "string" ? parsed.activeRole : "",
      activeTier: typeof parsed.activeTier === "string" ? parsed.activeTier : "all",
      sort,
      search: typeof parsed.search === "string" ? parsed.search : "",
    };
  } catch {
    return null;
  }
}

function loadQueryTier(): string | null {
  try {
    const tier = new URLSearchParams(window.location.search).get("tier");
    return ["kith", "hot", "warm", "monitor", "cold"].includes(tier ?? "")
      ? tier
      : null;
  } catch {
    return null;
  }
}

export function ContactsList() {
  const [contacts, setContacts] = useState<RankedContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lazy-initialize each filter from sessionStorage; fall back to defaults.
  const saved = typeof window !== "undefined" ? loadSavedState() : null;
  const queryTier = typeof window !== "undefined" ? loadQueryTier() : null;
  const [search, setSearch] = useState(saved?.search ?? "");
  const [activeTier, setActiveTier] = useState(queryTier ?? saved?.activeTier ?? "all");
  // Career-track tabs (ALL + the 5 tracks); a selected track reveals its role
  // sub-chips. "" = ALL. Filters the already-loaded contacts client-side.
  const [activeTrack, setActiveTrack] = useState<CareerTrack | "">(saved?.activeTrack ?? "");
  const [activeRole, setActiveRole] = useState(saved?.activeRole ?? "");
  const [sort, setSort] = useState<SortOption>(saved?.sort ?? "score");
  const [outreachTarget, setOutreachTarget] = useState<{
    id: string;
    name: string;
    email?: string;
  } | null>(null);
  const [pipelineAdded, setPipelineAdded] = useState<Set<string>>(new Set());

  // Persist filter/sort/search state to sessionStorage whenever it changes.
  useEffect(() => {
    const state: SavedState = { activeTrack, activeRole, activeTier, sort, search };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
  }, [activeTrack, activeRole, activeTier, sort, search]);

  useEffect(() => {
    apiFetch("/api/contacts?curated=true")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((data) => {
        setContacts(data);
        setLoading(false);
        trackEvent("dashboard_loaded", { contact_count: data.length });

        // Belt-and-suspenders scroll restore: if the user navigated back from a
        // contact page (and router.back() scroll restore didn't fire), scroll
        // window to where they were.
        const saved = sessionStorage.getItem("warm-signals-scroll");
        if (saved !== null) {
          sessionStorage.removeItem("warm-signals-scroll");
          const y = Number(saved);
          if (Number.isFinite(y) && y > 0) {
            requestAnimationFrame(() => {
              window.scrollTo({ top: y, behavior: "instant" });
            });
          }
        }
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  // Filter
  const filtered = contacts.filter((c) => {
    if (!matchesTrackRole(c, activeTrack, activeRole)) return false;
    if (activeTier !== "all" && c.score.tier !== activeTier) return false;
    if (!matchesContactSearch(c, search)) return false;
    return true;
  });

  // Per-track counts for the tab labels. Cheap: one pass over the loaded set.
  const trackCounts = countByTrack(contacts);

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "score":
        return b.score.total_score - a.score.total_score;
      case "name":
        return a.name.localeCompare(b.name);
      case "company":
        return a.company.name.localeCompare(b.company.name);
      case "new":
        return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-28 animate-pulse border border-border bg-card"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-accent-amber/20 bg-accent-amber/5 p-6 text-center">
        <p className="text-sm font-medium text-accent-amber">Unable to load contacts</p>
        <p className="mt-1 text-[12px] text-text-secondary">Check your connection and try again.</p>
        <button onClick={() => window.location.reload()} className="mt-3 border border-white/[0.12] px-3 py-1.5 text-[12px] text-white hover:bg-white/[0.06]">Retry</button>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="border border-white/[0.06] bg-bg-card p-10 text-center">
        <Users className="mx-auto mb-3 text-accent-teal" size={32} strokeWidth={1.5} />
        <p className="text-sm font-semibold text-white">No contacts yet</p>
        <p className="mt-1 text-[12px] text-text-secondary">
          Import your LinkedIn network or discover alumni to get started.
        </p>
        <Link
          href="/dashboard/import"
          className="mt-4 inline-flex items-center gap-2 bg-accent-teal px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-accent-teal/80"
        >
          <Upload size={16} />
          Import Contacts
        </Link>
      </div>
    );
  }

  return (
    <div>
      <OutreachSheet
        contactId={outreachTarget?.id ?? null}
        contactName={outreachTarget?.name ?? ""}
        contactEmail={outreachTarget?.email}
        open={outreachTarget !== null}
        onClose={() => setOutreachTarget(null)}
        onStatusChange={(contactId, status) => {
          // Could update local state to show status on cards
          trackEvent("outreach_status_changed", {
            contact_id: contactId,
            status,
          });
        }}
      />

      {/* Career-track tabs — ALL + the 5 tracks. Selecting a track reveals its
          role sub-chips. Matches the discover page segmented-tab styling. */}
      <div className="mb-3 space-y-2">
        <div className="flex flex-wrap gap-1">
          <button
            onClick={() => {
              setActiveTrack("");
              setActiveRole("");
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              activeTrack === ""
                ? "bg-primary text-white"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All
            <span className="tabular-nums opacity-60">{contacts.length}</span>
          </button>
          {ALL_TRACKS.map((track) => (
            <button
              key={track}
              onClick={() => {
                setActiveTrack(track);
                setActiveRole("");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                activeTrack === track
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {track}
              <span className="tabular-nums opacity-60">{trackCounts[track] || 0}</span>
            </button>
          ))}
        </div>

        {activeTrack !== "" && (
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => setActiveRole("")}
              className={`border px-2 py-1 text-[10px] font-bold tracking-wider transition-colors ${
                activeRole === ""
                  ? "border-primary/30 bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              ALL ROLES
            </button>
            {CAREER_TRACKS[activeTrack].map((role) => (
              <button
                key={role}
                onClick={() => setActiveRole(role)}
                className={`border px-2 py-1 text-[10px] font-bold tracking-wider transition-colors ${
                  activeRole === role
                    ? "border-primary/30 bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {role}
              </button>
            ))}
          </div>
        )}
      </div>

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        activeTier={activeTier}
        onTierChange={setActiveTier}
        sort={sort}
        onSortChange={setSort}
        resultCount={sorted.length}
      />

      <div className="mt-4 space-y-1">
        {sorted.map((contact) => (
          <WarmSignalCard
            key={contact.id}
            contact={contact}
            onDraftOutreach={(id) => {
              setOutreachTarget({ id, name: contact.name, email: contact.email });
            }}
            pipelineAdded={pipelineAdded.has(contact.id)}
            onAddToPipeline={async (id) => {
              const res = await apiFetch(`/api/pipeline/${id}`, { method: "POST" });
              if (res.ok) {
                setPipelineAdded((prev) => new Set(prev).add(String(id)));
              }
              trackEvent("pipeline_added", {
                contact_id: id,
                name: contact.name,
              });
            }}
            onDelete={async (id) => {
              const res = await apiFetch(`/api/contacts/${id}`, { method: "DELETE" });
              if (res.ok) {
                setContacts((prev) => prev.filter((c) => c.id !== id));
                trackEvent("contact_deleted", { contact_id: id });
              }
            }}
          />
        ))}
      </div>

      {sorted.length === 0 && (
        <div className="mt-4 border border-border bg-card p-6 text-center">
          <p className="text-xs text-muted-foreground">
            No contacts match your filters.
          </p>
        </div>
      )}
    </div>
  );
}
