import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { extensionIdentity } from "@/lib/extension-auth";
import { createResearchDraftSchema } from "@/lib/guided-research/schema";
import { isApprovedResearchSource, normalizeLinkedInProfileUrl } from "@/lib/guided-research/source-policy";

export async function GET(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const id = request.nextUrl.searchParams.get("id");
    if (id) {
      const draft = await prisma.researchDraft.findFirst({ where: { id, userId } });
      if (!draft) return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      return NextResponse.json({ draft });
    }

    const drafts = await prisma.researchDraft.findMany({
      where: { userId, status: { in: ["draft", "ready"] } },
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ drafts });
  } catch {
    return NextResponse.json(
      { error: "research_unavailable", message: "Private research is temporarily unavailable. Retry after the database migration is applied." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const identity = await extensionIdentity(request, "research:draft");
  if (!identity) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = createResearchDraftSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_research_draft", details: parsed.error.flatten() }, { status: 400 });
  }
  const normalizedUrl = normalizeLinkedInProfileUrl(parsed.data.payload.linkedInUrl);
  if (!normalizedUrl) {
    return NextResponse.json({ error: "A valid LinkedIn profile URL is required" }, { status: 400 });
  }
  if (!isApprovedResearchSource(parsed.data.sourceUrl)) {
    return NextResponse.json({ error: "source_not_allowed" }, { status: 400 });
  }

  try {
    const draft = await prisma.researchDraft.create({
      data: {
        userId: identity.userId,
        status: "ready",
        sourceType: parsed.data.sourceType,
        sourceUrl: parsed.data.sourceUrl || normalizedUrl,
        target: parsed.data.target,
        payload: { ...parsed.data.payload, linkedInUrl: normalizedUrl },
        selectedFields: parsed.data.selectedFields,
      },
    });
    return NextResponse.json({ draft, reviewUrl: `/dashboard/discover?view=research&draft=${draft.id}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "research_unavailable", message: "Could not save the private draft. Please retry." }, { status: 503 });
  }
}
