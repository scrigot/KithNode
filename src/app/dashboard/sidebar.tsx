"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Share2,
  Settings,
  MessageSquare,
  HelpCircle,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Gauge,
  PanelLeft,
  PanelLeftOpen,
  PanelLeftClose,
  Check,
  Bot,
  BriefcaseBusiness,
  Wrench,
} from "lucide-react";
import {
  type SidebarMode,
  resolveSidebarCollapsed,
  migrateSidebarMode,
  SIDEBAR_MODE_KEY,
} from "@/lib/sidebar-mode";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  tour?: string;
  matches?: string[];
};

const PRIMARY_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, tour: "overview" },
  { href: "/dashboard/assistant", label: "Career Copilot", icon: Bot },
  { href: "/dashboard/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/dashboard/network", label: "Network", icon: Share2, matches: ["/dashboard/contacts", "/dashboard/discover", "/dashboard/pipeline", "/dashboard/edge"] },
  { href: "/dashboard/toolkit", label: "Career Toolkit", icon: Wrench, matches: ["/dashboard/resume", "/dashboard/linkedin", "/dashboard/coffee-prep"] },
];

const NAV_GROUPS: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "WORKSPACE",
    items: PRIMARY_ITEMS,
  },
];

// Founder-only nav group, appended in NavContent when isFounderUser is true.
const FOUNDER_NAV_GROUP: { label: string; items: NavItem[] } = {
  label: "FOUNDER",
  items: [
    { href: "/dashboard/ops", label: "Ops", icon: Gauge, tour: undefined },
  ],
};

