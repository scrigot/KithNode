"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import * as Sentry from "@sentry/nextjs";
import { trackEvent } from "@/lib/posthog";
import { apiFetch } from "@/lib/api-client";
import { X, Star, Search, Sparkles, Loader2, GraduationCap, RefreshCw } from "lucide-react";
import { IntroModal } from "./intro-modal";
import { DeckCard, type DeckContact, type WarmPath } from "./deck-card";
import { ALL_TRACKS, type CareerTrack } from "@/lib/data/career-tracks";
import { CreditCost } from "@/components/credit-cost";

const TIERS = ["KITH", "HOT", "WARM", "MONITOR", "COLD"] as const;

// Discover pools, keyed off AlumniContact.personType (Alumni = graduated,
// Professor = faculty at the user's school, Student = current student).
type SourceFilter = "alumni" | "professor" | "student";

interface RateResult {
  ok: boolean;
  contact?: DeckContact | null;
}

async function rateContact(
  contactId: string,
  rating: "high_value" | "skip" | "later",
): Promise<RateResult> {
  try {
    const res = await apiFetch("/api/discover/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId, rating }),
    });
    if (!res.ok) return { ok: false };
    const data = await res.json();
    return { ok: true, contact: data.contact ?? null };
  } catch (err) {
    Sentry.captureException(err);
    return { ok: false };
  }
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[18px] items-center justify-center border border-white/[0.12] bg-muted px-1 py-0.5 font-mono text-[10px] font-bold text-foreground">
      {children}
    </kbd>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────
