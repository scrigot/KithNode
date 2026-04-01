"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "~" },
  { href: "/dashboard/contacts", label: "Warm Signals", icon: ">" },
  { href: "/dashboard/discover", label: "Discover", icon: "*" },
  { href: "/dashboard/import", label: "Import", icon: "+" },
];

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-bg-secondary">
      {/* Logo */}
      <div className="border-b border-border px-4 py-4">
        <h1 className="text-lg font-bold tracking-tight text-accent-green">
          KITHNODE
        </h1>
        <p className="mt-0.5 text-xs text-text-muted">warm signals</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`mb-1 flex items-center gap-2 rounded px-3 py-2 text-xs transition-colors ${
                active
                  ? "bg-bg-hover text-accent-green"
                  : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
              }`}
            >
              <span className="w-4 text-center font-bold text-text-muted">
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="border-t border-border px-4 py-3">
        <p className="truncate text-xs text-text-secondary">{userName}</p>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="mt-1 text-xs text-text-muted hover:text-accent-red"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
