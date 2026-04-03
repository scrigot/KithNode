"use client";

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
  MessageSquare,
  LogOut,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/contacts", label: "Warm Signals", icon: Users },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: GitBranch },
  { href: "/dashboard/discover", label: "Discover", icon: Compass },
  { href: "/dashboard/import", label: "Import", icon: Upload },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  return (
    <aside className="flex w-[220px] flex-col border-r border-white/[0.06] bg-bg-secondary">
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
                className={`mb-0.5 flex items-center gap-3 px-3 py-2.5 text-[13px] transition-all duration-150 ${
                  active
                    ? "bg-accent-teal/10 text-accent-teal font-medium border-l-2 border-accent-teal -ml-[2px]"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.2 : 1.8} />
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
    </aside>
  );
}
