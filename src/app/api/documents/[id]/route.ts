import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { careerDocumentPatchSchema } from "@/lib/product-records";
import { supabase } from "@/lib/supabase";

async function scopedDocument(id: string, userId: string) {
  return supabase.from("CareerDocument").select("*").eq("id", id).eq("userId", userId).maybeSingle();
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to view this document.", 401, "unauthorized", "Sign in and try again.");
  const { id } = await params;
  const { data, error } = await scopedDocument(id, userId);
  if (error) return routeError("This document is temporarily unavailable.", 503, "document_unavailable");
  if (!data) return routeError("Document not found.", 404, "document_not_found", "Return to Documents.");
  const [{ data: revisions = [] }, { data: links = [] }] = await Promise.all([
    supabase.from("CareerDocumentRevision").select("*").eq("userId", userId).eq("documentId", id).order("version", { ascending: false }),
    supabase.from("CareerDocumentLink").select("*").eq("userId", userId).eq("documentId", id),
  ]);
  return NextResponse.json({ document: { ...data, revisions, links } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to update this document.", 401, "unauthorized", "Sign in and try again.");
  const { id } = await params;
  const { data: existing } = await scopedDocument(id, userId);
  if (!existing) return routeError("Document not found.", 404, "document_not_found", "Return to Documents.");
  const body = await request.json().catch(() => ({}));
  const parsed = careerDocumentPatchSchema.safeParse(body);
  if (!parsed.success) return routeError("Check the document fields.", 400, "invalid_document");
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("CareerDocument")
    .update({ ...parsed.data, updatedAt: now })
    .eq("id", id)
    .eq("userId", userId)
    .select("*")
    .single();
  if (error || !data) return routeError("KithNode could not save this document.", 503, "document_save_failed");
  if (parsed.data.content || parsed.data.evidence) {
    const { data: latest } = await supabase
      .from("CareerDocumentRevision")
      .select("version")
      .eq("userId", userId)
      .eq("documentId", id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    await supabase.from("CareerDocumentRevision").insert({
      id: randomUUID(),
      documentId: id,
      userId,
      version: (latest?.version || 0) + 1,
      content: parsed.data.content || existing.content,
      evidence: parsed.data.evidence || existing.evidence,
      changeSummary: typeof body.changeSummary === "string" ? body.changeSummary.slice(0, 500) : "Document updated",
      source: "save",
      createdAt: now,
    });
  }
  return NextResponse.json({ document: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to archive this document.", 401, "unauthorized", "Sign in and try again.");
  const { id } = await params;
  const { data, error } = await supabase
    .from("CareerDocument")
    .update({ status: "archived", updatedAt: new Date().toISOString() })
    .eq("id", id)
    .eq("userId", userId)
    .select("id")
    .maybeSingle();
  if (error) return routeError("KithNode could not archive this document.", 503, "document_archive_failed");
  if (!data) return routeError("Document not found.", 404, "document_not_found", "Return to Documents.");
  return NextResponse.json({ ok: true, reversible: true });
}

