import Link from "next/link";
import { prisma, meUserEmail } from "@/lib/me/db";
import { daysSince, ensurePipelines } from "@/lib/me/pipelines";
import OpenContact from "@/components/me/open-contact";
import ActionItemCard from "@/components/me/action-item-card";

const OUTBOUND = new Set(["linkedin_connect", "linkedin_message", "email_sent", "email_draft", "follow_up"]);
const REPLY = new Set(["reply", "meeting_scheduled", "coffee_chat"]);

function hasActivity(contact: { activities: { type: string; occurredAt: Date }[] }, types: Set<string>) {
  return contact.activities.some((activity) => types.has(activity.type));
}

function latestActivity(contact: { activities: { type: string; occurredAt: Date }[] }, types?: Set<string>) {
  const filtered = types ? contact.activities.filter((activity) => types.has(activity.type)) : contact.activities;
  return filtered.sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime())[0] || null;
}

function daysAgo(date: Date | null | undefined) {
  return date ? Math.floor((Date.now() - date.getTime()) / 86_400_000) : null;
}

function actionItemsOf(value: unknown) {
  return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map((v) => v.trim()).filter(Boolean) : [];
}

export default async function MeOutreach() {
  const userId = meUserEmail();
  await ensurePipelines(userId);

  const [entries, actionContacts] = await Promise.all([
    prisma.mePipelineEntry.findMany({
      where: { userId },
      include: {
        pipeline: true,
        contact: {
          include: {
            memory: true,
            activities: { orderBy: { occurredAt: "desc" }, take: 30 },
          },
        },
      },
      orderBy: [{ updatedAt: "asc" }],
      take: 300,
    }),
    prisma.meContact.findMany({
      where: { userId, memory: { isNot: null } },
      include: { memory: true },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
  ]);

  const noOutbound = entries.filter((entry) => !hasActivity(entry.contact, OUTBOUND));
  const awaitingReply = entries.filter((entry) => {
    if (!["reached_out", "talking"].includes(entry.stage)) return false;
    const outbound = latestActivity(entry.contact, OUTBOUND);
    if (!outbound || hasActivity(entry.contact, REPLY)) return false;
    return daysAgo(outbound.occurredAt) == null || (daysAgo(outbound.occurredAt) ?? 0) >= 3;
  });
  const needsPrep = entries.filter((entry) =>
    ["talking", "met"].includes(entry.stage) && !entry.contact.activities.some((activity) => activity.type === "coffee_chat"),
  );
  const cold = entries
    .map((entry) => ({ entry, days: daysSince(entry.lastTouchAt) }))
    .filter(({ entry, days }) => days != null && entry.pipeline.cadenceDays != null && days > entry.pipeline.cadenceDays);
  const nextSteps = actionContacts
    .flatMap((contact) =>
      actionItemsOf(contact.memory?.actionItems).map((item) => ({
        contact,
        item,
      })),
    )
    .slice(0, 12);

  const buckets = [
    { key: "first", title: "First outreach", blurb: "Prospects with no draft, connect, message, or sent activity.", entries: noOutbound },
    { key: "reply", title: "Awaiting reply", blurb: "Reached out or talking, no reply logged after a few days.", entries: awaitingReply },
    { key: "prep", title: "Needs prep / scheduling", blurb: "Talking or met contacts that need chat prep or a logged chat.", entries: needsPrep },
    { key: "cold", title: "Going cold", blurb: "Past cadence for their pipeline.", entries: cold.map(({ entry }) => entry) },
  ];

  return (
    <div className="px-8 py-10">
      <div className="max-w-6xl">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#8A8077]">daily queue</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Outreach</h1>
            <p className="mt-2 max-w-3xl text-[14px] text-[#B7AFA7]">
              Clear this queue: draft first messages, follow up, prep chats, and revive contacts going cold.
            </p>
          </div>
          <Link href="/me/discover" className="rounded-lg bg-[#E8643C] px-3 py-2 text-[13px] font-medium text-white hover:bg-[#d4562f]">
            Find more people
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-5">
          <a href="#next-steps" className="rounded-xl border border-[#38332F] bg-[#232020] p-4 hover:border-[#E8643C]/50">
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#8A8077]">Next steps</p>
            <p className="mt-2 text-2xl font-semibold text-white">{nextSteps.length}</p>
          </a>
          {buckets.map((bucket) => (
            <a key={bucket.key} href={`#${bucket.key}`} className="rounded-xl border border-[#38332F] bg-[#232020] p-4 hover:border-[#E8643C]/50">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#8A8077]">{bucket.title}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{bucket.entries.length}</p>
            </a>
          ))}
        </div>

        <div className="mt-6 space-y-5">
          <section id="next-steps" className="rounded-xl border border-[#38332F] bg-[#232020] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[16px] font-semibold text-white">Next steps</h2>
                <p className="mt-1 text-[12px] text-[#8A8077]">Follow-ups captured from coffee-chat outcomes and contact memory.</p>
              </div>
              <span className="rounded-full border border-[#38332F] px-2 py-1 text-[11px] text-[#8A8077]">{nextSteps.length}</span>
            </div>
            <div className="mt-4 grid gap-3 lg:grid-cols-2">
              {nextSteps.length === 0 ? (
                <div className="rounded-lg border border-dashed border-[#38332F] p-5 text-center text-[13px] text-[#8A8077] lg:col-span-2">
                  No open next steps. Save outcomes after coffee chats and they will appear here.
                </div>
              ) : (
                nextSteps.map(({ contact, item }) => (
                  <ActionItemCard
                    key={`${contact.id}-${item}`}
                    contactId={contact.id}
                    name={contact.name}
                    subtitle={[contact.title, contact.firmName].filter(Boolean).join(" · ")}
                    item={item}
                  />
                ))
              )}
            </div>
          </section>

          {buckets.map((bucket) => (
            <section key={bucket.key} id={bucket.key} className="rounded-xl border border-[#38332F] bg-[#232020] p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-[16px] font-semibold text-white">{bucket.title}</h2>
                  <p className="mt-1 text-[12px] text-[#8A8077]">{bucket.blurb}</p>
                </div>
                <span className="rounded-full border border-[#38332F] px-2 py-1 text-[11px] text-[#8A8077]">{bucket.entries.length}</span>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {bucket.entries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-[#38332F] p-5 text-center text-[13px] text-[#8A8077] lg:col-span-2">
                    Nothing here.
                  </div>
                ) : (
                  bucket.entries.slice(0, 20).map((entry) => (
                    <OutreachCard
                      key={`${bucket.key}-${entry.id}`}
                      entry={entry}
                      draftMode={bucket.key === "reply" || bucket.key === "cold" ? "follow_up" : "first"}
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

function OutreachCard({
  entry,
  draftMode,
}: {
  entry: Awaited<ReturnType<typeof prisma.mePipelineEntry.findMany>>[number] & {
    contact: {
      id: string;
      name: string;
      firmName: string | null;
      title: string | null;
      linkedInUrl: string | null;
      email: string | null;
      activities: { type: string; occurredAt: Date }[];
      memory: { relationshipType: string } | null;
    };
    pipeline: { name: string; cadenceDays: number | null };
  };
  draftMode: "first" | "follow_up";
}) {
  const last = latestActivity(entry.contact);
  const rel = entry.contact.memory?.relationshipType || "untyped";
  return (
    <div className="rounded-lg border border-[#322E2B] bg-[#1C1A19] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <OpenContact id={entry.contact.id} tab="actions" className="truncate text-left text-[14px] font-medium text-white hover:text-[#E8643C]">
            {entry.contact.name}
          </OpenContact>
          <p className="mt-0.5 truncate text-[12px] text-[#9C948C]">
            {[entry.contact.title, entry.contact.firmName].filter(Boolean).join(" · ") || "Details pending"}
          </p>
        </div>
        <span className="rounded-full border border-[#38332F] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#8A8077]">
          {rel}
        </span>
      </div>
      <p className="mt-3 text-[12px] text-[#B7AFA7]">
        {entry.pipeline.name} · {entry.stage.replaceAll("_", " ")}
        {entry.lastTouchAt ? ` · touched ${daysSince(entry.lastTouchAt)}d ago` : " · never touched"}
      </p>
      {last && (
        <p className="mt-1 text-[11px] text-[#6F665E]">
          Last activity: {last.type.replaceAll("_", " ")} · {daysAgo(last.occurredAt)}d ago
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <OpenContact id={entry.contact.id} tab="actions" draftMode={draftMode} className="rounded-md border border-[#E8643C]/40 px-2.5 py-1.5 text-[12px] text-[#E8643C] hover:bg-[#E8643C]/10">
          {draftMode === "follow_up" ? "Draft follow-up" : "Draft / send"}
        </OpenContact>
        <OpenContact id={entry.contact.id} tab="timeline" className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] hover:bg-[#2E2A27]">
          Log
        </OpenContact>
        <Link href={`/me/prep/${entry.contact.id}`} className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] hover:bg-[#2E2A27]">
          Prep
        </Link>
        {entry.contact.linkedInUrl && (
          <a href={entry.contact.linkedInUrl} target="_blank" rel="noreferrer" className="rounded-md border border-[#38332F] px-2.5 py-1.5 text-[12px] text-[#C9C2BB] hover:bg-[#2E2A27]">
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
