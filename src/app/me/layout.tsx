import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Silkscreen } from "next/font/google";
import { PERSONAL_MODE } from "@/lib/me/config";

// Conductor-look shell for the personal networking OS. Warm-dark, minimal,
// sidebar + main — deliberately distinct from the KithNode dashboard's dense
// 0px Bloomberg theme, because /me is its own isolated space. Styled with inline
// arbitrary values so it never touches the shared @theme tokens.
//
// PERSONAL_MODE gate: when off (i.e. production), the whole subtree 404s.

// Pixel logotype that echoes Conductor's blocky brand wordmark.
const wordmarkFont = Silkscreen({ subsets: ["latin"], weight: "700" });

const NAV: { href: string; label: string; ready: boolean }[] = [
  { href: "/me", label: "Home", ready: true },
  { href: "/me/network", label: "Network", ready: true },
  { href: "/me/pipelines", label: "Pipelines", ready: true },
  { href: "/me/prep", label: "Coffee Prep", ready: true },
  { href: "/me/contacts", label: "Contacts", ready: true },
];

export default function MeLayout({ children }: { children: ReactNode }) {
  if (!PERSONAL_MODE) notFound();

  return (
    <div
      className="min-h-screen flex bg-[#1C1A19] text-white"
      style={{ fontFamily: "var(--font-sans)" }}
    >
      <aside className="w-60 shrink-0 border-r border-[#38332F] bg-[#232020] flex flex-col">
        <div className="px-5 py-5 border-b border-[#38332F]">
          <Link href="/me" className={`${wordmarkFont.className} text-[19px] leading-none text-white tracking-tight`}>
            KithNode
          </Link>
          <p className="mt-2.5 text-[11px] uppercase tracking-[0.18em] text-[#8A8077]">
            personal network os
          </p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-[#C9C2BB] hover:bg-[#2E2A27] hover:text-white transition-colors"
            >
              <span>{n.label}</span>
              {!n.ready && (
                <span className="text-[10px] uppercase tracking-wide text-[#6F665E] bg-[#2E2A27] rounded px-1.5 py-0.5">
                  soon
                </span>
              )}
            </Link>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-[#38332F] text-[11px] text-[#6F665E]">
          dogfood · isolated · local
        </div>
      </aside>
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
