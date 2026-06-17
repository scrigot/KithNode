"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Bell,
  Mail,
  ChevronRight,
  LogOut,
  User,
  CreditCard,
  BarChart2,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";
import { LogoWordmark } from "@/components/logo";
import type { SearchResult } from "@/app/api/search/route";

interface OverdueLite {
  contactId: string;
  contactName: string;
  firmName: string;
  stage: string;
  days: number;
  isRedacted?: boolean;
}

interface UnratedLite {
  contactId: string;
  contactName: string;
  firmName: string;
  score: number;
  tier: string;
}

interface OverviewLite {
  reminders_count: number;
  top_overdue: OverdueLite[];
  top_unrated: UnratedLite[];
  subscription_status: string;
  trial_days_left: number | null;
  ratings: { high_value: number; total: number };
}

const TIER_COLORS: Record<string, string> = {
  hot: "text-accent-amber border-accent-amber/30 bg-accent-amber/10",
  warm: "text-accent-teal border-accent-teal/30 bg-accent-teal/10",
  cold: "text-text-muted border-white/[0.06] bg-white/[0.02]",
};

function tierColor(tier: string) {
  return TIER_COLORS[tier] ?? TIER_COLORS.cold;
}

// Plan-tier badge (relocated from the sidebar). Returns null for active subscribers.
function SubBadge({
  status,
  trialDaysLeft,
  onClick,
}: {
  status: string | null;
  trialDaysLeft: number | null;
  onClick?: () => void;
}) {
  if (!status || status === "active") return null;
  const isTrial = status === "trial" && trialDaysLeft != null && trialDaysLeft > 0;
  const label = isTrial ? `TRIAL · ${trialDaysLeft}d` : "FREE TIER";
  const className = isTrial
    ? "border-accent-teal/30 bg-accent-teal/10 text-accent-teal"
    : "border-amber-500/30 bg-amber-500/10 text-amber-400";
  return (
    <Link
      href="/dashboard/billing"
      onClick={onClick}
      className={`mt-1 inline-flex w-fit items-center border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider transition-colors hover:opacity-80 ${className}`}
    >
      {label}
    </Link>
  );
}

type Panel = "bell" | "mail" | "profile" | null;

