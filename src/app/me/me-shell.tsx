"use client";

import { type ReactNode, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { Silkscreen } from "next/font/google";
import ContactModalHost from "@/components/me/contact-modal";
import type { OutreachDefaults } from "@/components/me/contact-modal";

const wordmarkFont = Silkscreen({ subsets: ["latin"], weight: "700" });

const NAV: { href: string; label: string; short: string; ready: boolean }[] = [
  { href: "/me", label: "Home", short: "H", ready: true },
  { href: "/me/discover", label: "Discover", short: "D", ready: true },
  { href: "/me/outreach", label: "Outreach", short: "O", ready: true },
  { href: "/me/network", label: "Network", short: "N", ready: true },
  { href: "/me/pipelines", label: "Pipelines", short: "P", ready: true },
  { href: "/me/prep", label: "Coffee Prep", short: "C", ready: true },
  { href: "/me/resume", label: "Resume", short: "R", ready: true },
  { href: "/me/contacts", label: "Contacts", short: "K", ready: true },
  { href: "/me/settings", label: "Settings", short: "S", ready: true },
];

export default function MeShell({
  children,
  pipelines,
  outreachDefaults,
}: {
  children: ReactNode;
  pipelines: { id: string; name: string }[];
  outreachDefaults: OutreachDefaults;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("me.sidebar.collapsed") === "1");
  }, []);

  function toggle() {
    setCollapsed((next) => {
      window.localStorage.setItem("me.sidebar.collapsed", next ? "0" : "1");
      return !next;
    });
  }

  return (
    <div
      className="min-h-screen flex bg-[#1C1A19] text-white"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <aside
        className={`shrink-0 border-r border-[#38332F] bg-[#232020] flex flex-col transition-[width] duration-200 ${
          collapsed ? "w-[68px]" : "w-60"
        }`}
      >
        <div className={`border-b border-[#38332F] ${collapsed ? "px-3 py-4" : "px-5 py-5"}`}>
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/me"
              className={`${wordmarkFont.className} leading-none text-white tracking-tight ${
                collapsed ? "text-[17px]" : "text-[19px]"
              }`}
              title="KithNode"
            >
              {collapsed ? "KN" : "KithNode"}
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="rounded-md border border-[#38332F] px-1.5 py-1 text-[11px] text-[#8A8077] hover:border-[#E8643C] hover:text-white"
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? "›" : "‹"}
            </button>
          </div>
          {!collapsed && (
            <p className="mt-2.5 text-[11px] uppercase tracking-[0.18em] text-[#8A8077]">
              personal network os
            </p>
          )}
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={collapsed ? n.label : undefined}
              className={`flex items-center rounded-lg px-3 py-2 text-sm text-[#C9C2BB] hover:bg-[#2E2A27] hover:text-white transition-colors ${
                collapsed ? "justify-center" : "justify-between"
              }`}
            >
              <span>{collapsed ? n.short : n.label}</span>
              {!collapsed && !n.ready && (
                <span className="text-[10px] uppercase tracking-wide text-[#6F665E] bg-[#2E2A27] rounded px-1.5 py-0.5">
                  soon
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className={`border-t border-[#38332F] text-[11px] text-[#6F665E] ${collapsed ? "px-3 py-4 text-center" : "px-5 py-4"}`}>
          {collapsed ? "local" : "dogfood · isolated · local"}
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
      <Suspense fallback={null}>
        <ContactModalHost pipelines={pipelines} outreachDefaults={outreachDefaults} />
      </Suspense>
    </div>
  );
}
