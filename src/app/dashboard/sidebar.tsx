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
  Share2,
  Upload,
  Settings,
  CreditCard,
  MessageSquare,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronLeft,
  Gauge,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

const NAV_GROUPS = [
  {
    label: "PAGES",
    items: [
      { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
      { href: "/dashboard/contacts", label: "Warm Signals", icon: Users },
      { href: "/dashboard/pipeline", label: "Pipeline", icon: GitBranch },
      { href: "/dashboard/discover", label: "Discover", icon: Compass },
      { href: "/dashboard/network", label: "Network", icon: Share2 },
    ],
  },
  {
    label: "DATA",
    items: [
      { href: "/dashboard/import", label: "Import", icon: Upload },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { href: "/dashboard/settings", label: "Settings", icon: Settings },
      { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
    ],
  },
];

// Founder-only nav group, appended in NavContent when isFounderUser is true.
const FOUNDER_NAV_GROUP = {
  label: "FOUNDER",
  items: [
    { href: "/dashboard/ops", label: "Ops", icon: Gauge },
  ],
};

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
  isFounderUser,
  collapsed,
  onNavClick,
  onToggleCollapse,
}: {
  pathname: string;
  userName: string;
  subscriptionStatus: string | null;
  trialDaysLeft: number | null;
  isFounderUser: boolean;
  collapsed?: boolean;
  onNavClick?: () => void;
  onToggleCollapse?: () => void;
}) {
  const navGroups = isFounderUser
    ? [...NAV_GROUPS, FOUNDER_NAV_GROUP]
    : NAV_GROUPS;
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
      <div className={`flex items-center justify-between ${collapsed ? "px-3 py-5" : "px-5 py-5"}`}>
        {collapsed ? (
          <span className="font-heading text-xl font-bold text-accent-teal">K</span>
        ) : (
          <div>
            <h1 className="font-heading text-xl font-bold tracking-tight text-white">
              Kith<span className="text-accent-teal">Node</span>
            </h1>
            <p className="mt-0.5 text-[9px] font-mono uppercase tracking-widest text-text-muted">
              v0.1-alpha
            </p>
          </div>
        )}
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="text-text-muted hover:text-white transition-colors duration-150"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-3">
            {!collapsed && (
              <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavClick}
                  title={collapsed ? item.label : undefined}
                  className={`mb-0.5 flex items-center border-l-2 transition-all duration-200 ${
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                  } text-[13px] ${
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
                  {!collapsed && (
                    <span className="flex-1">{item.label}</span>
                  )}
                  {!collapsed && (
                    <ChevronRight size={12} className="text-text-muted" />
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div className={`border-t border-white/[0.06] ${collapsed ? "px-2 py-3" : "px-4 py-3"}`}>
        {!collapsed && (
          <a
            href="https://kithnode.canny.io"
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex items-center gap-2 text-[11px] text-text-muted hover:text-accent-teal transition-colors duration-150"
          >
            <MessageSquare size={14} />
            Send Feedback
          </a>
        )}
        <div className={`flex ${collapsed ? "flex-col items-center gap-2" : "items-center gap-3"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-accent-teal/15 text-[11px] font-bold text-accent-teal">
            {initials}
          </div>
          {!collapsed && (
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
          )}
          {collapsed && (
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              title="Sign out"
              className="text-text-muted hover:text-accent-red transition-colors duration-150"
            >
              <LogOut size={14} />
            </button>
          )}
        </div>
      </div>
    </>
  );
}

export function Sidebar({
  userName,
  isFounderUser,
}: {
  userName: string;
  isFounderUser: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

  // Lazy-init from localStorage, SSR-safe.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("kn-sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });

  // Persist collapsed state.
  useEffect(() => {
    try {
      localStorage.setItem("kn-sidebar-collapsed", String(collapsed));
    } catch {
      // storage unavailable — ignore
    }
  }, [collapsed]);

  // Global Cmd/Ctrl+B keyboard shortcut (desktop only).
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((c) => !c);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d) return;
        setSubscriptionStatus(d.subscription_status ?? null);
        setTrialDaysLeft(d.trial_days_left ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      {/* Desktop sidebar: hidden below lg */}
      <aside
        className={`hidden lg:flex flex-col border-r border-white/[0.06] bg-bg-secondary transition-all duration-200 ${
          collapsed ? "w-14" : "w-[220px]"
        }`}
      >
        <NavContent
          pathname={pathname}
          userName={userName}
          subscriptionStatus={subscriptionStatus}
          trialDaysLeft={trialDaysLeft}
          isFounderUser={isFounderUser}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
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
          isFounderUser={isFounderUser}
          onNavClick={() => setOpen(false)}
        />
      </aside>
    </>
  );
}
