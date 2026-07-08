import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { sanitizeProfileInput } from "@/lib/me/profile";

export const runtime = "nodejs";

export async function GET() {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const profile = await prisma.meProfile.findUnique({ where: { userId } });
  return NextResponse.json({
    profile: profile ?? {
      userId,
      schools: "",
      clubs: "",
      pastFirms: "",
      hometown: "",
      location: "",
      currentWork: "",
      goals: "",
      targetRoles: "",
      targetExpertise: "",
      targetCompanies: "",
      targetLocations: "",
      searchKeywords: "",
      profileNotes: "",
      outreachStyle: "",
      outreachLength: "",
      outreachSignoff: "",
      outreachPositioning: "",
      outreachGoals: "",
      preferredEmailClient: "",
    },
  });
}

export async function PATCH(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const body = await req.json().catch(() => ({}));
  const data = sanitizeProfileInput(body);

  const profile = await prisma.meProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  });

  return NextResponse.json({ profile });
}
