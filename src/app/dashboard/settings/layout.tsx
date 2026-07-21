"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, CreditCard, Database, Plug, Shield, Target, UserRound } from "lucide-react";

const sections = [
  { href: "/dashboard/settings/profile", label: "Profile & education", icon: UserRound },
  { href: "/dashboard/settings/goals", label: "Recruiting goals", icon: Target },
  { href: "/dashboard/settings/integrations", label: "Integrations", icon: Plug },
  { href: "/dashboard/settings/data", label: "Data & imports", icon: Database },
  { href: "/dashboard/settings/preferences", label: "Preferences", icon: Bell },
  { href: "/dashboard/settings/billing", label: "Billing & usage", icon: CreditCard },
  { href: "/dashboard/settings/account", label: "Account & privacy", icon: Shield },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const search = useSearchParams();
  const rootProfile = pathname === "/dashboard/settings" && search.get("section") !== "outreach" && search.get("section") !== "notifications";
  return <div className="min-h-full bg-bg-primary"><header className="border-b border-white/[0.08] bg-bg-secondary px-5 py-5"><p className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-accent-teal">Configuration</p><h1 className="mt-1 font-heading text-2xl font-semibold text-text-primary">Settings</h1><p className="mt-1 text-base text-text-secondary">Manage your recruiting profile, connected data, and account controls.</p></header><div className="mx-auto grid max-w-[1400px] lg:grid-cols-[240px_minmax(0,1fr)]"><nav aria-label="Settings" className="flex overflow-x-auto border-b border-white/[0.08] bg-bg-secondary p-2 lg:min-h-[calc(100vh-170px)] lg:flex-col lg:border-b-0 lg:border-r lg:p-3">{sections.map(({ href, label, icon: Icon }) => { const active = pathname === href || pathname.startsWith(`${href}/`) || (href.endsWith("/profile") && rootProfile) || (href.endsWith("/preferences") && pathname === "/dashboard/settings" && !rootProfile); return <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex min-h-11 shrink-0 items-center gap-3 border-l-2 px-3 text-sm font-bold ${active ? "border-accent-teal bg-accent-teal/[0.08] text-accent-teal" : "border-transparent text-text-secondary hover:bg-white/[0.03] hover:text-text-primary"}`}><Icon className="h-4 w-4" />{label}</Link>; })}</nav><div className="min-w-0">{children}</div></div></div>;
}
