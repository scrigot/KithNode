import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { opportunityEventSchema } from "@/lib/opportunities";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data: opportunity } = await supabase.from("Opportunity").select("id").eq("id", id).eq("userId", userId).maybeSingle();
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  const parsed = opportunityEventSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid event", issues: parsed.error.issues }, { status: 400 });
  const now = new Date().toISOString();
  const { data: event, error } = await supabase.from("OpportunityEvent").insert({ id: randomUUID(), userId, opportunityId: id, createdAt: now, ...parsed.data }).select("*").single();
  if (error || !event) return NextResponse.json({ error: error?.message || "Could not add event" }, { status: 503 });
  await supabase.from("Opportunity").update({ lastActivityAt: now, updatedAt: now }).eq("id", id).eq("userId", userId);
  return NextResponse.json({ event }, { status: 201 });
}
