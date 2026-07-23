import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { routeError } from "@/lib/api-response";
import { assertPublicHttpUrl } from "@/lib/jobs/fetch";
import {
  ORGANIZATION_TYPES,
  organizationCreateSchema,
  organizationNameKey,
} from "@/lib/product-records";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to view organizations.", 401, "unauthorized", "Sign in and try again.");

  const q = (request.nextUrl.searchParams.get("q") || "").replace(/[,%()]/g, " ").trim().slice(0, 120);
  const type = request.nextUrl.searchParams.get("type") || "";
  const includeArchived = request.nextUrl.searchParams.get("archived") === "true";

  let query = supabase.from("Organization").select("*").eq("userId", userId);
  query = includeArchived ? query : query.neq("status", "archived");
  if (ORGANIZATION_TYPES.includes(type as (typeof ORGANIZATION_TYPES)[number])) query = query.eq("type", type);
  if (q) query = query.or(`name.ilike.%${q}%,industry.ilike.%${q}%,location.ilike.%${q}%`);

  const { data: organizations, error } = await query.order("updatedAt", { ascending: false }).limit(500);
  if (error) {
    return routeError(
      "Companies are temporarily unavailable.",
      503,
      "organizations_unavailable",
      "Retry in a moment. Your existing people and applications are unchanged.",
    );
  }

  const ids = (organizations || []).map((organization) => organization.id);
  const [{ data: people = [] }, { data: applications = [] }] = ids.length
    ? await Promise.all([
        supabase.from("PersonOrganization").select("organizationId,contactId,isCurrent").eq("userId", userId).in("organizationId", ids),
        supabase.from("Opportunity").select("organizationId,status").eq("userId", userId).in("organizationId", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const peopleRows = people || [];
  const applicationRows = applications || [];
  const hydrated = (organizations || []).map((organization) => ({
    ...organization,
    peopleCount: peopleRows.filter((item) => item.organizationId === organization.id).length,
    currentPeopleCount: peopleRows.filter((item) => item.organizationId === organization.id && item.isCurrent).length,
    applicationCount: applicationRows.filter((item) => item.organizationId === organization.id).length,
    activeApplicationCount: applicationRows.filter(
      (item) => item.organizationId === organization.id && !["archived", "rejected", "withdrawn"].includes(item.status),
    ).length,
  }));

  return NextResponse.json({ organizations: hydrated });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return routeError("Sign in to add an organization.", 401, "unauthorized", "Sign in and try again.");
  const parsed = organizationCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return routeError(
      "Check the organization name and links.",
      400,
      "invalid_organization",
      "Correct the highlighted fields and save again.",
    );
  }
  try {
    if (parsed.data.website) await assertPublicHttpUrl(parsed.data.website);
    if (parsed.data.logoUrl) await assertPublicHttpUrl(parsed.data.logoUrl);
  } catch {
    return routeError("Use a public HTTPS organization URL.", 400, "unsafe_url", "Remove private or local URLs.");
  }

  const now = new Date().toISOString();
  const nameKey = organizationNameKey(parsed.data.name);
  const { data: existing } = await supabase
    .from("Organization")
    .select("id,createdAt")
    .eq("userId", userId)
    .eq("nameKey", nameKey)
    .maybeSingle();
  const payload = {
    ...parsed.data,
    id: existing?.id || randomUUID(),
    userId,
    nameKey,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };
  const { data: organization, error } = await supabase
    .from("Organization")
    .upsert(payload, { onConflict: "userId,nameKey" })
    .select("*")
    .single();
  if (error || !organization) {
    return routeError(
      "KithNode could not save this organization.",
      503,
      "organization_save_failed",
      "Retry. No contact or application was changed.",
    );
  }
  return NextResponse.json({ organization }, { status: existing ? 200 : 201 });
}
