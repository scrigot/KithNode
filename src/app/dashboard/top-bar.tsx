"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Bell, Mail } from "lucide-react";
import { apiFetch } from "@/lib/api-client";

interface OverviewLite {
  reminders_count: number;
  top_unrated: Array<unknown>;
  subscription_status: string;
  trial_days_left: number | null;
}

export function TopBar({ userName }: { userName: string }) {
  const [overdue, setOverdue] = useState(0);
  const [unread, setUnread] = useState(0);

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
      <div className="flex-1 max-w-md">
        <div className="flex items-center gap-2 border border-white/[0.06] bg-card px-3 py-1.5">
          <Search size={13} className="text-text-muted" />
          <input
            type="text"
            placeholder="Search contacts, firms, alumni..."
            className="flex-1 bg-transparent text-[12px] text-foreground placeholder:text-text-muted focus:outline-none"
          />
          <kbd className="border border-white/[0.06] bg-white/[0.02] px-1 font-mono text-[9px] text-text-muted">
            ⌘K
          </kbd>
        </div>
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
