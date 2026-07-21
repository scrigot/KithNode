import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { randomUUID } from "node:crypto";
import { assertPublicHttpUrl } from "@/lib/jobs/fetch";
import {
  OPPORTUNITY_PRIORITIES,
  OPPORTUNITY_STATUSES,
  escapePostgrestSearch,
  isExternalOpportunityUrl,
  opportunityCompanyKey,
  opportunityCreateSchema,
} from "@/lib/opportunities";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = request.nextUrl.searchParams;
  const status = params.get("status") || "";
  const priority = params.get("priority") || "";
  const deadline = params.get("deadline") || "";
  const actions = params.get("actions") || "";
  const archived = params.get("archived") === "true";
  const q = escapePostgrestSearch(params.get("q") || "");
  const sort = params.get("sort") || "activity_desc";

  let query = supabase
    .from("Opportunity")
    .select("*,contacts:OpportunityContact(*),events:OpportunityEvent(*)")
    .eq("userId", userId);

  if (OPPORTUNITY_STATUSES.includes(status as (typeof OPPORTUNITY_STATUSES)[number])) query = query.eq("status", status);
  else if (archived) query = query.eq("status", "archived");
  else query = query.neq("status", "archived");
  if (OPPORTUNITY_PRIORITIES.includes(priority as (typeof OPPORTUNITY_PRIORITIES)[number])) query = query.eq("priority", priority);
  if (q) query = query.or(`company.ilike.%${q}%,role.ilike.%${q}%,location.ilike.%${q}%`);

  const now = new Date();
  if (deadline === "overdue") query = query.lt("deadline", now.toISOString());
  if (deadline === "upcoming") {
    const inTwoWeeks = new Date(now);
    inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);
    query = query.gte("deadline", now.toISOString()).lte("deadline", inTwoWeeks.toISOString());
  }
  if (deadline === "none") query = query.is("deadline", null);
  if (actions === "open") query = query.neq("nextAction", "");

  const sortMap: Record<string, { column: string; ascending: boolean }> = {
    activity_desc: { column: "lastActivityAt", ascending: false },
    deadline_asc: { column: "deadline", ascending: true },
    fit_desc: { column: "fitScore", ascending: false },
    company_asc: { column: "company", ascending: true },
    created_desc: { column: "createdAt", ascending: false },
  };
  const selectedSort = sortMap[sort] || sortMap.activity_desc;
  const { data: opportunities, error } = await query
    .order(selectedSort.column, { ascending: selectedSort.ascending, nullsFirst: false })
    .limit(300);
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });

  const contactIds = Array.from(new Set((opportunities || []).flatMap((opportunity) =>
    ((opportunity.contacts || []) as Array<{ contactId?: string }>).map((contact) => contact.contactId).filter(Boolean),
  ))) as string[];
  const { data: contactRows = [] } = contactIds.length
    ? await supabase.from("AlumniContact").select("id,firstName,lastName,firmName,title,linkedinUrl,tier,warmthScore").eq("importedByUserId", userId).in("id", contactIds)
    : { data: [] };
  const contactsById = new Map((contactRows || []).map((contact) => [contact.id, contact]));
  const hydrated = (opportunities || []).map((opportunity) => ({
    ...opportunity,
    contacts: ((opportunity.contacts || []) as Array<{ contactId: string }>).map((link) => ({ ...link, contact: contactsById.get(link.contactId) || null })),
    events: ((opportunity.events || []) as Array<{ createdAt: string }>).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 20),
  }));
  return NextResponse.json({ opportunities: hydrated });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = opportunityCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid opportunity", issues: parsed.error.issues }, { status: 400 });
  try {
    if (isExternalOpportunityUrl(parsed.data.jobUrl)) await assertPublicHttpUrl(parsed.data.jobUrl);
    if (isExternalOpportunityUrl(parsed.data.applyUrl)) await assertPublicHttpUrl(parsed.data.applyUrl);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unsafe listing URL" }, { status: 400 });
  }
  const id = randomUUID();
  const companyKey = opportunityCompanyKey(parsed.data.company);
  const now = new Date().toISOString();
  const jobUrl = parsed.data.jobUrl || `manual://opportunity/${id}`;
  const { data: existing } = await supabase.from("Opportunity").select("id,createdAt").eq("userId", userId).eq("jobUrl", jobUrl).maybeSingle();
  const opportunityId = existing?.id || id;
  const payload = {
    ...parsed.data,
    id: opportunityId,
    userId,
    companyKey,
    jobUrl,
    sourceFreshAt: parsed.data.sourceFreshAt || now,
    lastActivityAt: now,
    archivedAt: parsed.data.status === "archived" ? now : null,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const { data: opportunity, error: saveError } = await supabase.from("Opportunity").upsert(payload, { onConflict: "userId,jobUrl" }).select("*").single();
  if (saveError || !opportunity) return NextResponse.json({ error: saveError?.message || "Could not save opportunity" }, { status: 503 });

  if (!existing) {
    await supabase.from("OpportunityEvent").insert({
      id: randomUUID(), userId, opportunityId, type: "created", title: "Application added",
      detail: `${parsed.data.role} at ${parsed.data.company}`, meta: { source: parsed.data.source }, createdAt: now,
    });
  }

  const { data: contacts = [] } = await supabase.from("AlumniContact").select("id,warmthScore,tier,title").eq("importedByUserId", userId).ilike("firmName", parsed.data.company).limit(25);
  if (contacts?.length) await supabase.from("OpportunityContact").upsert(contacts.map((contact) => ({ id: randomUUID(), userId, opportunityId: opportunity.id, contactId: contact.id, score: Math.round(Math.max(contact.warmthScore, contact.tier === "warm" ? 70 : 0)), reason: contact.title || contact.tier, createdAt: now })), { onConflict: "userId,opportunityId,contactId" });

  return NextResponse.json({ opportunity: { ...opportunity, contactCount: contacts?.length || 0 } }, { status: 201 });
}
