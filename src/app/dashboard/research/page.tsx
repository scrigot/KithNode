import Link from "next/link";
import { ArrowRight, Building2, BriefcaseBusiness, Search, UserSearch } from "lucide-react";
import { WorkspaceContent } from "@/components/product-workspace";
import { WorkspaceHeader } from "@/components/workspace-ui";

const researchModes = [
  {
    title: "Find internships & opportunities",
    description: "Search official employer sources using your goals, student eligibility, skills, applications, and network.",
    href: "/dashboard?skill=find-internships",
    action: "Find student opportunities",
    icon: BriefcaseBusiness,
  },
  {
    title: "Research a person",
    description: "Open a focused LinkedIn search, capture only facts you review, and decide what enters your network.",
    href: "/dashboard/discover",
    action: "Open guided people research",
    icon: UserSearch,
  },
  {
    title: "Research a company",
    description: "Understand roles, recruiting signals, existing relationships, and gaps in firm coverage.",
    href: "/dashboard?skill=firm-coverage",
    action: "Review company coverage",
    icon: Building2,
  },
];

export default function ResearchPage() {
  return (
    <div className="min-h-full bg-canvas">
      <WorkspaceHeader
        eyebrow="Grounded discovery"
        title="Research"
        description="Find opportunities, people, and organizations—then move reviewed evidence into Applications, People, Companies, and Documents."
      />
      <WorkspaceContent>
        <div className="grid gap-4 lg:grid-cols-3">
          {researchModes.map(({ title, description, href, action, icon: Icon }) => (
            <Link key={title} href={href} className="group flex min-h-[260px] flex-col rounded-2xl border border-border bg-white p-5 hover:border-primary/30 hover:shadow-sm">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary"><Icon className="h-5 w-5" /></span>
              <h2 className="mt-6 font-heading text-2xl font-medium tracking-[-0.01em] text-text-primary">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-text-secondary">{description}</p>
              <span className="mt-auto inline-flex items-center pt-6 text-sm font-semibold text-primary">{action}<ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
            </Link>
          ))}
        </div>
        <section className="mt-5 rounded-2xl border border-border bg-white p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-soft text-text-secondary"><Search className="h-5 w-5" /></span>
            <div><h2 className="font-heading text-xl font-medium text-text-primary">How reviewed research moves</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-text-secondary">A result stays a draft until you review it. Saving can create or link an Application, Organization, or Person. Outreach, meeting prep, and tailored documents remain separate previewed actions—nothing is sent or published automatically.</p></div>
          </div>
        </section>
      </WorkspaceContent>
    </div>
  );
}

