"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/dashboard/documents", label: "Documents" },
  { href: "/dashboard/resume", label: "Resume" },
  { href: "/dashboard/linkedin", label: "LinkedIn" },
  { href: "/dashboard/coffee-prep", label: "Coffee Prep" },
];

export function CareerToolkitNav() {
  const pathname = usePathname();
  return <nav aria-label="Career Toolkit" className="flex min-h-12 overflow-x-auto border-b border-border-soft bg-bg-secondary px-3 sm:px-5">{items.map((item) => <Link key={item.href} href={item.href} aria-current={pathname === item.href ? "page" : undefined} className={`flex min-h-12 shrink-0 items-center border-b-2 px-3 text-sm font-bold ${pathname === item.href ? "border-accent-teal text-accent-teal" : "border-transparent text-text-secondary hover:text-text-primary"}`}>{item.label}</Link>)}</nav>;
}
