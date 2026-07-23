import Link from "next/link";
import { ArrowRight, Database, FileText, IdCard } from "lucide-react";

const items = [
  { href: "/dashboard/settings/data/import", title: "Contacts and relationship data", detail: "Import LinkedIn connections, add contacts manually, or review enrichment sources.", icon: Database },
  { href: "/dashboard/resume", title: "Resume source", detail: "Create or import the evidence-backed resume used by job matching and application tailoring.", icon: FileText },
  { href: "/dashboard/linkedin", title: "LinkedIn profile copies", detail: "Manage private profile copies, extension captures, revisions, and audit history.", icon: IdCard },
];

export default function DataSettingsPage() {
  return <div className="mx-auto max-w-3xl p-5 sm:p-8"><h2 className="font-heading text-xl font-semibold text-text-primary">Data & imports</h2><p className="mt-1 text-base text-text-secondary">Choose what KithNode can use as evidence. Imports remain reviewable and attributable to their source.</p><div className="mt-6 divide-y divide-white/[0.08] border-y border-border-soft">{items.map(({ href, title, detail, icon: Icon }) => <Link key={href} href={href} className="group grid gap-3 bg-surface-soft px-4 py-5 hover:bg-surface-soft sm:grid-cols-[32px_1fr_auto] sm:items-center"><Icon className="h-5 w-5 text-primary" /><div><h3 className="text-base font-semibold text-text-primary">{title}</h3><p className="mt-1 text-sm leading-5 text-text-secondary">{detail}</p></div><ArrowRight className="h-4 w-4 text-text-muted group-hover:text-primary" /></Link>)}</div><div className="mt-6 border border-emerald-400/20 bg-emerald-400/[0.06] p-4"><p className="text-sm font-bold text-emerald-300">Evidence and provenance are preserved</p><p className="mt-1 text-sm leading-5 text-text-secondary">Manual edits, provider enrichment, model inference, and LinkedIn extension captures remain distinguishable. KithNode never treats inference as verified fact.</p></div></div>;
}
