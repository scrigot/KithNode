import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { generateOutreachDraft } from "@/lib/outreach";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { connectionId } = body;

  if (!connectionId) {
    return NextResponse.json(
      { error: "connectionId is required" },
      { status: 400 },
    );
  }

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: { alumni: true, user: true },
  });

  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 },
    );
  }

  const draft = generateOutreachDraft({
    userName: connection.user.name,
    userUniversity: connection.user.university,
    userTargetIndustry: connection.user.targetIndustry,
    alumniName: connection.alumni.name,
    alumniTitle: connection.alumni.title,
    alumniFirm: connection.alumni.firmName,
    alumniUniversity: connection.alumni.university,
    strengthScore: connection.strengthScore,
  });

  return NextResponse.json({
    draft,
    alumniName: connection.alumni.name,
    alumniEmail: "", // placeholder — no email in schema yet
    subject: `Reaching out from ${connection.user.university || "a fellow student"}`,
  });
}
