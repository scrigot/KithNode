"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const base = [
  { href: "/dashboard/contacts", label: "People" },
  { href: "/dashboard/discover", label: "Discover" },
  { href: "/dashboard/pipeline", label: "Relationship pipeline" },
  { href: "/dashboard/edge", label: "Firms & coverage" },
  { href: "/dashboard/network", label: "Graph" },
];
const social = [
  { href: "/dashboard/friends", label: "Kith" },
  { href: "/dashboard/nodes", label: "Nodes" },
  { href: "/dashboard/messages", label: "Messages" },
];

export function NetworkNav() {
  const pathname = usePathname();
  const items = process.env.NEXT_PUBLIC_ENABLE_KITH_NODES === "true" ? [...base, ...social] : base;
  return <nav aria-label="Network workspace" className="flex min-h-12 overflow-x-auto border-b border-white/[0.08] bg-bg-secondary px-3 sm:px-5">{items.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-12 shrink-0 items-center border-b-2 px-3 text-sm font-bold ${pathname === item.href ? "border-accent-teal text-accent-teal" : "border-transparent text-text-secondary hover:text-text-primary"}`}>{item.label}</Link>)}</nav>;
}
