import Link from "next/link";
import { ArrowRight, Coffee, FileText, IdCard } from "lucide-react";
import { WorkspaceHeader } from "@/components/workspace-ui";

const tools = [
  { href: "/dashboard/resume", label: "Resume Studio", description: "Build, score, tailor, and export evidence-backed resumes for each application.", icon: FileText, action: "Open resume workspace" },
  { href: "/dashboard/linkedin", label: "LinkedIn Studio", description: "Keep a private, versioned copy of every LinkedIn section and review improvements before publishing.", icon: IdCard, action: "Audit LinkedIn profile" },
  { href: "/dashboard/coffee-prep", label: "Coffee Prep", description: "Turn a contact and meeting goal into a concise relationship brief and grounded questions.", icon: Coffee, action: "Prepare for a meeting" },
];

export default function CareerToolkitPage() {
  return <div className="min-h-full bg-bg-primary"><WorkspaceHeader eyebrow="Career materials" title="Career Toolkit" description="Build the materials and preparation you need for each recruiting conversation." /><div className="mx-auto max-w-5xl divide-y divide-white/[0.08] border-y border-white/[0.08] sm:mt-8">{tools.map(({ href, label, description, icon: Icon, action }) => <Link key={href} href={href} className="group grid gap-4 bg-card px-5 py-6 hover:bg-white/[0.035] sm:grid-cols-[48px_1fr_auto] sm:items-center"><div className="flex h-12 w-12 items-center justify-center border border-sky-400/25 bg-sky-400/[0.08]"><Icon className="h-5 w-5 text-accent-teal" /></div><div><h2 className="font-heading text-xl font-semibold text-text-primary">{label}</h2><p className="mt-1 max-w-2xl text-base leading-6 text-text-secondary">{description}</p></div><span className="inline-flex min-h-11 items-center font-bold text-accent-teal">{action}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>)}</div></div>;
}
