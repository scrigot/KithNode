import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";

type KnowledgeDescriptor = {
  id: string;
  entityType: string;
  title: string;
  count: number;
  status: "ready" | "incomplete" | "degraded" | "unavailable";
  freshnessAt: string | null;
  provenance: string;
  recoveryAction: string;
  href: string;
};

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  const userEmail = session?.user?.email?.trim().toLowerCase() || "";
  if (!userId) return routeError("Sign in to view knowledge sources.", 401, "unauthorized", "Sign in and try again.");

  const results = await Promise.allSettled([
    supabase.from("AlumniContact").select("id,createdAt").eq("importedByUserId", userId),
    supabase.from("Opportunity").select("id,updatedAt").eq("userId", userId),
    supabase.from("LinkedInProfile").select("id,updatedAt").eq("userId", userId).neq("status", "archived"),
    supabase.from("MeResume").select("id,updatedAt").in("userId", Array.from(new Set([userId, userEmail].filter(Boolean)))),
    supabase.from("CareerDocument").select("id,updatedAt").eq("userId", userId).neq("status", "archived"),
    supabase.from("JobSource").select("id,updatedAt").eq("userId", userId).eq("active", true),
    supabase.from("IntegrationConnection").select("id,updatedAt,status").eq("userId", userId),
    supabase.from("ResearchDraft").select("id,updatedAt").eq("userId", userId),
  ]);

  const latest = (rows: Array<{ updatedAt?: string; createdAt?: string }> | null | undefined) =>
    rows?.map((row) => row.updatedAt || row.createdAt).filter((value): value is string => Boolean(value)).sort().at(-1) || null;
  const descriptor = (
    index: number,
    input: Omit<KnowledgeDescriptor, "count" | "freshnessAt" | "status">,
  ): KnowledgeDescriptor => {
    const result = results[index];
    const response = result.status === "fulfilled" ? result.value : null;
    const rows = (response && "data" in response ? response.data : []) as Array<{ updatedAt?: string; createdAt?: string }> | null;
    const failed = result.status === "rejected" || Boolean(response && "error" in response && response.error);
    return {
      ...input,
      count: rows?.length || 0,
      status: failed ? "degraded" : rows?.length ? "ready" : "incomplete",
      freshnessAt: latest(rows),
    };
  };

  const sources: KnowledgeDescriptor[] = [
    descriptor(0, { id: "people", entityType: "contact", title: "People and relationships", provenance: "Your network", recoveryAction: "Import or add people.", href: "/dashboard/people" }),
    descriptor(1, { id: "applications", entityType: "application", title: "Applications and deadlines", provenance: "Application tracker", recoveryAction: "Save an opportunity or create an application.", href: "/dashboard/applications" }),
    descriptor(2, { id: "linkedin", entityType: "linkedin", title: "LinkedIn profile copies", provenance: "LinkedIn Studio", recoveryAction: "Import or create your primary LinkedIn profile.", href: "/dashboard/documents?type=linkedin" }),
    descriptor(3, { id: "resumes", entityType: "resume", title: "Resumes and evidence", provenance: "Resume Studio", recoveryAction: "Create or import a primary resume.", href: "/dashboard/documents?type=resume" }),
    descriptor(4, { id: "documents", entityType: "document", title: "Career documents", provenance: "Documents", recoveryAction: "Create an essay, cover letter, or meeting brief.", href: "/dashboard/documents" }),
    descriptor(5, { id: "job-sources", entityType: "job_source", title: "Official opportunity sources", provenance: "Official employer career pages", recoveryAction: "Add or test an official career source.", href: "/dashboard/settings/integrations" }),
    descriptor(6, { id: "connections", entityType: "integration", title: "Connected accounts", provenance: "Connected accounts", recoveryAction: "Reconnect any expired account.", href: "/dashboard/settings/integrations" }),
    descriptor(7, { id: "research", entityType: "research", title: "Reviewed research", provenance: "Research workspace and browser companion", recoveryAction: "Review a person, company, or opportunity.", href: "/dashboard/research" }),
  ];
  return NextResponse.json({
    sources,
    summary: {
      ready: sources.filter((source) => source.status === "ready").length,
      needsAttention: sources.filter((source) => source.status !== "ready").length,
      totalRecords: sources.reduce((sum, source) => sum + source.count, 0),
    },
  });
}
