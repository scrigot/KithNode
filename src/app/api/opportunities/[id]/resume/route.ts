import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "node:crypto";

export async function POST(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email;
  if (!userId || !userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { data: opportunity } = await supabase.from("Opportunity").select("*").eq("id", id).eq("userId", userId).maybeSingle();
  if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 404 });
  const { data: primary } = await supabase.from("MeResume").select("*").eq("userId", userEmail).order("updatedAt", { ascending: false }).limit(1).maybeSingle();
  if (!primary) {
    return NextResponse.json({ error: "Create or import a primary resume in Resume Studio before generating a variant.", code: "resume_required", href: "/dashboard/resume" }, { status: 409 });
  }

  // Start from recorded user evidence only. The Resume Studio tailoring flow may
  // propose rewrites later, but its citation guard rejects unsupported claims.
  const now = new Date().toISOString();
  const { data: variant, error } = await supabase.from("MeResume").insert({
      id: randomUUID(),
      userId: userEmail,
      title: `${opportunity.company} — ${opportunity.role}`.slice(0, 200),
      track: primary.track,
      templateId: primary.templateId,
      content: primary.content,
      score: primary.score,
      dimensions: primary.dimensions,
      notes: primary.notes,
      docVersion: primary.docVersion,
      userContext: primary.userContext,
      createdAt: now,
      updatedAt: now,
  }).select("*").single();
  if (error || !variant) return NextResponse.json({ error: error?.message || "Could not create resume variant" }, { status: 503 });
  await supabase.from("Opportunity").update({ resumeId: variant.id, lastActivityAt: now, updatedAt: now }).eq("id", opportunity.id).eq("userId", userId);
  await supabase.from("OpportunityEvent").insert({ id: randomUUID(), userId, opportunityId: opportunity.id, type: "resume_variant", title: "Resume variant created", detail: variant.title, meta: { resumeId: variant.id }, createdAt: now });
  return NextResponse.json({ resume: variant, href: `/dashboard/resume?resumeId=${encodeURIComponent(variant.id)}&job=${encodeURIComponent(opportunity.id)}`, evidencePolicy: "recorded_only" }, { status: 201 });
}
