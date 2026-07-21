import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { opportunityContactSchema } from "@/lib/opportunities";
import { supabase } from "@/lib/supabase";

async function scopedOpportunity(userId: string, id: string) {
  return supabase.from("Opportunity").select("id,company").eq("id", id).eq("userId", userId).maybeSingle();
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = opportunityContactSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "contactId required" }, { status: 400 });
  const [{ data: opportunity }, { data: contact }] = await Promise.all([
    scopedOpportunity(userId, id),
    supabase.from("AlumniContact").select("id,firstName,lastName,title,warmthScore,tier").eq("id", parsed.data.contactId).eq("importedByUserId", userId).maybeSingle(),
  ]);
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });
  const now = new Date().toISOString();
  const score = Math.round(Math.max(contact.warmthScore || 0, contact.tier === "warm" ? 70 : 0));
  const { data: link, error } = await supabase.from("OpportunityContact").upsert({
    id: randomUUID(), userId, opportunityId: id, contactId: contact.id, score,
    reason: contact.title || contact.tier || "Connected contact", createdAt: now,
  }, { onConflict: "userId,opportunityId,contactId" }).select("*").single();
  if (error || !link) return NextResponse.json({ error: error?.message || "Could not attach contact" }, { status: 503 });
  const name = [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Contact";
  await Promise.all([
    supabase.from("OpportunityEvent").insert({ id: randomUUID(), userId, opportunityId: id, type: "contact_attached", title: "Contact attached", detail: name, meta: { contactId: contact.id }, createdAt: now }),
    supabase.from("Opportunity").update({ lastActivityAt: now, updatedAt: now }).eq("id", id).eq("userId", userId),
  ]);
  return NextResponse.json({ link: { ...link, contact } }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const parsed = opportunityContactSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "contactId required" }, { status: 400 });
  const { data: opportunity } = await scopedOpportunity(userId, id);
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  const { error, count } = await supabase.from("OpportunityContact").delete({ count: "exact" }).eq("userId", userId).eq("opportunityId", id).eq("contactId", parsed.data.contactId);
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  if (!count) return NextResponse.json({ error: "Contact link not found" }, { status: 404 });
  const now = new Date().toISOString();
  await supabase.from("OpportunityEvent").insert({ id: randomUUID(), userId, opportunityId: id, type: "contact_detached", title: "Contact removed", detail: "", meta: { contactId: parsed.data.contactId }, createdAt: now });
  return NextResponse.json({ ok: true });
}
