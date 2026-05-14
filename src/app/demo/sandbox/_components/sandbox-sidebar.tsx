"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  GitBranch,
  Compass,
  Upload,
  Settings,
  CreditCard,
  MessageSquare,
  Menu,
  X,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import {
  SANDBOX_TIER_COUNTS,
  SANDBOX_PIPELINE,
  SANDBOX_DISCOVER_QUEUE,
} from "../_data";

type NavItem = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  count?: number;
  locked?: boolean;
};

const NAV_GROUPS: { label: string; items: NavItem[] }[] = [
  {
    label: "PAGES",
    items: [
      { href: "/demo/sandbox", label: "Overview", icon: LayoutDashboard },
      {
        href: "/waitlist?from=demo&section=warm-signals",
        label: "Warm Signals",
        icon: Users,
        count: SANDBOX_TIER_COUNTS.hot + SANDBOX_TIER_COUNTS.warm,
        locked: true,
      },
      {
        href: "/waitlist?from=demo&section=pipeline",
        label: "Pipeline",
        icon: GitBranch,
        count: SANDBOX_PIPELINE.length,
        locked: true,
      },
      {
        href: "/demo/sandbox/discover",
        label: "Discover",
        icon: Compass,
        count: SANDBOX_DISCOVER_QUEUE.length,
      },
    ],
  },
  {
    label: "DATA",
    items: [
      {
        href: "/waitlist?from=demo&section=import",
        label: "Import",
        icon: Upload,
        locked: true,
      },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      {
        href: "/waitlist?from=demo&section=settings",
        label: "Settings",
        icon: Settings,
        locked: true,
      },
      {
        href: "/waitlist?from=demo&section=billing",
        label: "Billing",
        icon: CreditCard,
        locked: true,
      },
    ],
  },
];

function NavContent({
  pathname,
  onNavClick,
}: {
  pathname: string;
  onNavClick?: () => void;
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5">
        <Link href="/" className="block">
          <h1 className="font-heading text-xl font-bold tracking-tight text-white">
            Kith<span className="text-accent-teal">Node</span>
          </h1>
          <p className="mt-0.5 font-mono text-[9px] uppercase tracking-widest text-text-muted">
            Sandbox mode
          </p>
        </Link>
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
              return (
                <Link
                  key={`${item.label}-${item.href}`}
                  href={item.href}
                  onClick={onNavClick}
                  className={`mb-0.5 flex items-center gap-3 border-l-2 px-3 py-2.5 text-[13px] transition-all duration-200 ${
                    active
                      ? "border-accent-teal bg-accent-teal/10 font-medium text-accent-teal shadow-[inset_4px_0_12px_-6px_rgba(14,165,233,0.3)]"
                      : "border-transparent text-text-secondary hover:bg-white/[0.04] hover:text-white"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={
                      active
                        ? "text-accent-teal drop-shadow-[0_0_8px_rgba(14,165,233,0.4)]"
                        : ""
                    }
                  />
                  <span className="flex-1">{item.label}</span>
                  {item.count != null && item.count > 0 && (
                    <span className="ml-auto border border-white/[0.08] bg-white/[0.04] px-1 font-mono text-[9px] font-bold tabular-nums text-foreground">
                      {item.count}
                    </span>
                  )}
                  {item.locked && (
                    <span className="border border-primary/30 bg-primary/10 px-1 py-px font-mono text-[8px] font-bold uppercase tracking-wider text-primary">
                      Pro
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
          className="mb-3 flex items-center gap-2 text-[11px] text-text-muted transition-colors duration-150 hover:text-accent-teal"
        >
          <MessageSquare size={14} />
          Send Feedback
        </a>
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center bg-accent-teal/15 text-[11px] font-bold text-accent-teal">
            DV
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[12px] font-medium text-white">
              Demo User
            </p>
            <p className="truncate font-mono text-[9px] uppercase tracking-wider text-text-muted">
              Sandbox Mode
            </p>
          </div>
        </div>
        <Link
          href="/waitlist?from=demo"
          className="mt-3 flex items-center justify-center gap-1.5 bg-primary px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80"
        >
          <Sparkles size={11} />
          Create real account
        </Link>
      </div>
    </>
  );
}

export function SandboxSidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden w-[220px] flex-col border-r border-white/[0.06] bg-bg-secondary lg:flex">
        <NavContent pathname={pathname} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed left-0 right-0 top-[34px] z-40 flex items-center justify-between border-b border-white/[0.06] bg-bg-secondary px-4 py-3 lg:hidden">
        <h1 className="font-heading text-lg font-bold tracking-tight text-white">
          Kith<span className="text-accent-teal">Node</span>
          <span className="ml-2 font-mono text-[9px] uppercase tracking-widest text-text-muted">
            Sandbox
          </span>
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
        <div
          className="fixed inset-0 z-50 bg-black/60 lg:hidden"
          onClick={() => setOpen(false)}
        />
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
        <NavContent pathname={pathname} onNavClick={() => setOpen(false)} />
      </aside>
    </>
  );
}
