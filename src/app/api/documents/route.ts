import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { careerDocumentCreateSchema, DOCUMENT_TYPES } from "@/lib/product-records";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.trim().toLowerCase() || "";
  if (!userId) return routeError("Sign in to view documents.", 401, "unauthorized", "Sign in and try again.");

  const type = request.nextUrl.searchParams.get("type") || "";
  const q = (request.nextUrl.searchParams.get("q") || "").replace(/[,%()]/g, " ").trim().slice(0, 120);
  let query = supabase.from("CareerDocument").select("*").eq("userId", userId).neq("status", "archived");
  if (DOCUMENT_TYPES.includes(type as (typeof DOCUMENT_TYPES)[number])) query = query.eq("type", type);
  if (q) query = query.ilike("title", `%${q}%`);
  const { data: catalog = [], error } = await query.order("updatedAt", { ascending: false }).limit(300);

  if (!error) return NextResponse.json({ documents: catalog, catalogReady: true });

  // The migration and app can be rolled out independently. During that window,
  // preserve access to every legacy document instead of showing an empty page.
  const [{ data: resumes = [] }, { data: linkedIn = [] }, { data: outreach = [] }] = await Promise.all([
    supabase
      .from("MeResume")
      .select("id,title,track,score,content,createdAt,updatedAt")
      .in("userId", Array.from(new Set([userId, userEmail].filter(Boolean))))
      .order("updatedAt", { ascending: false }),
    supabase
      .from("LinkedInProfile")
      .select("id,name,status,score,isPrimary,content,createdAt,updatedAt")
      .eq("userId", userId)
      .neq("status", "archived")
      .order("updatedAt", { ascending: false }),
    supabase
      .from("OutreachDraft")
      .select("id,subject,body,status,contactId,createdAt,updatedAt")
      .eq("userId", userId)
      .order("updatedAt", { ascending: false })
      .limit(100),
  ]);
  const documents = [
    ...(resumes || []).map((item) => ({
      id: `resume:${item.id}`,
      legacyId: item.id,
      legacyType: "MeResume",
      type: "resume",
      title: item.title,
      status: "current",
      variantType: item.track,
      content: item.content,
      metadata: { score: item.score },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    ...(linkedIn || []).map((item) => ({
      id: `linkedin:${item.id}`,
      legacyId: item.id,
      legacyType: "LinkedInProfile",
      type: "linkedin",
      title: item.name,
      status: item.status,
      variantType: "",
      content: item.content,
      metadata: { score: item.score, isPrimary: item.isPrimary },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    ...(outreach || []).map((item) => ({
      id: `outreach:${item.id}`,
      legacyId: item.id,
      legacyType: "OutreachDraft",
      type: "outreach",
      title: item.subject || "Outreach draft",
      status: item.status,
      variantType: "",
      content: { subject: item.subject, body: item.body },
      metadata: { contactId: item.contactId },
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  return NextResponse.json({
    documents,
    catalogReady: false,
    warning: "Document linking is finishing setup. Your existing files remain available.",
  });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to create a document.", 401, "unauthorized", "Sign in and try again.");
  const parsed = careerDocumentCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return routeError("Check the document title and content.", 400, "invalid_document", "Correct the fields and save again.");
  }
  const { links, ...input } = parsed.data;
  const id = randomUUID();
  const now = new Date().toISOString();
  const payload = {
    ...input,
    id,
    userId,
    legacyType: "",
    legacyId: "",
    source: "manual",
    createdAt: now,
    updatedAt: now,
  };
  const { data: document, error } = await supabase.from("CareerDocument").insert(payload).select("*").single();
  if (error || !document) return routeError("KithNode could not create this document.", 503, "document_save_failed");
  await supabase.from("CareerDocumentRevision").insert({
    id: randomUUID(),
    documentId: id,
    userId,
    version: 1,
    content: input.content,
    evidence: input.evidence,
    changeSummary: "Document created",
    source: "create",
    createdAt: now,
  });
  if (links.length) {
    await supabase.from("CareerDocumentLink").insert(
      links.map((link) => ({ id: randomUUID(), documentId: id, userId, ...link, createdAt: now })),
    );
  }
  return NextResponse.json({ document: { ...document, links } }, { status: 201 });
}