export function TopBar({ userName, userEmail }: { userName: string; userEmail: string }) {
  const router = useRouter();
  const [overdue, setOverdue] = useState(0);
  const [unread, setUnread] = useState(0);
  const [overdueList, setOverdueList] = useState<OverdueLite[]>([]);
  const [unratedList, setUnratedList] = useState<UnratedLite[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  // Panel state — only one open at a time
  const [activePanel, setActivePanel] = useState<Panel>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLDivElement>(null);
  const mailRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⌘K / Ctrl+K global focus
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      if (e.key === "Escape") {
        setActivePanel(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Click outside closes search dropdown
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

  // Click outside closes popovers
  useEffect(() => {
    if (!activePanel) return;
    function onMouseDown(e: globalThis.MouseEvent) {
      const refs: Record<NonNullable<Panel>, React.RefObject<HTMLDivElement | null>> = {
        bell: bellRef,
        mail: mailRef,
        profile: profileRef,
      };
      const ref = activePanel ? refs[activePanel] : null;
      if (ref?.current && !ref.current.contains(e.target as Node)) {
        setActivePanel(null);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [activePanel]);

  // Dashboard overview counts + lists + subscription tier
  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: OverviewLite | null) => {
        if (cancelled || !d) return;
        setOverdue(d.reminders_count || 0);
        setUnread(d.ratings?.high_value || (d.top_unrated || []).length);
        setOverdueList(d.top_overdue || []);
        setUnratedList(d.top_unrated || []);
        setSubscriptionStatus(d.subscription_status ?? null);
        setTrialDaysLeft(d.trial_days_left ?? null);
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

  function togglePanel(panel: Panel) {
    setActivePanel((prev) => (prev === panel ? null : panel));
  }

  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <header className="hidden lg:flex items-center gap-4 border-b border-white/[0.06] bg-bg-secondary px-5 h-[49px]">
      {/* Logo */}
      <Link href="/dashboard" className="shrink-0" aria-label="KithNode home">
        <LogoWordmark iconClassName="h-6 w-6" textClassName="text-base" />
      </Link>

      {/* Search */}
      <div className="relative flex-1 max-w-md" ref={containerRef}>
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

        {/* Search Dropdown */}
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
      <div className="ml-auto flex items-center gap-3">
        {/* Bell — overdue follow-ups */}
        <div className="relative" ref={bellRef}>
          <button
            type="button"
            onClick={() => togglePanel("bell")}
            aria-label="Overdue follow-ups"
            aria-haspopup="dialog"
            aria-expanded={activePanel === "bell"}
            className={[
              "relative border bg-card p-1.5 transition-colors",
              activePanel === "bell"
                ? "border-white/[0.18] bg-white/[0.04]"
                : "border-white/[0.06] hover:border-white/[0.18]",
            ].join(" ")}
          >
            <Bell size={14} className="text-text-secondary" />
            {overdue > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center border border-bg-secondary bg-accent-amber px-1 font-mono text-[9px] font-bold tabular-nums text-bg-primary">
                {overdue}
              </span>
            )}
          </button>

          {activePanel === "bell" && (
            <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-[300px] border border-white/[0.06] bg-bg-secondary shadow-2xl">
              <div className="border-b border-white/[0.06] px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
                  Overdue Follow-ups
                </span>
                {overdue > 0 && (
                  <span className="border border-accent-amber/30 bg-accent-amber/10 px-1.5 py-px font-mono text-[9px] font-bold text-accent-amber">
                    {overdue}
                  </span>
                )}
              </div>
              {overdueList.length === 0 ? (
                <div className="px-3 py-4 text-[11px] text-text-muted text-center">
                  No overdue follow-ups
                </div>
              ) : (
                <div>
                  {overdueList.map((item) => (
                    <Link
                      key={item.contactId}
                      href={`/contact/${item.contactId}`}
                      onClick={() => setActivePanel(null)}
                      className="flex items-start justify-between gap-2 border-b border-white/[0.04] px-3 py-2 last:border-b-0 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-foreground truncate">
                          {item.contactName}
                        </div>
                        <div className="text-[10px] text-text-muted truncate">
                          {item.firmName}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] font-bold text-red-400 whitespace-nowrap">
                        {item.days}d overdue
                      </span>
                    </Link>
                  ))}
                </div>
              )}
              <div className="border-t border-white/[0.06] px-3 py-2">
                <Link
                  href="/dashboard/pipeline"
                  onClick={() => setActivePanel(null)}
                  className="flex items-center gap-1 text-[10px] text-text-muted hover:text-foreground transition-colors"
                >
                  View pipeline
                  <ChevronRight size={10} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Mail — warm signals */}
        <div className="relative" ref={mailRef}>
          <button
            type="button"
            onClick={() => togglePanel("mail")}
            aria-label="Warm signals"
            aria-haspopup="dialog"
            aria-expanded={activePanel === "mail"}
            className={[
              "relative border bg-card p-1.5 transition-colors",
              activePanel === "mail"
                ? "border-white/[0.18] bg-white/[0.04]"
                : "border-white/[0.06] hover:border-white/[0.18]",
            ].join(" ")}
          >
            <Mail size={14} className="text-text-secondary" />
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center border border-bg-secondary bg-accent-teal px-1 font-mono text-[9px] font-bold tabular-nums text-bg-primary">
                {unread}
              </span>
            )}
          </button>

          {activePanel === "mail" && (
            <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-[300px] border border-white/[0.06] bg-bg-secondary shadow-2xl">
              <div className="border-b border-white/[0.06] px-3 py-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-text-muted">
                  Warm Signals
                </span>
                {unread > 0 && (
                  <span className="border border-accent-teal/30 bg-accent-teal/10 px-1.5 py-px font-mono text-[9px] font-bold text-accent-teal">
                    {unread}
                  </span>
                )}
              </div>
              {unratedList.length > 0 ? (
                <div>
                  {unratedList.slice(0, 6).map((item) => (
                    <Link
                      key={item.contactId}
                      href={`/contact/${item.contactId}`}
                      onClick={() => setActivePanel(null)}
                      className="flex items-start justify-between gap-2 border-b border-white/[0.04] px-3 py-2 last:border-b-0 hover:bg-white/[0.03] transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-medium text-foreground truncate">
                          {item.contactName}
                        </div>
                        <div className="text-[10px] text-text-muted truncate">
                          {item.firmName}
                        </div>
                      </div>
                      <span className="shrink-0 font-mono text-[10px] font-bold text-accent-teal">
                        {Math.round(item.score)}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : unread > 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-[12px] font-medium text-foreground">{unread} high-value contacts</p>
                  <p className="text-[10px] text-text-muted mt-1">Rate in Discover to map warm paths</p>
                </div>
              ) : (
                <div className="px-3 py-4 text-[11px] text-text-muted text-center">
                  No warm signals right now
                </div>
              )}
              <div className="border-t border-white/[0.06] px-3 py-2">
                <Link
                  href="/dashboard/contacts"
                  onClick={() => setActivePanel(null)}
                  className="flex items-center gap-1 text-[10px] text-text-muted hover:text-foreground transition-colors"
                >
                  Open Warm Signals
                  <ChevronRight size={10} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile block */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => togglePanel("profile")}
            aria-label="Account menu"
            aria-haspopup="menu"
            aria-expanded={activePanel === "profile"}
            className={[
              "flex items-center gap-2 border bg-card px-2 py-1 transition-colors",
              activePanel === "profile"
                ? "border-white/[0.18] bg-white/[0.04]"
                : "border-white/[0.06] hover:border-white/[0.18]",
            ].join(" ")}
          >
            <div className="flex h-7 w-7 items-center justify-center bg-accent-teal/15 text-[10px] font-bold text-accent-teal">
              {initials}
            </div>
            <div className="flex flex-col">
              <span className="text-[11px] font-bold leading-tight text-foreground">{userName}</span>
              <span className="text-[9px] uppercase tracking-wider leading-tight text-text-muted">Operator</span>
            </div>
          </button>

          {activePanel === "profile" && (
            <div className="absolute right-0 top-[calc(100%+4px)] z-50 w-[230px] border border-white/[0.06] bg-bg-secondary shadow-2xl">
              {/* Header */}
              <div className="flex flex-col border-b border-white/[0.06] px-3 py-2.5">
                <div className="truncate text-[12px] font-bold text-foreground">{userName}</div>
                {userEmail && (
                  <div className="truncate font-mono text-[10px] text-text-muted">{userEmail}</div>
                )}
                <SubBadge
                  status={subscriptionStatus}
                  trialDaysLeft={trialDaysLeft}
                  onClick={() => setActivePanel(null)}
                />
              </div>

              {/* Account links */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setActivePanel(null)}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.04] hover:text-foreground transition-colors"
                >
                  <User size={12} className="shrink-0" />
                  Profile / Settings
                </Link>
                <Link
                  href="/dashboard/billing"
                  onClick={() => setActivePanel(null)}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.04] hover:text-foreground transition-colors"
                >
                  <CreditCard size={12} className="shrink-0" />
                  Billing
                </Link>
                <Link
                  href="/dashboard/usage"
                  onClick={() => setActivePanel(null)}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.04] hover:text-foreground transition-colors"
                >
                  <BarChart2 size={12} className="shrink-0" />
                  Usage
                </Link>
              </div>

              {/* Utility */}
              <div className="border-t border-white/[0.06] py-1">
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent("kn:start-tour"));
                    setActivePanel(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.04] hover:text-foreground transition-colors"
                >
                  <HelpCircle size={12} className="shrink-0" />
                  Take the tour
                </button>
                <a
                  href="https://kithnode.canny.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setActivePanel(null)}
                  className="flex items-center gap-2 px-3 py-2 text-[11px] text-text-secondary hover:bg-white/[0.04] hover:text-foreground transition-colors"
                >
                  <MessageSquare size={12} className="shrink-0" />
                  Send Feedback
                </a>
              </div>

              <div className="border-t border-white/[0.06] py-1">
                <button
                  type="button"
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="flex w-full items-center gap-2 px-3 py-2 text-[11px] text-text-muted hover:bg-white/[0.04] hover:text-red-400 transition-colors"
                >
                  <LogOut size={12} className="shrink-0" />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
