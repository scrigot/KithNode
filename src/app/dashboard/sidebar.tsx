"use client";

// Modified from DeepTutor's collapsible navigation and recent-work patterns.
// KithNode replaces tutoring surfaces with user-scoped recruiting workspaces.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Brain,
  BriefcaseBusiness,
  Building2,
  ChevronRight,
  Clock3,
  FileText,
  Gauge,
  Home,
  LibraryBig,
  LogOut,
  Menu,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  Users,
  X,
} from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { apiFetch } from "@/lib/api-client";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  matches?: string[];
};

type RecentItem = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  href: string;
  updatedAt: string;
};

const PRIMARY: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/people", label: "People", icon: Users, matches: ["/dashboard/contacts", "/contact/"] },
  { href: "/dashboard/companies", label: "Companies", icon: Building2 },
  { href: "/dashboard/applications", label: "Applications", icon: BriefcaseBusiness },
  { href: "/dashboard/documents", label: "Documents", icon: FileText, matches: ["/dashboard/resume", "/dashboard/linkedin", "/dashboard/coffee-prep"] },
  { href: "/dashboard/research", label: "Research", icon: Search, matches: ["/dashboard/discover"] },
];

const UTILITIES: NavItem[] = [
  { href: "/dashboard/memory", label: "Memory", icon: Brain },
  { href: "/dashboard/knowledge", label: "Knowledge Center", icon: LibraryBig },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, item: NavItem) {
  if (item.href === "/dashboard") return pathname === item.href;
  return pathname.startsWith(item.href) || item.matches?.some((prefix) => pathname.startsWith(prefix));
}

function SidebarLink({
  item,
  pathname,
  collapsed,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = isActive(pathname, item);

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      title={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={`group relative flex min-h-11 items-center rounded-lg text-sm transition-colors ${
        collapsed ? "justify-center px-2" : "gap-3 px-3"
      } ${
        active
          ? "bg-surface-selected font-medium text-text-primary"
          : "text-text-secondary hover:bg-surface-selected/70 hover:text-text-primary"
      }`}
    >
      {active ? <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" /> : null}
      <Icon size={18} strokeWidth={active ? 2.1 : 1.8} />
      {collapsed ? null : <span className="truncate">{item.label}</span>}
    </Link>
  );
}

function SidebarBody({
  pathname,
  collapsed,
  isFounderUser,
  userName,
  onNavigate,
}: {
  pathname: string;
  collapsed: boolean;
  isFounderUser: boolean;
  userName: string;
  onNavigate?: () => void;
}) {
  const [recents, setRecents] = useState<RecentItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    apiFetch("/api/recents")
      .then(async (response) => {
        if (!response.ok) return;
        const data = await response.json() as { recents?: RecentItem[] };
        if (!cancelled) setRecents((data.recents || []).slice(0, 6));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  const initials = useMemo(
    () =>
      userName
        .split(/\s+/)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "KN",
    [userName],
  );

  return (
    <>
      <div className={`flex h-16 items-center ${collapsed ? "justify-center" : "px-4"}`}>
        <Link href="/dashboard" onClick={onNavigate} className="flex items-center gap-2.5 text-text-primary">
          <LogoIcon className="h-7 w-7" />
          {collapsed ? null : (
            <span className="font-heading text-xl font-semibold tracking-[-0.02em]">
              Kith<span className="text-primary">Node</span>
            </span>
          )}
        </Link>
      </div>

      <nav aria-label="Primary" className="space-y-1 px-2">
        {PRIMARY.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      <div className="mt-5 min-h-0 flex-1 overflow-y-auto px-2">
        {collapsed ? (
          <div className="mx-auto h-px w-8 bg-border-soft" />
        ) : (
          <>
            <div className="flex items-center justify-between px-3">
              <p className="text-xs font-medium text-text-secondary">Recents</p>
              <Link href="/dashboard/recents" title="View all recent work" className="rounded-md p-1 text-text-faint hover:bg-surface-selected hover:text-text-primary">
                <ChevronRight size={14} />
              </Link>
            </div>
            <div className="mt-1.5 space-y-0.5">
              {recents.length === 0 ? (
                <p className="px-3 py-2 text-xs leading-5 text-text-faint">Recent work will appear here.</p>
              ) : (
                recents.map((recent) => (
                  <Link
                    key={recent.id}
                    href={recent.href}
                    onClick={onNavigate}
                    className="group flex min-h-9 items-center gap-2 rounded-lg px-3 text-xs text-text-secondary hover:bg-surface-selected hover:text-text-primary"
                  >
                    {recent.kind === "chat" ? <MessageSquare size={13} className="shrink-0 text-text-faint" /> : <Clock3 size={13} className="shrink-0 text-text-faint" />}
                    <span className="min-w-0 flex-1 truncate">{recent.title || "Untitled record"}</span>
                    <ChevronRight size={12} className="opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))
              )}
            </div>
          </>
        )}
      </div>

      <div className="space-y-1 border-t border-border-soft px-2 py-2">
        {UTILITIES.map((item) => (
          <SidebarLink
            key={item.href}
            item={item}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}
        {isFounderUser ? (
          <SidebarLink
            item={{ href: "/dashboard/ops", label: "Founder Ops", icon: Gauge }}
            pathname={pathname}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ) : null}
        <div className={`mt-2 flex items-center ${collapsed ? "justify-center" : "gap-3 px-2 py-2"}`}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-text-primary text-xs font-semibold text-white">
            {initials}
          </div>
          {collapsed ? null : (
            <>
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-text-primary">{userName}</span>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                title="Sign out"
                className="rounded-lg p-2 text-text-faint hover:bg-surface-selected hover:text-error"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
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
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("kithnode:sidebar-collapsed") === "true");
    } catch {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }, []);

  function toggleCollapsed() {
    setCollapsed((current) => {
      const next = !current;
      try {
        localStorage.setItem("kithnode:sidebar-collapsed", String(next));
      } catch {
        // Preserve navigation even if persistence is unavailable.
      }
      return next;
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
        className="fixed left-4 top-3 z-40 flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-white text-text-primary shadow-sm lg:hidden"
      >
        <Menu size={20} />
      </button>

      <aside
        className={`relative hidden h-screen shrink-0 flex-col border-r border-border-soft bg-sidebar transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[60px]" : "w-[240px]"
        }`}
      >
        <SidebarBody
          pathname={pathname}
          collapsed={collapsed}
          isFounderUser={isFounderUser}
          userName={userName}
        />
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-6 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-white text-text-secondary shadow-sm hover:text-text-primary"
        >
          {collapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
        </button>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
            className="absolute inset-0 bg-black/20"
          />
          <aside className="relative flex h-full w-[min(86vw,320px)] flex-col border-r border-border bg-sidebar shadow-2xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl text-text-secondary hover:bg-surface-selected"
            >
              <X size={19} />
            </button>
            <SidebarBody
              pathname={pathname}
              collapsed={false}
              isFounderUser={isFounderUser}
              userName={userName}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}
