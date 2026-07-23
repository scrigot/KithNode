import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { assertPublicHttpUrl } from "@/lib/jobs/fetch";
import { organizationNameKey, organizationPatchSchema } from "@/lib/product-records";
import { supabase } from "@/lib/supabase";

async function scopedOrganization(id: string, userId: string) {
  return supabase.from("Organization").select("*").eq("id", id).eq("userId", userId).maybeSingle();
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to view this organization.", 401, "unauthorized", "Sign in and try again.");
  const { id } = await params;
  const { data, error } = await scopedOrganization(id, userId);
  if (error) return routeError("This organization is temporarily unavailable.", 503, "organization_unavailable");
  if (!data) return routeError("Organization not found.", 404, "organization_not_found", "Return to Companies.");
  const [{ data: people = [] }, { data: applications = [] }] = await Promise.all([
    supabase.from("PersonOrganization").select("*").eq("userId", userId).eq("organizationId", id),
    supabase.from("Opportunity").select("*").eq("userId", userId).eq("organizationId", id).order("updatedAt", { ascending: false }),
  ]);
  return NextResponse.json({ organization: { ...data, people, applications } });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to update this organization.", 401, "unauthorized", "Sign in and try again.");
  const { id } = await params;
  const { data: existing } = await scopedOrganization(id, userId);
  if (!existing) return routeError("Organization not found.", 404, "organization_not_found", "Return to Companies.");
  const parsed = organizationPatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return routeError("Check the organization fields.", 400, "invalid_organization");
  try {
    if (parsed.data.website) await assertPublicHttpUrl(parsed.data.website);
    if (parsed.data.logoUrl) await assertPublicHttpUrl(parsed.data.logoUrl);
  } catch {
    return routeError("Use a public HTTPS organization URL.", 400, "unsafe_url", "Remove private or local URLs.");
  }
  const update = {
    ...parsed.data,
    ...(parsed.data.name ? { nameKey: organizationNameKey(parsed.data.name) } : {}),
    updatedAt: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("Organization")
    .update(update)
    .eq("id", id)
    .eq("userId", userId)
    .select("*")
    .single();
  if (error || !data) return routeError("KithNode could not save these changes.", 503, "organization_save_failed");
  return NextResponse.json({ organization: data });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to archive this organization.", 401, "unauthorized", "Sign in and try again.");
  const { id } = await params;
  const { data, error } = await supabase
    .from("Organization")
    .update({ status: "archived", updatedAt: new Date().toISOString() })
    .eq("id", id)
    .eq("userId", userId)
    .select("id")
    .maybeSingle();
  if (error) return routeError("KithNode could not archive this organization.", 503, "organization_archive_failed");
  if (!data) return routeError("Organization not found.", 404, "organization_not_found", "Return to Companies.");
  return NextResponse.json({ ok: true, reversible: true });
}

