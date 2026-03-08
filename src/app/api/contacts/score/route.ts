import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { scoreConnection } from "@/lib/scoring";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const connections = await prisma.connection.findMany({
    where: { userId: user.id },
    include: { alumni: true },
  });

  // Count mutual connections: for each alumni, how many other users
  // also have a connection to them
  const alumniIds = connections.map((c) => c.alumniId);
  const mutualCounts: Record<string, number> = {};

  if (alumniIds.length > 0) {
    const otherConnections = await prisma.connection.findMany({
      where: {
        alumniId: { in: alumniIds },
        userId: { not: user.id },
      },
    });

    for (const conn of otherConnections) {
      mutualCounts[conn.alumniId] = (mutualCounts[conn.alumniId] || 0) + 1;
    }
  }

  const updates = connections.map((conn) => {
    const score = scoreConnection(
      {
        university: user.university,
        targetIndustry: user.targetIndustry,
      },
      {
        university: conn.alumni.university,
        graduationYear: conn.alumni.graduationYear,
        firmName: conn.alumni.firmName,
      },
      mutualCounts[conn.alumniId] || 0,
    );

    return prisma.connection.update({
      where: { id: conn.id },
      data: { strengthScore: score },
    });
  });

  await Promise.all(updates);

  return NextResponse.json({
    scored: connections.length,
    message: `Scored ${connections.length} connections`,
  });
}
