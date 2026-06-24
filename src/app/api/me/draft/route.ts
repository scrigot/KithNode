import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { generateMeText } from "@/lib/me/ai";
import { buildDraftPrompt, parseDraft, fallbackDraft, type DraftContext } from "@/lib/me/draft";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { contactId } = await req.json().catch(() => ({}));
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const contact = await prisma.meContact.findFirst({
    where: { id: contactId, userId },
    include: { memory: true, pipelineEntries: { select: { stage: true, lastTouchAt: true } } },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

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
  };

  const gen = await generateMeText(buildDraftPrompt(ctx, "Sam"));
  const parsed = gen.ok ? parseDraft(gen.text) : null;
  const draft = parsed ?? fallbackDraft(ctx, "Sam");
  return NextResponse.json({ ...draft, ai: Boolean(parsed) });
}
