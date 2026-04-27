"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/posthog";
import { apiFetch } from "@/lib/api-client";
import { X, Star, Search, Layers, Sparkles, Loader2, GraduationCap, RefreshCw } from "lucide-react";
import { IntroModal } from "./intro-modal";

const TIER_STYLES: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  warm: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  monitor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  cold: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30",
};

const SCORE_STYLES: Record<string, string> = {
  hot: "text-red-400",
  warm: "text-blue-400",
  monitor: "text-amber-400",
  cold: "text-zinc-400",
};

const TIERS = ["HOT", "WARM", "MONITOR", "COLD"] as const;

interface WarmPath {
  intermediaryName: string;
  intermediaryRelation: string;
  firmName: string;
  title: string;
}

interface Contact {
  id: string;
  name: string;
  title: string;
  firmName: string;
  email: string;
  linkedInUrl: string;
  education: string;
  location: string;
  warmthScore: number;
  tier: string;
  affiliations: string;
  source: string;
  warmPaths?: WarmPath[];
}

type ViewMode = "browse" | "search";
type SourceFilter = "alumni" | "professor";

async function rateContact(
  contactId: string,
  rating: "high_value" | "skip",
): Promise<boolean> {
  try {
    const res = await apiFetch("/api/discover/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, rating }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const warmPathFiredRef = { current: false };

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[18px] items-center justify-center border border-white/[0.12] bg-muted px-1 py-0.5 font-mono text-[10px] font-bold text-foreground">
      {children}
    </kbd>
  );
}

// Shared card used in both Browse (triage) and Search (explore) modes.
// Variant controls the footer buttons.
function ContactCard({
  contact,
  variant,
  focused,
  onRate,
  onAskIntro,
  onAddToPipeline,
  pipelineState,
}: {
  contact: Contact;
  variant: "rate" | "explore";
  focused?: boolean;
  onRate?: (rating: "high_value" | "skip") => void;
  onAskIntro?: (contact: Contact, warmPath: WarmPath) => void;
  onAddToPipeline?: (contactId: string) => void;
  pipelineState?: "idle" | "pending" | "added";
}) {
  const isProfessor = contact.source === "professor";
  if (
    contact.warmPaths &&
    contact.warmPaths.length > 0 &&
    !warmPathFiredRef.current
  ) {
    warmPathFiredRef.current = true;
    trackEvent("first_warm_path_viewed", {
      contact_id: contact.id,
      warm_path_count: contact.warmPaths.length,
    });
  }

  const tierKey = (contact.tier || "cold").toLowerCase();
  const affiliationList = contact.affiliations
    ? contact.affiliations.split(",").filter(Boolean)
    : [];
  const extraChipCount = Math.max(0, affiliationList.length - 3);

  return (
    <div
      className={`flex flex-col border bg-card transition-colors ${
        focused
          ? "border-primary shadow-sm shadow-primary/20"
          : "border-white/[0.06] hover:border-white/[0.12]"
      }`}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <Badge
          variant="outline"
          className={`text-[9px] font-bold ${TIER_STYLES[tierKey] || TIER_STYLES.cold}`}
        >
          {(contact.tier || "COLD").toUpperCase()}
        </Badge>
        <span
          className={`text-xl font-bold tabular-nums ${SCORE_STYLES[tierKey] || "text-zinc-400"}`}
        >
          {Math.round(contact.warmthScore || 0)}
        </span>
      </div>

      <div className="flex-1 px-4 py-3">
        <h3 className="truncate text-[13px] font-bold text-foreground">{contact.name}</h3>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {contact.title}
          {contact.title && contact.firmName ? (isProfessor ? " · " : " @ ") : ""}
          <span className="text-foreground">{contact.firmName}</span>
        </p>

        {contact.warmPaths && contact.warmPaths.length > 0 && (
          <button
            type="button"
            onClick={() =>
              onAskIntro && onAskIntro(contact, contact.warmPaths![0])
            }
            disabled={!onAskIntro}
            title={contact.warmPaths
              .map(
                (wp) =>
                  `Via ${wp.intermediaryName} (${wp.intermediaryRelation}) -> ${wp.title} at ${wp.firmName}`,
              )
              .join(" · ")}
            className="mt-2 block w-full truncate border border-primary/20 bg-primary/5 px-2 py-1 text-left font-mono text-[10px] text-primary enabled:hover:bg-primary/10 disabled:cursor-default"
          >
            <span className="text-muted-foreground">via </span>
            {contact.warmPaths[0].intermediaryName}
            <span className="text-muted-foreground"> -&gt; </span>
            {contact.warmPaths[0].firmName}
            {contact.warmPaths.length > 1 && (
              <span className="text-muted-foreground">
                {" "}
                (+{contact.warmPaths.length - 1})
              </span>
            )}
          </button>
        )}

        {affiliationList.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {affiliationList.slice(0, 3).map((a) => (
              <span
                key={a}
                className="border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-medium text-primary"
              >
                {a.trim()}
              </span>
            ))}
            {extraChipCount > 0 && (
              <span className="px-1 py-0.5 text-[9px] text-muted-foreground/60">
                +{extraChipCount}
              </span>
            )}
          </div>
        )}

        {(contact.education || contact.location) && (
          <div className="mt-2 space-y-0.5 text-[10px] text-muted-foreground">
            {contact.education && <p className="truncate">{contact.education}</p>}
            {contact.location && <p className="truncate">{contact.location}</p>}
          </div>
        )}
      </div>

      {variant === "rate" && onRate && (
        <div className="flex gap-1 border-t border-white/[0.06] px-2 py-2">
          <button
            onClick={() => onRate("skip")}
            className="flex flex-1 items-center justify-center gap-1 border border-white/[0.12] py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400"
            aria-label={`Skip ${contact.name}`}
          >
            <X className="h-3 w-3" />
            SKIP
          </button>
          <button
            onClick={() => onRate("high_value")}
            className="flex flex-1 items-center justify-center gap-1 bg-primary py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80"
            aria-label={`Rate ${contact.name} high value`}
          >
            <Star className="h-3 w-3" />
            HIGH VALUE
          </button>
        </div>
      )}

      {variant === "explore" && (
        <div className="flex gap-1 border-t border-white/[0.06] px-2 py-2">
          {contact.linkedInUrl ? (
            <a
              href={contact.linkedInUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 border border-border bg-muted py-1.5 text-center text-[10px] font-bold text-muted-foreground hover:text-foreground"
            >
              VIEW PROFILE
            </a>
          ) : (
            <a
              href={`https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(contact.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 border border-border bg-muted py-1.5 text-center text-[10px] font-bold text-muted-foreground hover:text-foreground"
            >
              SEARCH PROFILE
            </a>
          )}
          <Button
            size="sm"
            variant="outline"
            className={`flex-1 text-[10px] font-bold ${
              pipelineState === "added"
                ? "border-green-500/30 text-green-400"
                : "border-primary/30 text-primary hover:bg-primary/20"
            }`}
            disabled={pipelineState === "pending" || pipelineState === "added"}
            onClick={() => onAddToPipeline && onAddToPipeline(contact.id)}
          >
            {pipelineState === "added"
              ? "ADDED"
              : pipelineState === "pending"
                ? "..."
                : "+ PIPELINE"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<ViewMode>("browse");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(
    searchParams.get("source") === "professor" ? "professor" : "alumni",
  );
  const [query, setQuery] = useState("");
  const [activeTier, setActiveTier] = useState<string>("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasAnyContacts, setHasAnyContacts] = useState(true);
  const [addingToPipeline, setAddingToPipeline] = useState<string | null>(null);
  const [pipelineAdded, setPipelineAdded] = useState<Set<string>>(new Set());

  // Discover pipeline modal state: streamed NDJSON progress.
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<string | null>(null);
  const [discoverProgress, setDiscoverProgress] = useState(0);
  const [discoverStage, setDiscoverStage] = useState<string>("");
  const [discoverMessage, setDiscoverMessage] = useState<string>("");
  const [discoverLog, setDiscoverLog] = useState<string[]>([]);
  const [discoverError, setDiscoverError] = useState<string | null>(null);
  const discoverAbortRef = useRef<AbortController | null>(null);

  // Seed Professors modal state: streamed NDJSON progress.
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const [seedProgress, setSeedProgress] = useState(0);
  const [seedStage, setSeedStage] = useState<string>("");
  const [seedMessage, setSeedMessage] = useState<string>("");
  const [seedLog, setSeedLog] = useState<string[]>([]);
  const [seedError, setSeedError] = useState<string | null>(null);
  const seedAbortRef = useRef<AbortController | null>(null);

  // Intro modal state
  const [introTarget, setIntroTarget] = useState<{
    contact: Contact;
    warmPath: WarmPath;
  } | null>(null);
  const [userName, setUserName] = useState("");

  // Browse mode: list of unrated contacts. Rated cards are spliced out of state.
  const [browseContacts, setBrowseContacts] = useState<Contact[]>([]);
  const [allRated, setAllRated] = useState(false);
  const ratingLockRef = useRef(false);

  const search = useCallback(
    async (q: string, tier: string, src: SourceFilter) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tier) params.set("tier", tier.toLowerCase());
      params.set("source", src);
      const qs = params.toString();

      try {
        const res = await apiFetch(`/api/discover${qs ? `?${qs}` : ""}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        setContacts(data.contacts || []);
        setTotal(data.total || 0);

        if (!q && !tier && (data.contacts || []).length === 0) {
          setHasAnyContacts(false);
        } else {
          setHasAnyContacts(true);
        }
      } catch {
        setContacts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const fetchBrowseContacts = useCallback(async (src: SourceFilter) => {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/discover?source=${src}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const unrated: Contact[] = data.contacts || [];

      setAllRated(unrated.length === 0);
      setBrowseContacts(unrated);
      setHasAnyContacts(unrated.length > 0 || (data.total || 0) > 0);
    } catch {
      setBrowseContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Search mode: debounced search
  useEffect(() => {
    if (mode !== "search") return;
    const timer = setTimeout(() => {
      search(query, activeTier, sourceFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeTier, search, mode, sourceFilter]);

  // Browse mode: load contacts
  useEffect(() => {
    if (mode !== "browse") return;
    fetchBrowseContacts(sourceFilter);
  }, [mode, fetchBrowseContacts, sourceFilter]);

  const handleRate = useCallback(
    (contactId: string, rating: "high_value" | "skip") => {
      if (ratingLockRef.current) return;
      ratingLockRef.current = true;

      rateContact(contactId, rating);
      trackEvent("discover_rate", { contact_id: contactId, rating });

      setBrowseContacts((prev) => {
        const next = prev.filter((c) => c.id !== contactId);
        if (next.length === 0) setAllRated(true);
        return next;
      });

      setTimeout(() => {
        ratingLockRef.current = false;
      }, 80);
    },
    [],
  );

  // Keyboard: act on the top (first) unrated contact.
  useEffect(() => {
    if (mode !== "browse" || allRated || browseContacts.length === 0) return;
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      const top = browseContacts[0];
      if (!top) return;
      if (e.key === "ArrowLeft" || e.key === "j" || e.key === "3") {
        e.preventDefault();
        handleRate(top.id, "skip");
      } else if (e.key === "ArrowRight" || e.key === "k" || e.key === "1") {
        e.preventDefault();
        handleRate(top.id, "high_value");
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mode, allRated, browseContacts, handleRate]);

  // Fetch user name for intro modal
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((data) => {
        if (data?.user?.name) setUserName(data.user.name);
        else if (data?.user?.email) setUserName(data.user.email.split("@")[0]);
      })
      .catch(() => {});
  }, []);

  const handleAskIntro = useCallback(
    (contact: Contact, warmPath: WarmPath) => {
      setIntroTarget({ contact, warmPath });
    },
    [],
  );

  const runDiscover = useCallback(async () => {
    if (discoverLoading) return;
    const abort = new AbortController();
    discoverAbortRef.current = abort;
    setDiscoverLoading(true);
    setDiscoverResult(null);
    setDiscoverError(null);
    setDiscoverProgress(0);
    setDiscoverStage("starting");
    setDiscoverMessage("Starting discover pipeline…");
    setDiscoverLog([]);

    try {
      const res = await apiFetch("/api/discover/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "quick" }),
        signal: abort.signal,
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("application/x-ndjson")) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402) {
          setDiscoverError("UPGRADE_REQUIRED");
        } else {
          setDiscoverError(data.message || data.error || `HTTP ${res.status}`);
        }
        setDiscoverLoading(false);
        discoverAbortRef.current = null;
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalEvent: { imported: number; updated: number; failed: number; candidatesFound: number; mode: string } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          let event: { type: string; stage?: string; message?: string; progress?: number; imported?: number; updated?: number; failed?: number; candidatesFound?: number; mode?: string };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "stage") {
            setDiscoverStage(event.stage || "");
            setDiscoverMessage(event.message || "");
            if (typeof event.progress === "number") setDiscoverProgress(event.progress);
            setDiscoverLog((log) => [...log, event.message || ""]);
          } else if (event.type === "done") {
            finalEvent = {
              imported: event.imported || 0,
              updated: event.updated || 0,
              failed: event.failed || 0,
              candidatesFound: event.candidatesFound || 0,
              mode: event.mode || "quick",
            };
            setDiscoverProgress(100);
            setDiscoverStage("done");
            setDiscoverMessage(
              `Found ${finalEvent.candidatesFound} · Imported ${finalEvent.imported} · Updated ${finalEvent.updated}`,
            );
          } else if (event.type === "error") {
            setDiscoverError(event.message || "Pipeline error");
          } else if (event.type === "aborted") {
            setDiscoverError("Cancelled");
          }
        }
      }

      if (finalEvent) {
        setDiscoverResult(
          `Found ${finalEvent.candidatesFound} · Imported ${finalEvent.imported} · Updated ${finalEvent.updated}`,
        );
        trackEvent("discover_run", {
          mode: finalEvent.mode,
          imported: finalEvent.imported,
          updated: finalEvent.updated,
        });
        if (mode === "browse") {
          await fetchBrowseContacts(sourceFilter);
        } else {
          await search(query, activeTier, sourceFilter);
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setDiscoverError("Cancelled");
      } else {
        setDiscoverError((err as Error)?.message || "Network error");
      }
    } finally {
      discoverAbortRef.current = null;
      setTimeout(() => {
        setDiscoverLoading(false);
      }, 1200);
      setTimeout(() => setDiscoverResult(null), 8000);
    }
  }, [discoverLoading, mode, fetchBrowseContacts, search, query, activeTier, sourceFilter]);

  const handleSourceFilter = useCallback((src: SourceFilter) => {
    setSourceFilter(src);
    const params = new URLSearchParams(searchParams.toString());
    if (src === "alumni") {
      params.delete("source");
    } else {
      params.set("source", src);
    }
    const qs = params.toString();
    router.replace(`/dashboard/discover${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [router, searchParams]);

  const cancelDiscover = useCallback(() => {
    if (discoverAbortRef.current) {
      discoverAbortRef.current.abort();
    }
  }, []);

  const dismissDiscoverModal = useCallback(() => {
    if (!discoverAbortRef.current) {
      setDiscoverLoading(false);
      setDiscoverError(null);
    }
  }, []);

  useEffect(() => {
    if (!discoverLoading) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", blockEscape, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", blockEscape, true);
    };
  }, [discoverLoading]);

  const runSeedProfessors = useCallback(async () => {
    if (seedLoading) return;
    const abort = new AbortController();
    seedAbortRef.current = abort;
    setSeedLoading(true);
    setSeedResult(null);
    setSeedError(null);
    setSeedProgress(0);
    setSeedStage("starting");
    setSeedMessage("Starting professor seed pipeline...");
    setSeedLog([]);

    try {
      const res = await apiFetch("/api/professors/seed", {
        method: "POST",
        signal: abort.signal,
      });

      const ct = res.headers.get("content-type") || "";
      if (!res.ok || !ct.includes("application/x-ndjson")) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 402) {
          setSeedError("UPGRADE_REQUIRED");
        } else {
          setSeedError(data.message || data.error || `HTTP ${res.status}`);
        }
        setSeedLoading(false);
        seedAbortRef.current = null;
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalEvent: { scraped: number; classified: number; inserted: number; updated: number; failed: number } | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          let event: { type: string; stage?: string; message?: string; progress?: number; scraped?: number; classified?: number; inserted?: number; updated?: number; failed?: number };
          try {
            event = JSON.parse(line);
          } catch {
            continue;
          }
          if (event.type === "stage") {
            setSeedStage(event.stage || "");
            setSeedMessage(event.message || "");
            if (typeof event.progress === "number") setSeedProgress(event.progress);
            setSeedLog((log) => [...log, event.message || ""]);
          } else if (event.type === "done") {
            finalEvent = {
              scraped: event.scraped || 0,
              classified: event.classified || 0,
              inserted: event.inserted || 0,
              updated: event.updated || 0,
              failed: event.failed || 0,
            };
            setSeedProgress(100);
            setSeedStage("done");
            setSeedMessage(
              `Scraped ${finalEvent.scraped} · Inserted ${finalEvent.inserted} · Updated ${finalEvent.updated}`,
            );
          } else if (event.type === "error") {
            setSeedError(event.message || "Seed pipeline error");
          } else if (event.type === "aborted") {
            setSeedError("Cancelled");
          }
        }
      }

      if (finalEvent) {
        setSeedResult(
          `Scraped ${finalEvent.scraped} · Inserted ${finalEvent.inserted} · Updated ${finalEvent.updated}`,
        );
        if (mode === "browse") {
          await fetchBrowseContacts(sourceFilter);
        } else {
          await search(query, activeTier, sourceFilter);
        }
      }
    } catch (err) {
      if ((err as Error)?.name === "AbortError") {
        setSeedError("Cancelled");
      } else {
        setSeedError((err as Error)?.message || "Network error");
      }
    } finally {
      seedAbortRef.current = null;
      setTimeout(() => {
        setSeedLoading(false);
      }, 1200);
      setTimeout(() => setSeedResult(null), 8000);
    }
  }, [seedLoading, mode, fetchBrowseContacts, search, query, activeTier, sourceFilter]);

  const cancelSeed = useCallback(() => {
    if (seedAbortRef.current) {
      seedAbortRef.current.abort();
    }
  }, []);

  const dismissSeedModal = useCallback(() => {
    if (!seedAbortRef.current) {
      setSeedLoading(false);
      setSeedError(null);
    }
  }, []);

  useEffect(() => {
    if (!seedLoading) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", blockEscape, true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", blockEscape, true);
    };
  }, [seedLoading]);

  const handleAddToPipeline = async (contactId: string) => {
    setAddingToPipeline(contactId);
    try {
      const res = await apiFetch(`/api/pipeline/${contactId}`, {
        method: "POST",
      });
      if (res.ok) {
        setPipelineAdded((prev) => new Set(prev).add(contactId));
        trackEvent("discover_add_pipeline", { contact_id: contactId });
      }
    } catch {
      // silently fail
    } finally {
      setAddingToPipeline(null);
    }
  };

  const pipelineStateFor = (contactId: string): "idle" | "pending" | "added" => {
    if (pipelineAdded.has(contactId)) return "added";
    if (addingToPipeline === contactId) return "pending";
    return "idle";
  };

  // Empty state: no contacts imported at all
  if (!loading && !hasAnyContacts) {
    return (
      <div className="flex min-h-full items-center justify-center p-5">
        <div className="max-w-sm border border-white/[0.06] bg-card p-10 text-center">
          <svg
            className="mx-auto mb-4 h-10 w-10 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="square"
              strokeLinejoin="miter"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"
            />
          </svg>
          <p className="text-lg font-semibold text-foreground">No Network Yet</p>
          <p className="mt-2 text-[12px] text-muted-foreground">
            Import your LinkedIn network to start discovering connections.
          </p>
          <a
            href="/dashboard/import"
            className="mt-5 inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary/80"
          >
            GO TO IMPORT
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col p-5">
      {/* ─── Header: title + source filter (left)   primary action (right) ─── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-end gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
              {sourceFilter === "professor" ? "PROFESSORS" : "DISCOVER"}
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {mode === "browse"
                ? sourceFilter === "professor"
                  ? "Rate professors from the shared pool"
                  : "Rate contacts from the shared pool"
                : sourceFilter === "professor"
                  ? "Search the professor network"
                  : "Search the shared network"}
            </p>
          </div>

          <div className="flex overflow-hidden border border-white/[0.06]">
            <button
              onClick={() => handleSourceFilter("alumni")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                sourceFilter === "alumni"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Alumni
            </button>
            <button
              onClick={() => handleSourceFilter("professor")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                sourceFilter === "professor"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="h-3 w-3" />
              Professors
            </button>
          </div>
        </div>

        {sourceFilter === "professor" ? (
          <button
            onClick={runSeedProfessors}
            disabled={seedLoading}
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            {seedLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="h-3 w-3" />
            )}
            {seedLoading ? "Seeding" : "Seed Professors"}
          </button>
        ) : (
          <button
            onClick={runDiscover}
            disabled={discoverLoading}
            className="flex items-center gap-1.5 bg-primary px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80 disabled:opacity-50"
          >
            {discoverLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Sparkles className="h-3 w-3" />
            )}
            {discoverLoading ? "Discovering" : "Discover New"}
          </button>
        )}
      </div>

      {(discoverResult || seedResult) && (
        <div className="mt-2 border border-primary/40 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          {discoverResult || seedResult}
        </div>
      )}

      {/* ─── Mode tab strip (Browse | Search) ─── */}
      <div className="mt-3 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex">
          <button
            onClick={() => setMode("browse")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              mode === "browse"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3 w-3" />
            Browse
          </button>
          <button
            onClick={() => setMode("search")}
            className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              mode === "search"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Search className="h-3 w-3" />
            Search
          </button>
        </div>

        {mode === "browse" && !loading && !allRated && browseContacts.length > 0 && (
          <div className="flex items-center gap-2 py-1 text-[10px] text-muted-foreground">
            <span className="tabular-nums">{browseContacts.length} unrated</span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1">
              <Kbd>1</Kbd>
              <Kbd>→</Kbd>
              <span className="text-muted-foreground">high value</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1">
              <Kbd>3</Kbd>
              <Kbd>←</Kbd>
              <span className="text-muted-foreground">skip</span>
            </span>
          </div>
        )}
      </div>

      {/* ═══════ BROWSE MODE: triage grid ═══════ */}
      {mode === "browse" && (
        <div className="mt-4 flex-1">
          {loading && (
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin border-2 border-muted border-t-primary" />
            </div>
          )}

          {!loading && allRated && (
            <div className="flex h-full flex-col items-center justify-center gap-4">
              <div className="border border-white/[0.06] bg-card px-10 py-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border border-primary/30 bg-primary/10">
                  <Star className="h-6 w-6 text-primary" />
                </div>
                <p className="text-lg font-bold text-foreground">All Caught Up!</p>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  You&apos;ve rated every contact in the pool.
                </p>
                <a
                  href="/dashboard/contacts"
                  className="mt-5 inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-primary/80"
                >
                  VIEW WARM SIGNALS
                </a>
              </div>
            </div>
          )}

          {!loading && !allRated && browseContacts.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {browseContacts.map((c, i) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  variant="rate"
                  focused={i === 0}
                  onRate={(rating) => handleRate(c.id, rating)}
                  onAskIntro={handleAskIntro}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ SEARCH MODE: explore grid ═══════ */}
      {mode === "search" && (
        <div className="mt-4 flex flex-1 flex-col">
          <div className="relative mb-3">
            <svg
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="square"
                strokeLinejoin="miter"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z"
              />
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, company, title, education, location..."
              className="w-full border border-input bg-muted py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTier("")}
              className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                !activeTier
                  ? "border-primary bg-primary/20 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              ALL
            </button>
            {TIERS.map((t) => (
              <button
                key={t}
                onClick={() =>
                  setActiveTier(
                    activeTier === t.toLowerCase() ? "" : t.toLowerCase(),
                  )
                }
                className={`border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                  activeTier === t.toLowerCase()
                    ? "border-primary bg-primary/20 text-primary"
                    : "border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {t}
              </button>
            ))}
            {total > 0 && (
              <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
                {total} result{total !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          {loading && (
            <div className="flex flex-1 items-center justify-center">
              <div className="h-6 w-6 animate-spin border-2 border-muted border-t-primary" />
            </div>
          )}

          {!loading && contacts.length === 0 && hasAnyContacts && (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted-foreground">
                No contacts match your search.
              </p>
            </div>
          )}

          {!loading && contacts.length > 0 && (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {contacts.map((c) => (
                <ContactCard
                  key={c.id}
                  contact={c}
                  variant="explore"
                  onAskIntro={handleAskIntro}
                  onAddToPipeline={handleAddToPipeline}
                  pipelineState={pipelineStateFor(c.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════ INTRO REQUEST MODAL ═══════ */}
      {introTarget && (
        <IntroModal
          contact={{
            id: introTarget.contact.id,
            name: introTarget.contact.name,
            title: introTarget.contact.title,
            firmName: introTarget.contact.firmName,
          }}
          warmPath={introTarget.warmPath}
          userName={userName || "a KithNode user"}
          onClose={() => setIntroTarget(null)}
        />
      )}

      {/* ═══════ SEED PROFESSORS MODAL ═══════ */}
      {seedLoading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="seed-modal-title"
        >
          <div className="w-full max-w-md border border-primary/30 bg-card shadow-2xl shadow-primary/20">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-primary" />
                <h3
                  id="seed-modal-title"
                  className="text-[11px] font-bold uppercase tracking-wider text-primary"
                >
                  {seedError ? "SEED STOPPED" : seedStage === "done" ? "SEED COMPLETE" : "SEEDING PROFESSORS"}
                </h3>
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {seedProgress}%
              </span>
            </div>

            <div className="h-1 w-full bg-muted">
              <div
                className={`h-full transition-all duration-300 ease-out ${
                  seedError ? "bg-red-500" : seedStage === "done" ? "bg-green-500" : "bg-primary"
                }`}
                style={{ width: `${seedProgress}%` }}
              />
            </div>

            <div className="space-y-3 px-5 py-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Stage
                </p>
                <p className="font-mono text-sm font-bold text-foreground">
                  {seedStage.toUpperCase() || "-"}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Status
                </p>
                <p className="text-[12px] text-foreground">
                  {seedError === "UPGRADE_REQUIRED" ? (
                    <span className="text-accent-teal">
                      Seed Professors is a Pro feature.{" "}
                      <a
                        href="/dashboard/billing"
                        className="font-bold uppercase tracking-wider hover:underline"
                      >
                        Upgrade →
                      </a>
                    </span>
                  ) : seedError ? (
                    <span className="text-red-400">{seedError}</span>
                  ) : (
                    seedMessage || "-"
                  )}
                </p>
              </div>

              {seedLog.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Activity
                  </p>
                  <div className="mt-1 max-h-32 overflow-y-auto border border-white/[0.06] bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {seedLog.slice(-6).map((line, i) => (
                      <div key={`${i}-${line}`} className="truncate">
                        ▸ {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/[0.06] px-5 py-3">
              {seedError || seedStage === "done" ? (
                <button
                  onClick={dismissSeedModal}
                  className="flex-1 border border-white/[0.12] bg-muted py-2 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.08]"
                >
                  CLOSE
                </button>
              ) : (
                <button
                  onClick={cancelSeed}
                  className="flex-1 border border-red-500/30 bg-red-500/10 py-2 text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20"
                >
                  <X className="mr-1 inline h-3 w-3" />
                  CANCEL
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════ DISCOVER PIPELINE MODAL ═══════ */}
      {discoverLoading && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="discover-modal-title"
        >
          <div className="w-full max-w-md border border-primary/30 bg-card shadow-2xl shadow-primary/20">
            <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h3
                  id="discover-modal-title"
                  className="text-[11px] font-bold uppercase tracking-wider text-primary"
                >
                  {discoverError ? "DISCOVER STOPPED" : discoverStage === "done" ? "DISCOVER COMPLETE" : "DISCOVERING"}
                </h3>
              </div>
              <span className="font-mono text-[10px] tabular-nums text-muted-foreground">
                {discoverProgress}%
              </span>
            </div>

            <div className="h-1 w-full bg-muted">
              <div
                className={`h-full transition-all duration-300 ease-out ${
                  discoverError ? "bg-red-500" : discoverStage === "done" ? "bg-green-500" : "bg-primary"
                }`}
                style={{ width: `${discoverProgress}%` }}
              />
            </div>

            <div className="space-y-3 px-5 py-5">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Stage
                </p>
                <p className="font-mono text-sm font-bold text-foreground">
                  {discoverStage.toUpperCase() || "-"}
                </p>
              </div>

              <div>
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                  Status
                </p>
                <p className="text-[12px] text-foreground">
                  {discoverError === "UPGRADE_REQUIRED" ? (
                    <span className="text-accent-teal">
                      Discover is a Pro feature.{" "}
                      <a
                        href="/dashboard/billing"
                        className="font-bold uppercase tracking-wider hover:underline"
                      >
                        Upgrade →
                      </a>
                    </span>
                  ) : discoverError ? (
                    <span className="text-red-400">{discoverError}</span>
                  ) : (
                    discoverMessage || "-"
                  )}
                </p>
              </div>

              {discoverLog.length > 0 && (
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
                    Activity
                  </p>
                  <div className="mt-1 max-h-32 overflow-y-auto border border-white/[0.06] bg-black/40 p-2 font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {discoverLog.slice(-6).map((line, i) => (
                      <div key={`${i}-${line}`} className="truncate">
                        ▸ {line}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 border-t border-white/[0.06] px-5 py-3">
              {discoverError || discoverStage === "done" ? (
                <button
                  onClick={dismissDiscoverModal}
                  className="flex-1 border border-white/[0.12] bg-muted py-2 text-[11px] font-bold uppercase tracking-wider text-foreground hover:bg-white/[0.08]"
                >
                  CLOSE
                </button>
              ) : (
                <button
                  onClick={cancelDiscover}
                  className="flex-1 border border-red-500/30 bg-red-500/10 py-2 text-[11px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20"
                >
                  <X className="mr-1 inline h-3 w-3" />
                  CANCEL
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
