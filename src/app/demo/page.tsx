import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  BriefcaseBusiness,
  Building2,
  FileText,
  Home,
  LibraryBig,
  Search,
  Settings,
  Users,
} from "lucide-react";
import { LogoIcon } from "@/components/logo";
import { RecruitingWorkstation } from "./_components/recruiting-workstation";

export const metadata: Metadata = {
  title: "KithNode Recruiting Workspace Demo",
  description: "Explore a read-only, anonymized KithNode recruiting workflow.",
};

const NAV = [
  [Home, "Home"],
  [Users, "People"],
  [Building2, "Companies"],
  [BriefcaseBusiness, "Applications"],
  [FileText, "Documents"],
  [Search, "Research"],
] as const;

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-canvas text-text-primary">
      <header className="border-b border-border-soft bg-white">
        <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5">
            <LogoIcon className="h-7 w-7" />
            <span className="font-heading text-xl font-semibold">
              Kith<span className="text-primary">Node</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-success-soft px-3 py-1.5 text-xs font-medium text-success sm:inline-flex">
              Read-only fixture data
            </span>
            <Link href="/sign-in" className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">
              Use KithNode
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-[1240px] px-5 pb-14 pt-14 text-center sm:pt-20">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Interactive product tour</p>
        <h1 className="mx-auto mt-4 max-w-4xl font-heading text-5xl font-semibold tracking-[-0.035em] sm:text-7xl">
          Recruiting work that remembers how it all connects.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-text-secondary">
          Follow a fictional undergraduate from a target role to an official opportunity, a warm network path,
          an evidence-backed resume, and one concrete next action.
        </p>
        <a href="#workspace" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-lg bg-primary px-6 text-sm font-semibold text-white">
          Explore the workflow <ArrowRight className="h-4 w-4" />
        </a>
      </section>

      <section id="workspace" className="mx-auto max-w-[1400px] px-4 pb-20">
        <div className="overflow-hidden rounded-2xl border border-border-soft bg-white">
          <div className="grid min-h-[760px] lg:grid-cols-[240px_minmax(0,1fr)]">
            <aside className="hidden border-r border-border-soft bg-sidebar lg:flex lg:flex-col">
              <div className="flex h-16 items-center gap-2.5 px-4">
                <LogoIcon className="h-7 w-7" />
                <span className="font-heading text-xl font-semibold">Kith<span className="text-primary">Node</span></span>
              </div>
              <nav className="space-y-1 px-2">
                {NAV.map(([Icon, label], index) => (
                  <div key={label} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm ${index === 0 ? "bg-surface-selected font-medium" : "text-text-secondary"}`}>
                    <Icon className="h-[18px] w-[18px]" /> {label}
                  </div>
                ))}
              </nav>
              <p className="mt-6 px-5 text-xs font-medium text-text-secondary">Recents</p>
              <div className="mt-2 space-y-1 px-2 text-xs text-text-secondary">
                <p className="rounded-lg px-3 py-2">Summer 2027 opportunities</p>
                <p className="rounded-lg px-3 py-2">Scale AI application</p>
                <p className="rounded-lg px-3 py-2">Coffee chat with Maya</p>
              </div>
              <div className="mt-auto space-y-1 border-t border-border-soft p-2 text-sm text-text-secondary">
                {[Brain, LibraryBig, Settings].map((Icon, index) => (
                  <div key={index} className="flex min-h-11 items-center gap-3 rounded-lg px-3">
                    <Icon className="h-[18px] w-[18px]" /> {["Memory", "Knowledge Center", "Settings"][index]}
                  </div>
                ))}
              </div>
            </aside>
            <div className="min-w-0 p-4 sm:p-8 lg:p-10">
              <div className="mb-8 max-w-3xl">
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-primary">Recruiting workspace</p>
                <h2 className="mt-2 font-heading text-4xl font-semibold">See the whole decision, not another dashboard.</h2>
                <p className="mt-3 text-base leading-7 text-text-secondary">
                  Every recommendation names its evidence. Every consequential action waits for approval.
                </p>
              </div>
              <RecruitingWorkstation />
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-xs text-text-faint">
          Fictional records only. The demo cannot access accounts, call paid services, send messages, or change data.
        </p>
      </section>
    </main>
  );
}
