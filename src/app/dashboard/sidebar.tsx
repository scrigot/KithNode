"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Compass,
  Upload,
  Settings,
  CreditCard,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const NAV_GROUPS = [
  {
    label: "PAGES",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard, countKey: null },
      { href: "/dashboard/contacts", label: "Warm Signals", icon: Users, countKey: "warm_signals" },
      { href: "/dashboard/pipeline", label: "Pipeline", icon: GitBranch, countKey: "pipeline" },
      { href: "/dashboard/discover", label: "Discover", icon: Compass, countKey: "discover" },
    ],
  },
  {
    label: "DATA",
    items: [
      { href: "/dashboard/import", label: "Import", icon: Upload, countKey: null },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings, countKey: null },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard, countKey: null },
    ],
  },
];

function SubBadge({
  status,
  trialDaysLeft,
}: {
  status: string | null;
  trialDaysLeft: number | null;
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
      className={`mt-0.5 inline-flex w-fit items-center border px-1.5 py-px text-[8px] font-bold uppercase tracking-wider transition-colors hover:opacity-80 ${className}`}
    >
      {label}
    </Link>
  );
}

function NavContent({
  pathname,
  userName,
  subscriptionStatus,
  trialDaysLeft,
  counts,
  onNavClick,
}: {
  pathname: string;
  userName: string;
  subscriptionStatus: string | null;
  trialDaysLeft: number | null;
  counts: Record<string, number>;
  onNavClick?: () => void;
}) {
  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5">
        <h1 className="font-heading text-xl font-bold tracking-tight text-white">
          Kith<span className="text-accent-teal">Node</span>
        </h1>
        <p className="mt-0.5 text-[9px] font-mono uppercase tracking-widest text-text-muted">
          v0.1-alpha
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="mb-3">
            <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              const count = item.countKey != null ? (counts[item.countKey] ?? 0) : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  className={`mb-0.5 flex items-center gap-3 px-3 py-2.5 text-[13px] transition-all duration-200 border-l-2 ${
                    active
                      ? "bg-accent-teal/10 text-accent-teal font-medium border-accent-teal shadow-[inset_4px_0_12px_-6px_rgba(14,165,233,0.3)]"
                      : "border-transparent text-text-secondary hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={active ? "text-accent-teal drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]" : ""}
                  />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="ml-auto border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[9px] font-bold tabular-nums text-foreground">
                      {count}
                    </span>
                  )}
                  <ChevronRight size={12} className="text-text-muted" />
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.06] px-4 py-3">
        <a
          href="https://kithnode.canny.io"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-3 flex items-center gap-2 text-[11px] text-text-muted hover:text-accent-teal transition-colors duration-150"
        >
          <MessageSquare size={14} />
          Send Feedback
        </a>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-accent-teal/15 text-[11px] font-bold text-accent-teal">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-[12px] font-medium text-white">{userName}</p>
            <SubBadge status={subscriptionStatus} trialDaysLeft={trialDaysLeft} />
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="flex items-center gap-1 text-[11px] text-text-muted hover:text-accent-red transition-colors duration-150"
            >
              <LogOut size={10} />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setSubscriptionStatus(d.subscription_status ?? null);
        setTrialDaysLeft(d.trial_days_left ?? null);
        const tc = d.tier_counts ?? { hot: 0, warm: 0, monitor: 0, cold: 0 };
        setCounts({
          warm_signals: (tc.hot || 0) + (tc.warm || 0),
          pipeline: d.reminders_count || 0,
          discover: (d.top_unrated || []).length,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Desktop sidebar: hidden below lg */}
      <aside className="hidden lg:flex w-[220px] flex-col border-r border-white/[0.06] bg-bg-secondary">
        <NavContent
          pathname={pathname}
          userName={userName}
          subscriptionStatus={subscriptionStatus}
          trialDaysLeft={trialDaysLeft}
          counts={counts}
        />
      </aside>

      {/* Mobile top bar: visible below lg */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-bg-secondary px-4 py-3">
        <h1 className="font-heading text-lg font-bold tracking-tight text-white">
          Kith<span className="text-accent-teal">Node</span>
        </h1>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="text-text-secondary hover:text-white transition-colors duration-150"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/60"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 flex h-full w-[260px] flex-col border-r border-white/[0.06] bg-bg-secondary transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button */}
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="text-text-secondary hover:text-white transition-colors duration-150"
          >
            <X size={20} />
          </button>
        </div>
        <NavContent
          pathname={pathname}
          userName={userName}
          subscriptionStatus={subscriptionStatus}
          trialDaysLeft={trialDaysLeft}
          counts={counts}
          onNavClick={() => setOpen(false)}
        />
      </aside>
    </>
  );
}
