import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { assertPublicHttpUrl } from "@/lib/jobs/fetch";
import {
  isExternalOpportunityUrl,
  opportunityCompanyKey,
  opportunityPatchSchema,
  statusLabel,
} from "@/lib/opportunities";
import { supabase } from "@/lib/supabase";

async function scopedOpportunity(id: string, userId: string) {
  return supabase.from("Opportunity").select("*").eq("id", id).eq("userId", userId).maybeSingle();
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data, error } = await scopedOpportunity(id, userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  const [{ data: contacts = [], error: contactsError }, { data: events = [], error: eventsError }] = await Promise.all([
    supabase.from("OpportunityContact").select("*").eq("opportunityId", id).eq("userId", userId),
    supabase.from("OpportunityEvent").select("*").eq("opportunityId", id).eq("userId", userId),
  ]);
  if (contactsError || eventsError) {
    return NextResponse.json(
      { error: "This application is temporarily unavailable. Please retry in a moment.", code: "application_unavailable" },
      { status: 503 },
    );
  }
  const recentEvents = [...(events || [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 100);
  return NextResponse.json({ opportunity: { ...data, contacts, events: recentEvents } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.trim().toLowerCase();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const { data: existing, error: existingError } = await scopedOpportunity(id, userId);
  if (existingError) return NextResponse.json({ error: existingError.message }, { status: 503 });
  if (!existing) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });

  const parsed = opportunityPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid opportunity update", issues: parsed.error.issues }, { status: 400 });
  const data = parsed.data;
  try {
    if (data.jobUrl && isExternalOpportunityUrl(data.jobUrl)) await assertPublicHttpUrl(data.jobUrl);
    if (data.applyUrl && isExternalOpportunityUrl(data.applyUrl)) await assertPublicHttpUrl(data.applyUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unsafe listing URL" }, { status: 400 });
  }

  if (data.resumeId) {
    if (!userEmail) return NextResponse.json({ error: "Your account needs an email before a resume can be attached." }, { status: 409 });
    const { data: resume } = await supabase.from("MeResume").select("id").eq("id", data.resumeId).eq("userId", userEmail).maybeSingle();
    if (!resume) return NextResponse.json({ error: "Resume not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const status = data.status || existing.status;
  const appliedStatuses = new Set(["applied", "assessment", "interview", "offer", "accepted", "rejected", "withdrawn"]);
  const update = {
    ...data,
    ...(data.company ? { companyKey: opportunityCompanyKey(data.company) } : {}),
    appliedAt: data.appliedAt !== undefined ? data.appliedAt : (!existing.appliedAt && appliedStatuses.has(status) ? now : existing.appliedAt),
    archivedAt: status === "archived" ? (existing.archivedAt || now) : null,
    lastActivityAt: now,
    updatedAt: now,
  };
  const { data: opportunity, error } = await supabase.from("Opportunity").update(update).eq("id", id).eq("userId", userId).select("*").single();
  if (error || !opportunity) return NextResponse.json({ error: error?.message || "Could not update opportunity" }, { status: 503 });

  if (data.status && data.status !== existing.status) {
    await supabase.from("OpportunityEvent").insert({
      id: randomUUID(), userId, opportunityId: id, type: "status_change", title: "Status changed",
      detail: `${statusLabel(existing.status)} → ${statusLabel(data.status)}`,
      meta: { from: existing.status, to: data.status }, createdAt: now,
    });
  }
  return NextResponse.json({ opportunity });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const now = new Date().toISOString();
  const { data, error } = await supabase.from("Opportunity").update({ status: "archived", archivedAt: now, lastActivityAt: now, updatedAt: now }).eq("id", id).eq("userId", userId).select("id").maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  if (!data) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  await supabase.from("OpportunityEvent").insert({ id: randomUUID(), userId, opportunityId: id, type: "archived", title: "Application archived", detail: "", meta: {}, createdAt: now });
  return NextResponse.json({ ok: true });
}
