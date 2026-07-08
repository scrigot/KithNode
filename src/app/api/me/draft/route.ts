import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { generateMeText } from "@/lib/me/ai";
import { buildDraftPrompt, parseDraft, fallbackDraft, inferDraftMode, type DraftContext, type DraftMode, type OutreachDraft } from "@/lib/me/draft";
import { logContactActivity } from "@/lib/me/activity";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const body = await req.json().catch(() => ({}));
  const { contactId } = body;
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const contact = await prisma.meContact.findFirst({
    where: { id: contactId, userId },
    include: {
      memory: true,
      pipelineEntries: { select: { stage: true, lastTouchAt: true } },
      activities: {
        orderBy: { occurredAt: "desc" },
        take: 8,
        select: { type: true, title: true, detail: true, occurredAt: true },
      },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  const profile = await prisma.meProfile.findUnique({ where: { userId } });

  const touch = contact.pipelineEntries
    .map((e) => e.lastTouchAt)
    .filter(Boolean)
    .map((d) => (d as Date).getTime());
  const lastTouch = touch.length ? Math.max(...touch) : null;

  const ctx: DraftContext = {
    name: contact.name,
    firmName: contact.firmName || "",
    title: contact.title || "",
    relationshipType: contact.memory?.relationshipType || "",
    strategicValue: contact.memory?.strategicValue || "",
    notes: contact.memory?.notes || contact.notes || "",
    stage: contact.pipelineEntries[0]?.stage ?? null,
    daysSinceTouch: lastTouch ? Math.floor((Date.now() - lastTouch) / 86_400_000) : null,
    recentActivities: contact.activities,
  };
  const requestedMode: DraftMode | undefined = body.mode === "follow_up" || body.mode === "first" ? body.mode : undefined;

  const previousDraft: OutreachDraft | null =
    body.previousDraft && typeof body.previousDraft === "object"
      ? {
          subject: typeof body.previousDraft.subject === "string" ? body.previousDraft.subject : "",
          body: typeof body.previousDraft.body === "string" ? body.previousDraft.body : "",
        }
      : null;
  const options = {
    mode: requestedMode || inferDraftMode(ctx),
    style: typeof body.style === "string" && body.style.trim() ? body.style.trim() : profile?.outreachStyle || "",
    length: typeof body.length === "string" && body.length.trim() ? body.length.trim() : profile?.outreachLength || "",
    signoff: typeof body.signoff === "string" && body.signoff.trim() ? body.signoff.trim() : profile?.outreachSignoff || "",
    positioning: typeof body.positioning === "string" && body.positioning.trim() ? body.positioning.trim() : profile?.outreachPositioning || "",
    goals: typeof body.goals === "string" && body.goals.trim() ? body.goals.trim() : profile?.outreachGoals || "",
    refine: typeof body.refine === "string" ? body.refine.trim() : "",
    previousDraft,
    framing: body.framing && typeof body.framing === "object" ? {
      whyThisPerson: typeof body.framing.whyThisPerson === "string" ? body.framing.whyThisPerson.trim() : "",
      desiredOutcome: typeof body.framing.desiredOutcome === "string" ? body.framing.desiredOutcome.trim() : "",
      sharedContext: typeof body.framing.sharedContext === "string" ? body.framing.sharedContext.trim() : "",
      specificAsk: typeof body.framing.specificAsk === "string" ? body.framing.specificAsk.trim() : "",
      constraints: typeof body.framing.constraints === "string" ? body.framing.constraints.trim() : "",
    } : undefined,
  };

  const sender = options.signoff || "Sam";
  const gen = await generateMeText(buildDraftPrompt(ctx, sender, options));
  const parsed = gen.ok ? parseDraft(gen.text) : null;
  const draft = parsed ?? fallbackDraft(ctx, sender, options);
  await logContactActivity({
    userId,
    contactId,
    type: "email_draft",
    title: options.refine ? "Refined outreach draft" : options.mode === "follow_up" ? "Generated follow-up draft" : "Generated outreach draft",
    detail: `Subject: ${draft.subject}\n\n${draft.body}`,
    meta: { ai: Boolean(parsed), model: gen.ok ? gen.model : "fallback", mode: options.mode },
  });
  return NextResponse.json({ ...draft, ai: Boolean(parsed), mode: options.mode });
}
