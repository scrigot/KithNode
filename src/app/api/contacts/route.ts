import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const connections = await prisma.connection.findMany({
    where: { userId: session.user.id },
    include: { alumni: true },
    orderBy: { strengthScore: "desc" },
  });

  const contacts = connections.map((c) => ({
    id: c.id,
    alumniId: c.alumniId,
    name: c.alumni.name,
    firmName: c.alumni.firmName,
    title: c.alumni.title,
    university: c.alumni.university,
    strengthScore: c.strengthScore,
    status: c.status,
    automationPaused: c.automationPaused,
  }));

  return NextResponse.json(contacts);
}
