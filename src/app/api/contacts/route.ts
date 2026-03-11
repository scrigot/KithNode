import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, firmName, title, university, graduationYear, linkedInUrl } =
    body;

  if (!name || !firmName || !title || !university || !graduationYear) {
    return NextResponse.json(
      { error: "Name, firm, title, university, and graduation year are required" },
      { status: 400 },
    );
  }

  const alumni = await prisma.alumniContact.create({
    data: {
      name,
      firmName,
      title,
      university,
      graduationYear: Number(graduationYear),
      linkedInUrl: linkedInUrl || "",
    },
  });

  const connection = await prisma.connection.create({
    data: {
      userId: session.user.id,
      alumniId: alumni.id,
      strengthScore: 0,
      status: "NEW",
    },
    include: { alumni: true },
  });

  return NextResponse.json({
    id: connection.id,
    alumniId: connection.alumniId,
    name: connection.alumni.name,
    firmName: connection.alumni.firmName,
    title: connection.alumni.title,
    university: connection.alumni.university,
    strengthScore: connection.strengthScore,
    status: connection.status,
    automationPaused: connection.automationPaused,
  });
}

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
