"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "~" },
  { href: "/dashboard/contacts", label: "Warm Signals", icon: ">" },
  { href: "/dashboard/pipeline", label: "Pipeline", icon: "|" },
  { href: "/dashboard/discover", label: "Discover", icon: "*" },
  { href: "/dashboard/import", label: "Import", icon: "+" },
  { href: "/dashboard/settings", label: "Settings", icon: "#" },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 flex-col border-r border-white/[0.06] bg-bg-secondary">
      {/* Logo */}
      <div className="px-5 py-5">
        <h1 className="font-heading text-xl font-bold tracking-tight text-white">
          Kith<span className="text-accent-teal">Node</span>
        </h1>
        <p className="mt-0.5 text-[11px] text-text-muted">Warm Signals Intelligence</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] transition-all ${
                active
                  ? "bg-accent-blue/15 text-accent-blue font-medium"
                  : "text-text-secondary hover:bg-white/[0.04] hover:text-white"
              }`}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md text-[11px] font-bold ${
                  active
                    ? "bg-accent-blue/20 text-accent-blue"
                    : "bg-white/[0.06] text-text-muted"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Feedback */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <a
          href="https://kithnode.canny.io"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-text-muted hover:text-accent-blue transition-colors"
        >
          Send Feedback
        </a>
      </div>

      {/* User */}
      <div className="border-t border-white/[0.06] px-5 py-3">
        <p className="truncate text-[12px] text-white">{userName}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-0.5 text-[11px] text-text-muted hover:text-accent-red transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
