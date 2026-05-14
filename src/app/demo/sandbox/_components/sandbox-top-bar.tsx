"use client";

import Link from "next/link";
import { Search, Bell, Compass } from "lucide-react";
import { SANDBOX_OVERVIEW } from "../_data";

export function SandboxTopBar() {
  const overdue = SANDBOX_OVERVIEW.reminders_count;
  const unread = SANDBOX_OVERVIEW.unread_count;

  return (
    <header className="hidden h-[49px] items-center justify-between gap-4 border-b border-white/[0.06] bg-bg-secondary px-5 lg:flex">
      {/* Search */}
      <div className="max-w-md flex-1">
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
          href="/waitlist?from=demo&section=pipeline"
          aria-label="Overdue follow-ups"
          className="relative border border-white/[0.06] bg-card p-1.5 hover:border-white/[0.18]"
        >
          <Bell size={14} className="text-text-secondary" />
          {overdue > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center border border-bg-secondary bg-accent-amber px-1 font-mono text-[9px] font-bold tabular-nums text-bg-primary">
              {overdue}
            </span>
          )}
        </Link>
        <Link
          href="/demo/sandbox/discover"
          aria-label="Unrated discoveries"
          className="relative border border-white/[0.06] bg-card p-1.5 hover:border-white/[0.18]"
        >
          <Compass size={14} className="text-text-secondary" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center border border-bg-secondary bg-accent-teal px-1 font-mono text-[9px] font-bold tabular-nums text-bg-primary">
              {unread}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-2 border border-white/[0.06] bg-card px-2 py-1">
          <div className="flex h-7 w-7 items-center justify-center bg-accent-teal/15 text-[10px] font-bold text-accent-teal">
            DV
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold leading-tight text-foreground">
              Demo Visitor
            </span>
            <span className="text-[9px] uppercase leading-tight tracking-wider text-text-muted">
              DEMO MODE
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
