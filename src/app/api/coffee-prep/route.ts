import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { accessibleCoffeePrepContact } from "@/lib/coffee-prep/contact";
import { buildPrepPrompt, fallbackBrief, parsePrepBrief, type PrepContext, type PrepExtra } from "@/lib/me/coffee-prep";
import { generateMeText } from "@/lib/me/ai";

export const runtime = "nodejs";

const requestSchema = z.object({
  contactId: z.string().min(1).max(100),
  force: z.boolean().optional(),
  meeting: z.object({
    purpose: z.string().max(500).optional(),
    time: z.string().max(200).optional(),
    location: z.string().max(300).optional(),
  }).optional(),
  person: z.string().max(2_000).optional(),
  refine: z.string().max(1_000).optional(),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = requestSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });

  const access = await accessibleCoffeePrepContact(userId, parsed.data.contactId);
  if (!access) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  const contact = access.contact as Record<string, any>;

  const { data: entries, error: entriesError } = await supabase
    .from("PipelineEntry")
    .select("stage,notes,lastTouchAt,pipelineId")
    .eq("userId", userId)
    .eq("contactId", parsed.data.contactId);
  if (entriesError) return NextResponse.json({ error: "Could not load pipeline context" }, { status: 503 });

  const pipelineIds = [...new Set((entries || []).map((entry) => entry.pipelineId).filter(Boolean))];
  const { data: pipelines } = pipelineIds.length
    ? await supabase.from("Pipeline").select("id,name").eq("userId", userId).in("id", pipelineIds)
    : { data: [] as Array<{ id: string; name: string }> };
  const pipelineNames = new Map((pipelines || []).map((pipeline) => [pipeline.id, pipeline.name]));

  const touchDates = [contact.lastSpokenAt, ...(entries || []).map((entry) => entry.lastTouchAt)]
    .filter(Boolean)
    .map((value) => new Date(String(value)).getTime())
    .filter(Number.isFinite);
  const lastTouch = touchDates.length ? Math.max(...touchDates) : null;
  const ctx: PrepContext = {
    name: String(contact.name || "Unknown contact"),
    firmName: String(contact.firmName || ""),
    title: String(contact.title || ""),
    email: String(contact.email || ""),
    relationshipType: contact.isFriend ? "known relationship" : "",
    strategicValue: contact.warmthScore ? `Network fit score ${Math.round(Number(contact.warmthScore))}` : "",
    notes: [contact.notes, ...(entries || []).map((entry) => entry.notes)].filter(Boolean).join("\n"),
    pipelines: (entries || []).map((entry) => ({ name: pipelineNames.get(entry.pipelineId) || "Pipeline", stage: entry.stage || "researched" })),
    daysSinceTouch: lastTouch ? Math.max(0, Math.floor((Date.now() - lastTouch) / 86_400_000)) : null,
  };
  const extra: PrepExtra = {
    meeting: parsed.data.meeting,
    person: parsed.data.person?.trim() || undefined,
    refine: parsed.data.refine?.trim() || undefined,
  };
  const sender = session.user?.name?.split(" ")[0] || "You";
  const generated = await generateMeText(buildPrepPrompt(ctx, sender, extra));
  const brief = generated.ok ? parsePrepBrief(generated.text) || fallbackBrief(ctx) : fallbackBrief(ctx);
  return NextResponse.json({ brief, ai: generated.ok, cached: false, context: extra, sourceDate: new Date().toISOString() });
}
