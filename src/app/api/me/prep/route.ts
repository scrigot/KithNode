import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { generateMeText } from "@/lib/me/ai";
import {
  buildPrepPrompt,
  parsePrepBrief,
  fallbackBrief,
  memoryHash,
  contextHash,
  prepExtraFromActivities,
  mergePrepExtra,
  PROMPT_VERSION,
  type PrepContext,
  type PrepExtra,
} from "@/lib/me/coffee-prep";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const body = await req.json().catch(() => ({}));
  const { contactId, force } = body;
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const mtg = body.meeting && typeof body.meeting === "object" ? body.meeting : {};
  const manualExtra: PrepExtra = {
    meeting: {
      purpose: String(mtg.purpose || "").trim() || undefined,
      time: String(mtg.time || "").trim() || undefined,
      location: String(mtg.location || "").trim() || undefined,
    },
    person: typeof body.person === "string" ? body.person.trim() || undefined : undefined,
    refine: typeof body.refine === "string" ? body.refine.trim() || undefined : undefined,
  };

  const contact = await prisma.meContact.findFirst({
    where: { id: contactId, userId },
    include: {
      memory: true,
      pipelineEntries: { include: { pipeline: { select: { name: true } } } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 12,
        select: { type: true, title: true, detail: true, occurredAt: true },
      },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const touchTimes = [
    ...contact.pipelineEntries.map((e) => e.lastTouchAt),
    contact.lastSpokenAt,
  ].filter(Boolean) as Date[];
  const lastTouch = touchTimes.length ? Math.max(...touchTimes.map((d) => d.getTime())) : null;

  const ctx: PrepContext = {
    name: contact.name,
    firmName: contact.firmName || "",
    title: contact.title || "",
    email: contact.email || "",
    relationshipType: contact.memory?.relationshipType || "",
    strategicValue: contact.memory?.strategicValue || "",
    notes: contact.memory?.notes || contact.notes || "",
    pipelines: contact.pipelineEntries.map((e) => ({ name: e.pipeline.name, stage: e.stage })),
    daysSinceTouch: lastTouch ? Math.floor((Date.now() - lastTouch) / 86_400_000) : null,
  };
  const autoExtra = prepExtraFromActivities(contact.activities);
  const extra = mergePrepExtra(autoExtra, manualExtra);

  const hash = memoryHash(ctx);
  const ch = contextHash(extra);

  // Cache on memory + meeting/person context. A refine instruction always
  // regenerates (it's an explicit "give me a different take").
  if (!force && !extra.refine) {
    const cached = await prisma.mePrepBrief.findFirst({
      where: { userId, contactId, promptVersion: PROMPT_VERSION, memoryHash: hash, contextHash: ch },
      orderBy: { createdAt: "desc" },
    });
    if (cached) {
      return NextResponse.json({ brief: cached.brief, ai: cached.model !== "fallback", cached: true, context: cached.meta ?? extra });
    }
  }

  const gen = await generateMeText(buildPrepPrompt(ctx, "Sam", extra));
  const parsed = gen.ok ? parsePrepBrief(gen.text) : null;
  const brief = parsed ?? fallbackBrief(ctx);
  const model = parsed ? gen.model : "fallback";

  await prisma.mePrepBrief.create({
    data: {
      userId,
      contactId,
      brief: brief as unknown as Prisma.InputJsonValue,
      model,
      promptVersion: PROMPT_VERSION,
      memoryHash: hash,
      contextHash: ch,
      meta: extra as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({ brief, ai: model !== "fallback", cached: false, context: extra });
}
