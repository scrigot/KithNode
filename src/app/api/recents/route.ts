import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { supabase } from "@/lib/supabase";

type RecentItem = {
  id: string;
  kind: "chat" | "person" | "application" | "document" | "research";
  title: string;
  subtitle: string;
  href: string;
  updatedAt: string;
};

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to view recents.", 401, "unauthorized", "Sign in and try again.");
  const [chats, people, applications, documents, research] = await Promise.all([
    supabase.from("AssistantConversation").select("id,title,updatedAt").eq("userId", userId).order("updatedAt", { ascending: false }).limit(8),
    supabase.from("AlumniContact").select("id,name,title,firmName,createdAt").eq("importedByUserId", userId).order("createdAt", { ascending: false }).limit(8),
    supabase.from("Opportunity").select("id,company,role,updatedAt").eq("userId", userId).order("updatedAt", { ascending: false }).limit(8),
    supabase.from("CareerDocument").select("id,title,type,updatedAt").eq("userId", userId).order("updatedAt", { ascending: false }).limit(8),
    supabase.from("ResearchDraft").select("id,sourceType,status,updatedAt").eq("userId", userId).order("updatedAt", { ascending: false }).limit(8),
  ]);
  const items: RecentItem[] = [
    ...(chats.data || []).map((item) => ({ id: item.id, kind: "chat" as const, title: item.title || "Untitled chat", subtitle: "Conversation", href: `/dashboard?conversationId=${item.id}`, updatedAt: item.updatedAt })),
    ...(people.data || []).map((item) => ({ id: item.id, kind: "person" as const, title: item.name || "Unnamed person", subtitle: [item.title, item.firmName].filter(Boolean).join(" · "), href: `/contact/${item.id}`, updatedAt: item.createdAt })),
    ...(applications.data || []).map((item) => ({ id: item.id, kind: "application" as const, title: item.role, subtitle: item.company, href: `/dashboard/applications?applicationId=${item.id}`, updatedAt: item.updatedAt })),
    ...(documents.data || []).map((item) => ({ id: item.id, kind: "document" as const, title: item.title, subtitle: item.type.replaceAll("_", " "), href: `/dashboard/documents?documentId=${item.id}`, updatedAt: item.updatedAt })),
    ...(research.data || []).map((item) => ({ id: item.id, kind: "research" as const, title: `${item.sourceType.replaceAll("_", " ")} research`, subtitle: item.status, href: `/dashboard/research?draftId=${item.id}`, updatedAt: item.updatedAt })),
  ]
    .filter((item) => item.updatedAt)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 24);
  return NextResponse.json({ recents: items });
}

