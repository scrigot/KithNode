"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, CreditCard, Database, Plug, Shield, Target, UserRound } from "lucide-react";

const sections = [
  { href: "/dashboard/settings", label: "Settings home", icon: Plug, exact: true },
  { href: "/dashboard/settings/profile", label: "Profile & education", icon: UserRound },
  { href: "/dashboard/settings/goals", label: "Recruiting goals", icon: Target },
  { href: "/dashboard/settings/integrations", label: "Connections & AI", icon: Plug },
  { href: "/dashboard/settings/data", label: "Data & imports", icon: Database },
  { href: "/dashboard/settings/preferences", label: "Preferences", icon: Bell },
  { href: "/dashboard/settings/billing", label: "Billing & usage", icon: CreditCard },
  { href: "/dashboard/settings/account", label: "Account & privacy", icon: Shield },
];

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="min-h-full bg-canvas">
      <header className="mx-auto w-full max-w-[1180px] px-5 pb-6 pt-8 sm:px-8">
        <p className="text-xs font-medium text-primary">Configuration</p>
        <h1 className="mt-1 font-heading text-[32px] font-medium tracking-[-0.02em] text-text-primary">Settings</h1>
        <p className="mt-1.5 max-w-3xl text-[15px] leading-6 text-text-secondary">Manage your recruiting identity, connected data, AI readiness, and account controls.</p>
      </header>
      <div className="mx-auto grid w-full max-w-[1180px] px-5 pb-16 sm:px-8 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-7">
        <nav aria-label="Settings" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-border bg-white p-1.5 lg:mb-0 lg:h-fit lg:flex-col">
          {sections.map(({ href, label, icon: Icon, exact }) => {
            const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm font-medium ${
                  active ? "bg-surface-selected text-text-primary" : "text-text-secondary hover:bg-surface-soft hover:text-text-primary"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <main className="min-w-0 rounded-2xl border border-border bg-white">{children}</main>
      </div>
    </div>
  );
}