// Nav links only — shared by the desktop rail and the mobile drawer. Account
// identity is NOT here: on desktop it lives in the top-right avatar dropdown; on
// mobile (no top bar) it lives in <MobileAccount> at the bottom of the drawer.
function NavContent({
  pathname,
  isFounderUser,
  collapsed,
  onNavClick,
}: {
  pathname: string;
  isFounderUser: boolean;
  collapsed: boolean;
  onNavClick?: () => void;
}) {
  const navGroups = [
    ...NAV_GROUPS,
    ...(isFounderUser ? [FOUNDER_NAV_GROUP] : []),
  ];

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3">
      {navGroups.map((group) => (
        <div key={group.label} className="mb-3">
          {!collapsed && (
            <p className="mb-1 px-3 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </p>
          )}
          {group.items.map((item) => {
            const active = pathname === item.href || item.matches?.some((prefix) => pathname.startsWith(prefix));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavClick}
                title={collapsed ? item.label : undefined}
                data-tour={item.tour}
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
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && <ChevronRight size={12} className="text-text-muted" />}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

const MODE_OPTIONS: { mode: SidebarMode; label: string; icon: typeof PanelLeft }[] = [
  { mode: "expanded", label: "Expanded", icon: PanelLeftOpen },
  { mode: "collapsed", label: "Collapsed", icon: PanelLeftClose },
  { mode: "hover", label: "Expand on hover", icon: PanelLeft },
];

// Desktop-only footer: the Supabase-style sidebar control. Carries the
// `sidebar-collapse` tour anchor so the product tour still has a target.
function SidebarControl({
  mode,
  onMode,
  collapsed,
}: {
  mode: SidebarMode;
  onMode: (m: SidebarMode) => void;
  collapsed: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: globalThis.MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={ref} className="relative border-t border-white/[0.06] px-2 py-2">
      <button
        type="button"
        data-tour="sidebar-collapse"
        onClick={() => setOpen((o) => !o)}
        title="Sidebar control"
        aria-label="Sidebar control"
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center text-text-muted transition-colors duration-150 hover:text-accent-teal ${
          collapsed ? "w-full justify-center py-1.5" : "gap-2 px-1 py-1.5 text-[11px]"
        }`}
      >
        <PanelLeft size={14} />
        {!collapsed && <span>Sidebar control</span>}
      </button>

      {open && (
        <div className="absolute bottom-[calc(100%+4px)] left-2 z-50 w-[190px] border border-white/[0.06] bg-bg-secondary shadow-2xl">
          <div className="border-b border-white/[0.06] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.1em] text-text-muted">
            Sidebar control
          </div>
          {MODE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = opt.mode === mode;
            return (
              <button
                key={opt.mode}
                type="button"
                onClick={() => {
                  onMode(opt.mode);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-[11px] transition-colors ${
                  active
                    ? "bg-accent-teal/10 text-accent-teal"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-foreground"
                }`}
              >
                <Icon size={13} className="shrink-0" />
                <span className="flex-1 text-left">{opt.label}</span>
                {active && <Check size={12} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Mobile-drawer-only footer. The desktop top-right avatar dropdown owns identity +
// account on desktop, but the desktop bar is hidden on mobile, so the drawer keeps
// a compact account section (no top bar to fall back on).
function MobileAccount({ userName, onNavClick }: { userName: string; onNavClick: () => void }) {
  const initials =
    userName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "U";

  const links = [{ href: "/dashboard/settings", label: "Settings", icon: Settings }];

  return (
    <div className="border-t border-white/[0.06] px-4 py-3">
      <div className="mb-2 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center bg-accent-teal/15 text-[11px] font-bold text-accent-teal">
          {initials}
        </div>
        <p className="truncate text-[12px] font-medium text-white">{userName}</p>
      </div>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          onClick={onNavClick}
          className="flex items-center gap-2 py-1.5 text-[12px] text-text-secondary transition-colors hover:text-accent-teal"
        >
          <Icon size={14} className="shrink-0" />
          {label}
        </Link>
      ))}
      <button
        type="button"
        onClick={() => {
          window.dispatchEvent(new CustomEvent("kn:start-tour"));
          onNavClick();
        }}
        className="flex w-full items-center gap-2 py-1.5 text-[12px] text-text-secondary transition-colors hover:text-accent-teal"
      >
        <HelpCircle size={14} className="shrink-0" />
        Take the tour
      </button>
      <a
        href="https://kithnode.canny.io"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 py-1.5 text-[12px] text-text-secondary transition-colors hover:text-accent-teal"
      >
        <MessageSquare size={14} className="shrink-0" />
        Send Feedback
      </a>
      <button
        type="button"
        onClick={() => signOut({ callbackUrl: "/" })}
        className="flex items-center gap-2 py-1.5 text-[12px] text-text-muted transition-colors hover:text-accent-red"
      >
        <LogOut size={14} className="shrink-0" />
        Sign out
      </button>
    </div>
  );
}

export function Sidebar({
  isFounderUser,
  userName,
}: {
  isFounderUser: boolean;
  userName: string;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false); // mobile drawer
  const [hovering, setHovering] = useState(false);

  // Lazy-init mode from localStorage (migrating the legacy boolean key), SSR-safe.
  const [mode, setMode] = useState<SidebarMode>(() => {
    if (typeof window === "undefined") return "expanded";
    try {
      return migrateSidebarMode((k) => localStorage.getItem(k));
    } catch {
      return "expanded";
    }
  });

  // Persist mode.
  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_MODE_KEY, mode);
    } catch {
      // storage unavailable — ignore
    }
  }, [mode]);

  // Hover only matters in hover mode; reset when leaving it.
  useEffect(() => {
    if (mode !== "hover") setHovering(false);
  }, [mode]);

  // Cmd/Ctrl+B toggles expanded <-> collapsed (desktop), but not while typing.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b")) return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      e.preventDefault();
      setMode((m) => (m === "collapsed" ? "expanded" : "collapsed"));
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Debounced collapse-on-leave so a quick mouse-out doesn't strobe the width.
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setHovering(true);
  };
  const onLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = setTimeout(() => setHovering(false), 150);
  };

  const collapsed = resolveSidebarCollapsed(mode, hovering);
  const reservedNarrow = mode === "collapsed" || mode === "hover"; // in-flow width

  return (
    <>
      {/* Desktop rail: hidden below lg. In hover mode the panel floats (absolute)
          over content while the rail reserves a fixed 56px, so there's no shift. */}
      <aside
        className={`relative hidden shrink-0 transition-[width] duration-200 lg:block ${
          reservedNarrow ? "w-14" : "w-[220px]"
        }`}
        onMouseEnter={mode === "hover" ? onEnter : undefined}
        onMouseLeave={mode === "hover" ? onLeave : undefined}
      >
        <div
          className={`flex flex-col border-r border-white/[0.06] bg-bg-secondary transition-[width] duration-200 ${
            mode === "hover"
              ? `absolute inset-y-0 left-0 z-40 ${collapsed ? "w-14" : "w-[220px] shadow-2xl"}`
              : "h-full w-full"
          }`}
        >
          <NavContent pathname={pathname} isFounderUser={isFounderUser} collapsed={collapsed} />
          <SidebarControl mode={mode} onMode={setMode} collapsed={collapsed} />
        </div>
      </aside>

      {/* Mobile top bar: visible below lg */}
      <div className="fixed left-0 right-0 top-0 z-40 flex items-center justify-between border-b border-white/[0.06] bg-bg-secondary px-4 py-3 lg:hidden">
        <h1 className="font-heading text-lg font-bold tracking-tight text-white">
          Kith<span className="text-accent-teal">Node</span>
        </h1>
        <button
          onClick={() => setOpen(true)}
          aria-label="Open navigation"
          className="text-text-secondary transition-colors duration-150 hover:text-white"
        >
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile drawer backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-full w-[260px] flex-col border-r border-white/[0.06] bg-bg-secondary transition-transform duration-300 lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
            className="text-text-secondary transition-colors duration-150 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        <NavContent
          pathname={pathname}
          isFounderUser={isFounderUser}
          collapsed={false}
          onNavClick={() => setOpen(false)}
        />
        <MobileAccount userName={userName} onNavClick={() => setOpen(false)} />
      </aside>

      <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-40 grid h-[66px] grid-cols-5 border-t border-white/[0.08] bg-bg-secondary lg:hidden">
        {PRIMARY_ITEMS.map((item) => {
          const active = pathname === item.href || item.matches?.some((prefix) => pathname.startsWith(prefix));
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={`flex min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-bold ${active ? "text-accent-teal" : "text-text-muted"}`}>
              <Icon className="h-5 w-5" />
              <span className="max-w-full truncate">{item.label === "Career Copilot" ? "Copilot" : item.label === "Career Toolkit" ? "Toolkit" : item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
