"use client";

import { useState } from "react";
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
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/contacts", label: "Warm Signals", icon: Users },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/dashboard/discover", label: "Discover", icon: Compass },
  { href: "/dashboard/import", label: "Import", icon: Upload },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
];

function NavContent({
  pathname,
  userName,
  onNavClick,
}: {
  pathname: string;
  userName: string;
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
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          const showSeparator = item.label === "Import";
          return (
            <div key={item.href}>
              {showSeparator && (
                <div className="mx-3 my-1.5 border-t border-white/[0.06]" />
              )}
              <Link
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
                {item.label}
              </Link>
            </div>
          );
        })}
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

  return (
    <>
      {/* Desktop sidebar — hidden below lg */}
      <aside className="hidden lg:flex w-[220px] flex-col border-r border-white/[0.06] bg-bg-secondary">
        <NavContent pathname={pathname} userName={userName} />
      </aside>

      {/* Mobile top bar — visible below lg */}
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
          onNavClick={() => setOpen(false)}
        />
      </aside>
    </>
  );
}
