"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Bell, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { SearchResult } from "@/app/api/search/route";

interface OverviewLite {
  reminders_count: number;
  top_unrated: Array<unknown>;
  subscription_status: string;
  trial_days_left: number | null;
}

const TIER_COLORS: Record<string, string> = {
  hot: "text-accent-amber border-accent-amber/30 bg-accent-amber/10",
  warm: "text-accent-teal border-accent-teal/30 bg-accent-teal/10",
  cold: "text-text-muted border-white/[0.06] bg-white/[0.02]",
};

function tierColor(tier: string) {
  return TIER_COLORS[tier] ?? TIER_COLORS.cold;
}

export function TopBar({ userName }: { userName: string }) {
  const router = useRouter();
  const [overdue, setOverdue] = useState(0);
  const [unread, setUnread] = useState(0);

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K global focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes dropdown
  useEffect(() => {
    function onPointer(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, []);

  // Dashboard overview counts
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OverviewLite | null) => {
        if (cancelled || !d) return;
        setOverdue(d.reminders_count || 0);
        setUnread((d.top_unrated || []).length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced search fetch
  const doSearch = useCallback((q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    apiFetch(`/api/search?q=${encodeURIComponent(q)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SearchResult[]) => {
        setResults(data);
        setOpen(true);
        setActiveIdx(-1);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 250);
  }

  function navigate(id: string) {
    setOpen(false);
    setQuery("");
    setResults([]);
    setActiveIdx(-1);
    router.push(`/contact/${id}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = activeIdx >= 0 ? results[activeIdx] : results[0];
      if (target) navigate(target.id);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setActiveIdx(-1);
      inputRef.current?.blur();
    }
  }

  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <header className="hidden lg:flex items-center justify-between gap-4 border-b border-white/[0.06] bg-bg-secondary px-5 h-[49px]">
      {/* Search */}
      <div className="flex-1 max-w-md relative" ref={containerRef}>
        <div className="flex items-center gap-2 border border-white/[0.06] bg-card px-3 py-1.5">
          <Search size={13} className="text-text-muted" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            placeholder="Search contacts, firms, alumni..."
            className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-text-muted focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {loading ? (
            <span className="h-3 w-3 border border-white/[0.12] border-t-accent-teal/60 rounded-full animate-spin" />
          ) : (
            <kbd className="border border-white/[0.06] bg-white/[0.02] px-1 font-mono text-[9px] text-text-muted">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Dropdown */}
        {open && (
          <div className="absolute left-0 right-0 top-[calc(100%+2px)] z-50 border border-white/[0.06] bg-bg-secondary shadow-lg">
            {results.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-text-muted">No matches</div>
            ) : (
              results.map((r, i) => (
                <button
                  key={r.id}
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    navigate(r.id);
                  }}
                  className={[
                    "w-full flex items-center justify-between gap-3 px-3 py-2 text-left border-b border-white/[0.04] last:border-b-0",
                    i === activeIdx ? "bg-white/[0.04]" : "hover:bg-white/[0.03]",
                  ].join(" ")}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[12px] font-medium text-foreground truncate">{r.name}</div>
                    <div className="text-[10px] text-text-muted truncate">
                      {r.title}
                      {r.title && r.firmName ? " @ " : ""}
                      {r.firmName}
                    </div>
                  </div>
                  <span
                    className={[
                      "shrink-0 border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider",
                      tierColor(r.tier),
                    ].join(" ")}
                  >
                    {r.tier}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Right cluster */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/pipeline"
          aria-label="Overdue follow-ups"
          className="relative border border-white/[0.06] bg-card p-1.5 hover:border-white/[0.18]"
        >
          <Bell size={14} className="text-text-secondary" />
          {overdue > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center border border-bg-secondary bg-accent-amber px-1 font-mono text-[9px] font-bold tabular-nums text-bg-primary">
              {overdue}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard/discover"
          aria-label="Unrated discoveries"
          className="relative border border-white/[0.06] bg-card p-1.5 hover:border-white/[0.18]"
        >
          <Mail size={14} className="text-text-secondary" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center border border-bg-secondary bg-accent-teal px-1 font-mono text-[9px] font-bold tabular-nums text-bg-primary">
              {unread}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 border border-white/[0.06] bg-card px-2 py-1">
          <div className="flex h-7 w-7 items-center justify-center bg-accent-teal/15 text-[10px] font-bold text-accent-teal">
            {initials}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold leading-tight text-foreground">{userName}</span>
            <span className="text-[9px] uppercase tracking-wider leading-tight text-text-muted">Operator</span>
          </div>
        </div>
      </div>
    </header>
  );
}