export default function DiscoverPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>(() => {
    const s = searchParams.get("source");
    if (s === "professor" || s === "student") return s;
    return "alumni";
  });
  const [query, setQuery] = useState("");
  const [activeTier, setActiveTier] = useState<string>("");
  // Optional career-track filter ("" = all tracks). Refetches the pool on change.
  const [trackFilter, setTrackFilter] = useState<CareerTrack | "">("");

  // The fetched deck (pre-sorted by warmthScore desc) and the local cursor.
  const [deck, setDeck] = useState<DeckContact[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasAnyContacts, setHasAnyContacts] = useState(true);
  const [reviewed, setReviewed] = useState(0);

  // Card exit transition: "" | "left" (skip) | "right" (add to pipeline).
  const [exitDir, setExitDir] = useState<"" | "left" | "right" | "down">("");

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
    contact: DeckContact;
    warmPath: WarmPath;
  } | null>(null);
  const [userName, setUserName] = useState("");

  // Add-to-pipeline state, keyed by the contact currently being added so the
  // card can show pending/sent feedback without a separate reveal phase.
  const [pipelineState, setPipelineState] = useState<{ id: string; state: "pending" | "sent" } | null>(null);
  // The user's default pipeline target for Discover adds (first owned pipeline).
  const [targetPipelineId, setTargetPipelineId] = useState<string>("");
  const ratingLockRef = useRef(false);

  const fetchDeck = useCallback(
    async (q: string, tier: string, src: SourceFilter, track: string) => {
      setLoading(true);
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (tier) params.set("tier", tier.toLowerCase());
      params.set("source", src);
      if (track) params.set("track", track);
      const qs = params.toString();

      try {
        const res = await apiFetch(`/api/discover${qs ? `?${qs}` : ""}`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        const next: DeckContact[] = data.contacts || [];
        setDeck(next);
        setIndex(0);
        setReviewed(0);
        setPipelineState(null);

        // "No network" only when the user truly has no imports — an exhausted
        // pool (rated everyone) or an empty search must NOT read as no-network.
        if (
          !q &&
          !tier &&
          next.length === 0 &&
          (data.total || 0) === 0 &&
          (data.networkSize || 0) === 0
        ) {
          setHasAnyContacts(false);
        } else {
          setHasAnyContacts(true);
        }
      } catch (err) {
        Sentry.captureException(err);
        setDeck([]);
        setIndex(0);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  // Debounced refetch on any filter change. Resets the deck index to 0.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDeck(query, activeTier, sourceFilter, trackFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, activeTier, sourceFilter, trackFilter, fetchDeck]);

  const current = deck[index] ?? null;
  const exhausted = !loading && deck.length > 0 && index >= deck.length;

  // Fire the first-warm-path analytics event once, the first time a card with a
  // warm path becomes the active card.
  const warmPathFiredRef = useRef(false);
  useEffect(() => {
    if (warmPathFiredRef.current) return;
    if (current && current.warmPaths && current.warmPaths.length > 0) {
      warmPathFiredRef.current = true;
      trackEvent("first_warm_path_viewed", {
        contact_id: current.id,
        warm_path_count: current.warmPaths.length,
      });
    }
  }, [current]);

  /** Advance the cursor with a directional slide, then settle. */
  const advance = useCallback((dir: "left" | "right" | "down") => {
    setExitDir(dir);
    globalThis.setTimeout(() => {
      setIndex((i) => i + 1);
      setReviewed((r) => r + 1);
      setExitDir("");
    }, 200);
  }, []);

  const handleSkip = useCallback(() => {
    if (ratingLockRef.current || !current) return;
    ratingLockRef.current = true;
    trackEvent("discover_rate", { contact_id: current.id, rating: "skip" });
    // Skip: fire-and-forget, advance immediately with a left slide. Logged as a
    // rating but never gates visibility.
    rateContact(current.id, "skip");
    advance("left");
    globalThis.setTimeout(() => {
      ratingLockRef.current = false;
    }, 220);
  }, [current, advance]);

  /** Add the current contact to the user's pipeline, then advance the deck. */
  const handleAddToPipeline = useCallback(async () => {
    if (ratingLockRef.current || !current) return;
    const target = current;
    ratingLockRef.current = true;
    setPipelineState({ id: target.id, state: "pending" });
    trackEvent("discover_add_pipeline", { contact_id: target.id, source: "deck" });
    try {
      // Record high_value so the contact stays unredacted in the pipeline view
      // (pipeline GET keys "unlocked" off high_value ratings). Non-gating.
      rateContact(target.id, "high_value");
      // Resolve the target pipeline (first owned). If the cached id is missing
      // (fetch not yet resolved), fetch fresh so the add never silently 400s on
      // an empty pipelineId.
      let pipelineId = targetPipelineId;
      if (!pipelineId) {
        const pRes = await apiFetch("/api/pipeline");
        const pData = await pRes.json().catch(() => ({}));
        pipelineId = pData?.pipelines?.[0]?.id ?? "";
        if (pipelineId) setTargetPipelineId(pipelineId);
      }
      const res = pipelineId
        ? await apiFetch(`/api/pipeline/${target.id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pipelineId }),
          })
        : null;
      if (res === null) {
        // No pipeline to add into — advance without trapping the user.
        setPipelineState(null);
        advance("right");
        globalThis.setTimeout(() => {
          ratingLockRef.current = false;
        }, 220);
        return;
      }
      if (res.ok) {
        setPipelineState({ id: target.id, state: "sent" });
        globalThis.setTimeout(() => {
          setPipelineState(null);
          advance("right");
          globalThis.setTimeout(() => {
            ratingLockRef.current = false;
          }, 220);
        }, 600);
      } else {
        setPipelineState(null);
        ratingLockRef.current = false;
      }
    } catch (err) {
      Sentry.captureException(err);
      setPipelineState(null);
      ratingLockRef.current = false;
    }
  }, [current, advance, targetPipelineId]);

  /** Add the current contact to the user's network (contacts list), advance down. */
  const handleAddToNetwork = useCallback(() => {
    if (ratingLockRef.current || !current) return;
    const target = current;
    ratingLockRef.current = true;
    rateContact(target.id, "high_value");
    trackEvent("discover_add_network", { contact_id: target.id });
    advance("down");
    globalThis.setTimeout(() => {
      ratingLockRef.current = false;
    }, 220);
  }, [current, advance]);

  /** Defer this contact — it resurfaces in a future deck. Advance down. */
  const handleLater = useCallback(() => {
    if (ratingLockRef.current || !current) return;
    const target = current;
    ratingLockRef.current = true;
    rateContact(target.id, "later");
    trackEvent("discover_rate", { contact_id: target.id, rating: "later" });
    advance("down");
    globalThis.setTimeout(() => {
      ratingLockRef.current = false;
    }, 220);
  }, [current, advance]);

  const handleAskIntro = useCallback(
    (contact: DeckContact, warmPath: WarmPath) => {
      setIntroTarget({ contact, warmPath });
    },
    [],
  );

  // Keyboard: ArrowLeft = skip, ArrowRight = add to pipeline.
  // Ignored while a request is in flight or any modal is open.
  useEffect(() => {
    const anyModalOpen =
      introTarget !== null || discoverLoading || seedLoading;
    if (anyModalOpen || !current) return;
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA"].includes(target.tagName)) return;
      if (ratingLockRef.current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        handleSkip();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        handleAddToPipeline();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [current, introTarget, discoverLoading, seedLoading, handleSkip, handleAddToPipeline]);

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

  // Resolve the default pipeline target for Discover adds: the user's first
  // owned pipeline. Adds POST /api/pipeline/:contactId with this id.
  useEffect(() => {
    apiFetch("/api/pipeline")
      .then((r) => r.json())
      .then((data) => {
        const first = data?.pipelines?.[0]?.id;
        if (first) setTargetPipelineId(first);
      })
      .catch((err) => Sentry.captureException(err));
  }, []);

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
          } catch (err) {
    Sentry.captureException(err);
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
        await fetchDeck(query, activeTier, sourceFilter, trackFilter);
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
  }, [discoverLoading, fetchDeck, query, activeTier, sourceFilter, trackFilter]);

  const handleSourceFilter = useCallback((src: SourceFilter) => {
    setSourceFilter(src);
    const params = new URLSearchParams(searchParams.toString());
    params.delete("view");
    if (src === "alumni") params.delete("source");
    else params.set("source", src);
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
          } catch (err) {
    Sentry.captureException(err);
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
        await fetchDeck(query, activeTier, sourceFilter, trackFilter);
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
  }, [seedLoading, fetchDeck, query, activeTier, sourceFilter, trackFilter]);

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

  const total = deck.length;
  const position = Math.min(index + 1, total);

  return (
    <div className="flex min-h-full flex-col p-5">
      {/* ─── Header: title + source filter (left) · primary action (right) ─── */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-end gap-4">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
              {sourceFilter === "professor"
                ? "PROFESSORS"
                : sourceFilter === "student"
                  ? "STUDENTS"
                  : "ALUMNI"}
            </h2>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {sourceFilter === "professor"
                ? "Faculty at your school"
                : sourceFilter === "student"
                  ? "Current students · ranked by every shared signal"
                  : "Graduated contacts · ranked by shared firm · school · clubs"}
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
            <button
              onClick={() => handleSourceFilter("student")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                sourceFilter === "student"
                  ? "bg-primary text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Students
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
            {!discoverLoading && <CreditCost action="discover" />}
          </button>
        )}
      </div>

      {/* ─── Compact career-track filter row ─── narrows the pool to one track;
          refetches + resets the deck on change. ALL clears it. ─── */}
      <div className="mt-3 flex flex-wrap items-center gap-1">
        <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
          Track
        </span>
        <button
          onClick={() => setTrackFilter("")}
          className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
            trackFilter === ""
              ? "border-primary/30 bg-primary/20 text-primary"
              : "border-white/[0.06] text-muted-foreground hover:text-foreground"
          }`}
        >
          All
        </button>
        {ALL_TRACKS.map((t) => (
          <button
            key={t}
            onClick={() => setTrackFilter(t)}
            className={`border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
              trackFilter === t
                ? "border-primary/30 bg-primary/20 text-primary"
                : "border-white/[0.06] text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {(discoverResult || seedResult) && (
        <div className="mt-2 border border-primary/40 bg-primary/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
          {discoverResult || seedResult}
        </div>
      )}

      {/* ─── Search + tier filter row ─── refetch + reset the deck ─── */}
      <div className="mt-3 flex flex-col gap-2 border-b border-white/[0.06] pb-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, company, title, education, location..."
            className="w-full border border-input bg-muted py-2 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1">
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
                setActiveTier(activeTier === t.toLowerCase() ? "" : t.toLowerCase())
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
        </div>
      </div>

      {/* ─── Progress indicator + keyboard hints ─── */}
      {!loading && !exhausted && current && (
        <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
          <span className="font-mono tabular-nums">
            {position} / {total}
          </span>
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <Kbd>←</Kbd>
              <span className="text-muted-foreground">skip</span>
            </span>
            <span className="text-muted-foreground/40">·</span>
            <span className="flex items-center gap-1">
              <Kbd>→</Kbd>
              <span className="text-muted-foreground">add to pipeline</span>
            </span>
          </div>
        </div>
      )}

      {/* ═══════ DECK ═══════ */}
      <div className="mt-4 flex flex-1 items-start justify-center">
        {loading && (
          <div className="flex h-full items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin border-2 border-muted border-t-primary" />
          </div>
        )}

        {/* No search matches (pool exists, but the query/tier filtered to empty). */}
        {!loading && deck.length === 0 && hasAnyContacts && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-sm text-muted-foreground">
              No contacts match your filters.
            </p>
            {(query || activeTier || trackFilter) && (
              <button
                onClick={() => {
                  setQuery("");
                  setActiveTier("");
                  setTrackFilter("");
                }}
                className="mt-3 border border-white/[0.12] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Deck exhausted — reviewed everything in this batch. */}
        {exhausted && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-full max-w-md border border-white/[0.06] bg-card px-10 py-8 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center border border-primary/30 bg-primary/10">
                <Star className="h-6 w-6 text-primary" />
              </div>
              <p className="text-lg font-bold text-foreground">Deck Complete</p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                You reviewed{" "}
                <span className="font-bold tabular-nums text-foreground">{reviewed}</span>{" "}
                {reviewed === 1 ? "contact" : "contacts"} in this deck.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground/70">
                Switch tabs, adjust the track filter, or import more to keep going.
              </p>
              <div className="mt-5 flex justify-center gap-2">
                <button
                  onClick={() => fetchDeck(query, activeTier, sourceFilter, trackFilter)}
                  className="inline-flex items-center gap-1.5 border border-white/[0.12] px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
                >
                  <RefreshCw className="h-3 w-3" />
                  Reload
                </button>
                <a
                  href="/dashboard/contacts"
                  className="inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80"
                >
                  View Warm Signals
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Active card: always fully revealed; primary action adds to pipeline. */}
        {!loading && current && !exhausted && (
          <div className="w-full max-w-2xl">
            <div
              className={`transition-all duration-200 ease-out ${
                exitDir === "left"
                  ? "-translate-x-8 opacity-0"
                  : exitDir === "right"
                    ? "translate-x-8 opacity-0"
                    : exitDir === "down"
                      ? "translate-y-8 opacity-0"
                      : "translate-x-0 opacity-100"
              }`}
            >
              <DeckCard
                key={current.id}
                contact={current}
                pipelineState={pipelineState?.id === current.id ? pipelineState.state : "idle"}
                inFlight={false}
                onSkip={handleSkip}
                onAddToPipeline={handleAddToPipeline}
                onAddToNetwork={handleAddToNetwork}
                onLater={handleLater}
                onAskIntro={(wp) => handleAskIntro(current, wp)}
              />
            </div>
          </div>
        )}
      </div>

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
