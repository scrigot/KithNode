import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { accessibleCoffeePrepContact } from "@/lib/coffee-prep/contact";

const schema = z.object({
  contactId: z.string().min(1).max(100),
  summary: z.string().max(3_000).default(""),
  takeaways: z.string().max(3_000).default(""),
  nextSteps: z.string().max(3_000).default(""),
  stage: z.enum(["talking", "met", "warm"]).default("met"),
});

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request", issues: parsed.error.issues }, { status: 400 });
  const access = await accessibleCoffeePrepContact(userId, parsed.data.contactId);
  if (!access) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const stamp = new Date().toISOString();
  const addition = [
    `[Coffee chat ${stamp.slice(0, 10)}]`,
    parsed.data.summary && `Summary: ${parsed.data.summary.trim()}`,
    parsed.data.takeaways && `Takeaways: ${parsed.data.takeaways.trim()}`,
    parsed.data.nextSteps && `Next steps: ${parsed.data.nextSteps.trim()}`,
  ].filter(Boolean).join("\n");
  const existingNotes = String((access.contact as Record<string, unknown>).notes || "").trim();
  const updates = { notes: [existingNotes, addition].filter(Boolean).join("\n\n"), lastSpokenAt: stamp };

  if (access.owned) {
    const { error } = await supabase.from("AlumniContact").update(updates).eq("id", parsed.data.contactId).eq("importedByUserId", userId);
    if (error) return NextResponse.json({ error: "Could not save outcome" }, { status: 500 });
  } else {
    const { data: current } = await supabase.from("contact_override").select("overrides").eq("user_id", userId).eq("contact_id", parsed.data.contactId).maybeSingle();
    const { error } = await supabase.from("contact_override").upsert({
      user_id: userId,
      contact_id: parsed.data.contactId,
      overrides: { ...((current?.overrides as Record<string, unknown>) || {}), ...updates },
      updated_at: stamp,
    }, { onConflict: "user_id,contact_id" });
    if (error) return NextResponse.json({ error: "Could not save outcome" }, { status: 500 });
  }

  await supabase.from("PipelineEntry").update({ stage: parsed.data.stage, lastTouchAt: stamp, updatedAt: stamp }).eq("userId", userId).eq("contactId", parsed.data.contactId);
  return NextResponse.json({ ok: true, savedAt: stamp });
}
