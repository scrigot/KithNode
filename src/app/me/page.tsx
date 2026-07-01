import Link from "next/link";
import { prisma, meUserEmail } from "@/lib/me/db";
import { daysSince, ensurePipelines } from "@/lib/me/pipelines";
import OpenContact from "@/components/me/open-contact";
import ActionItemCard from "@/components/me/action-item-card";

function relStyle(rel: string) {
  if (rel === "buyer") return "text-[#E8643C] bg-[#E8643C]/10 border-[#E8643C]/30";
  if (rel === "practitioner") return "text-[#7FB069] bg-[#7FB069]/10 border-[#7FB069]/30";
  if (rel === "ecosystem") return "text-[#6EA8C7] bg-[#6EA8C7]/10 border-[#6EA8C7]/30";
  return "text-[#8A8077] bg-[#2E2A27] border-[#38332F]";
}

function reasonList(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").slice(0, 3) : [];
}

function actionItemsOf(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [];
}

export default async function MeHome() {
  const userId = meUserEmail();
  await ensurePipelines(userId);

  const [leadCount, leads, savedContacts, coldEntries, pipelines, actionContacts] = await Promise.all([
    prisma.meDiscoveryLead.count({ where: { userId, status: "researching" } }),
    prisma.meDiscoveryLead.findMany({
      where: { userId, status: "researching" },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      take: 4,
    }),
    prisma.meContact.findMany({
      where: { userId, source: "discover_lead" },
      include: { memory: true, pipelineEntries: { include: { pipeline: true } } },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
    prisma.mePipelineEntry.findMany({
      where: { userId },
      include: { contact: { include: { memory: true } }, pipeline: true },
      orderBy: { updatedAt: "asc" },
      take: 40,
    }),
    prisma.mePipeline.findMany({
      where: { userId },
      orderBy: { order: "asc" },
      select: { id: true, name: true, _count: { select: { entries: true } } },
    }),
    prisma.meContact.findMany({
      where: { userId, memory: { isNot: null } },
      include: { memory: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  const goingCold = coldEntries
    .map((entry) => ({ entry, days: daysSince(entry.lastTouchAt) }))
    .filter(({ entry, days }) => days != null && entry.pipeline.cadenceDays != null && days > entry.pipeline.cadenceDays)
    .slice(0, 5);
  const needsPipeline = savedContacts.filter((c) => c.pipelineEntries.length === 0).slice(0, 4);
  const needsMemory = savedContacts.filter((c) => !c.memory?.notes && !c.memory?.strategicValue).slice(0, 4);
  const nextSteps = actionContacts
    .flatMap((contact) =>
      actionItemsOf(contact.memory?.actionItems).map((item) => ({
        contact,
        item,
      })),
    )
    .slice(0, 8);

  return (
    <div className="px-8 py-10">
      <div className="max-w-6xl">
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#8A8077]">{userId}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Today</h1>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-[#B7AFA7]">
              Work the loop: discover AI experts, save the useful ones, add context, move them through a pipeline,
              prep the coffee chat, and draft the outreach.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/me/discover" className="rounded-lg bg-[#E8643C] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#d4562f]">
              Find people
            </Link>
            <Link href="/me/network" className="rounded-lg border border-[#38332F] px-3 py-2 text-[13px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
              Rank network
            </Link>
            <Link href="/me/pipelines" className="rounded-lg border border-[#38332F] px-3 py-2 text-[13px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
              Open pipelines
            </Link>
          </div>
        </div>

        <div className="mt-7 grid gap-3 md:grid-cols-4">
          <Metric label="Discovery candidates" value={leadCount} href="/me/discover" />
          <Metric label="Need pipeline" value={needsPipeline.length} href="/me/contacts?source=discover_lead&inPipeline=out" />
          <Metric label="Need memory" value={needsMemory.length} href="/me/contacts?source=discover_lead" />
          <Metric label="Next steps" value={nextSteps.length} href="#next-steps" hot={nextSteps.length > 0} />
          <Metric label="Going cold" value={goingCold.length} href="/me/pipelines" hot={goingCold.length > 0} />
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            <Panel
              title="Next steps"
              action={<Link href="/me/contacts" className="text-[12px] text-[#E8643C] hover:text-white">all contacts</Link>}
              id="next-steps"
            >
              {nextSteps.length === 0 ? (
                <Empty text="No open next steps. Save outcomes after coffee chats and they will appear here." />
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {nextSteps.map(({ contact, item }) => (
                    <ActionItemCard
                      key={`${contact.id}-${item}`}
                      contactId={contact.id}
                      name={contact.name}
                      subtitle={[contact.title, contact.firmName].filter(Boolean).join(" · ")}
                      item={item}
                    />
                  ))}
                </div>
              )}
            </Panel>

            <Panel
              title="Discovery queue"
              action={<Link href="/me/discover" className="text-[12px] text-[#E8643C] hover:text-white">open discover</Link>}
            >
              {leads.length === 0 ? (
                <Empty text="No active discovery candidates. Open Discover next to LinkedIn and capture a few AI experts." />
              ) : (
                <div className="space-y-2">
                  {leads.map((lead) => (
                    <div key={lead.id} className="rounded-lg border border-[#322E2B] bg-[#1C1A19] p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-medium text-white">{lead.name}</p>
                          <p className="mt-0.5 truncate text-[12px] text-[#9C948C]">
                            {[lead.title, lead.firmName, lead.location].filter(Boolean).join(" · ") || "Details pending"}
                          </p>
                        </div>
                        <span className="rounded-full bg-[#E8643C]/10 px-2 py-0.5 text-[11px] text-[#E8643C]">{lead.score}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {reasonList(lead.reasons).map((reason) => (
                          <span key={reason} className="rounded-full border border-[#38332F] px-2 py-0.5 text-[10px] text-[#B7AFA7]">
                            {reason}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Contacts to move forward">
              {savedContacts.length === 0 ? (
                <Empty text="Saved discovery contacts will show up here after you capture them from LinkedIn." />
              ) : (
                <div className="grid gap-2 md:grid-cols-2">
                  {savedContacts.map((contact) => {
                    const rel = contact.memory?.relationshipType || "untyped";
                    return (
                      <div key={contact.id} className="rounded-lg border border-[#322E2B] bg-[#1C1A19] p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <OpenContact id={contact.id} className="truncate text-left text-[14px] font-medium text-white hover:text-[#E8643C]">
                              {contact.name}
                            </OpenContact>
                            <p className="mt-0.5 truncate text-[12px] text-[#9C948C]">
                              {[contact.title, contact.firmName].filter(Boolean).join(" · ") || "Details pending"}
                            </p>
                          </div>
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wide ${relStyle(rel)}`}>
                            {rel}
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <OpenContact id={contact.id} tab="memory" className="rounded-md border border-[#38332F] px-2 py-1 text-[11px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
                            Add memory
                          </OpenContact>
                          <OpenContact id={contact.id} tab="actions" className="rounded-md border border-[#38332F] px-2 py-1 text-[11px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
                            Draft / pipeline
                          </OpenContact>
                          <Link href={`/me/prep/${contact.id}`} className="rounded-md border border-[#38332F] px-2 py-1 text-[11px] text-[#C9C2BB] hover:border-[#E8643C] hover:text-white">
                            Prep
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>
          </section>

          <aside className="space-y-5">
            <Panel title="Going cold">
              {goingCold.length === 0 ? (
                <Empty text="No pipeline contacts are past cadence." />
              ) : (
                <div className="space-y-2">
                  {goingCold.map(({ entry, days }) => (
                    <div key={entry.id} className="rounded-lg border border-[#E8643C]/30 bg-[#E8643C]/[0.06] p-3">
                      <OpenContact id={entry.contact.id} tab="actions" className="text-left text-[13px] font-medium text-white hover:text-[#E8643C]">
                        {entry.contact.name}
                      </OpenContact>
                      <p className="mt-0.5 text-[12px] text-[#C9C2BB]">
                        {entry.pipeline.name} · {entry.stage.replaceAll("_", " ")}
                      </p>
                      <p className="mt-1 text-[11px] text-[#E8643C]">{days}d since touch</p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Pipeline load">
              <div className="space-y-2">
                {pipelines.map((pipeline) => (
                  <Link key={pipeline.id} href="/me/pipelines" className="flex items-center justify-between rounded-lg border border-[#322E2B] bg-[#1C1A19] px-3 py-2 hover:border-[#E8643C]/50">
                    <span className="text-[13px] text-[#C9C2BB]">{pipeline.name}</span>
                    <span className="text-[12px] text-[#8A8077]">{pipeline._count.entries}</span>
                  </Link>
                ))}
              </div>
            </Panel>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, href, hot }: { label: string; value: number; href: string; hot?: boolean }) {
  return (
    <Link href={href} className={`rounded-xl border p-4 hover:border-[#E8643C]/50 ${hot ? "border-[#E8643C]/40 bg-[#E8643C]/[0.06]" : "border-[#38332F] bg-[#232020]"}`}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-[#8A8077]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </Link>
  );
}

function Panel({ title, action, children, id }: { title: string; action?: React.ReactNode; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="rounded-xl border border-[#38332F] bg-[#232020] p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#38332F] p-5 text-center text-[13px] text-[#8A8077]">
      {text}
    </div>
  );
}
