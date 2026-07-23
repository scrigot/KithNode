import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { CRM_WORKSPACES, savedViewSchema } from "@/lib/product-records";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to view saved views.", 401, "unauthorized", "Sign in and try again.");
  const workspace = request.nextUrl.searchParams.get("workspace") || "";
  let query = supabase.from("SavedCrmView").select("*").eq("userId", userId);
  if (CRM_WORKSPACES.includes(workspace as (typeof CRM_WORKSPACES)[number])) query = query.eq("workspace", workspace);
  const { data, error } = await query.order("isDefault", { ascending: false }).order("updatedAt", { ascending: false });
  if (error) return routeError("Saved views are temporarily unavailable.", 503, "saved_views_unavailable");
  return NextResponse.json({ views: data || [] });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to save this view.", 401, "unauthorized", "Sign in and try again.");
  const parsed = savedViewSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return routeError("Check the saved view name and filters.", 400, "invalid_saved_view");
  const now = new Date().toISOString();
  if (parsed.data.isDefault) {
    await supabase.from("SavedCrmView").update({ isDefault: false, updatedAt: now }).eq("userId", userId).eq("workspace", parsed.data.workspace);
  }
  const { data, error } = await supabase
    .from("SavedCrmView")
    .upsert({ id: randomUUID(), userId, ...parsed.data, createdAt: now, updatedAt: now }, { onConflict: "userId,workspace,name" })
    .select("*")
    .single();
  if (error || !data) return routeError("KithNode could not save this view.", 503, "saved_view_failed");
  return NextResponse.json({ view: data }, { status: 201 });
}

