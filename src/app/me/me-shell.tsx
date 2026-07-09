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
  { href: "/me/applications", label: "Applications", short: "A", ready: true },
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
      className="flex min-h-screen flex-col bg-[#1C1A19] text-white md:flex-row"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <aside
        className={`flex w-full shrink-0 flex-col border-b border-[#38332F] bg-[#232020] transition-[width] duration-200 md:min-h-screen md:border-b-0 md:border-r ${
          collapsed ? "md:w-[68px]" : "md:w-60"
        }`}
      >
        <div className={`border-b border-[#38332F] ${collapsed ? "md:px-3 md:py-4" : "md:px-5 md:py-5"} px-4 py-4`}>
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/me"
              className={`${wordmarkFont.className} leading-none tracking-tight text-white ${
                collapsed ? "md:text-[17px]" : "md:text-[19px]"
              }`}
              title="KithNode"
            >
              <span className="md:hidden">KithNode</span>
              <span className="hidden md:inline">{collapsed ? "KN" : "KithNode"}</span>
            </Link>
            <button
              type="button"
              onClick={toggle}
              className="hidden rounded-md border border-[#38332F] px-1.5 py-1 text-[11px] text-[#8A8077] hover:border-[#E8643C] hover:text-white md:block"
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
        <nav className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:space-y-1 md:overflow-visible md:py-4">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              title={collapsed ? n.label : undefined}
              className={`flex shrink-0 items-center rounded-lg px-3 py-2 text-sm text-[#C9C2BB] transition-colors hover:bg-[#2E2A27] hover:text-white ${
                collapsed ? "md:justify-center" : "md:justify-between"
              }`}
            >
              <span className="md:hidden">{n.label}</span>
              <span className="hidden md:inline">{collapsed ? n.short : n.label}</span>
              {!collapsed && !n.ready && (
                <span className="rounded bg-[#2E2A27] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[#6F665E]">
                  soon
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className={`hidden border-t border-[#38332F] text-[11px] text-[#6F665E] md:block ${collapsed ? "px-3 py-4 text-center" : "px-5 py-4"}`}>
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
