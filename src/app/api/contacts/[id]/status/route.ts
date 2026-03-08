import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { triggerAutoGuard, resumeAutomation } from "@/lib/autoguard";

const VALID_STATUSES = ["NEW", "CONTACTED", "RESPONDED", "CONVERTED"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || !VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const connection = await prisma.connection.findUnique({
    where: { id },
    include: { alumni: true },
  });

  if (!connection || connection.userId !== session.user.id) {
    return NextResponse.json(
      { error: "Connection not found" },
      { status: 404 },
    );
  }

  // AutoGuard: if status is changing to RESPONDED, trigger kill-switch
  if (status === "RESPONDED") {
    const result = await triggerAutoGuard(id, session.user.id);
    return NextResponse.json({
      connection: {
        id,
        status: "RESPONDED",
        automationPaused: true,
      },
      autoGuard: result,
    });
  }

  // Update status normally
  const updated = await prisma.connection.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({
    connection: {
      id: updated.id,
      status: updated.status,
      automationPaused: updated.automationPaused,
    },
  });
}

// POST endpoint to resume automation after AutoGuard triggered
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body;

  if (action !== "resume_automation") {
    return NextResponse.json(
      { error: "Invalid action" },
      { status: 400 },
    );
  }

  const result = await resumeAutomation(id, session.user.id);

  if (!result.resumed) {
    return NextResponse.json(
      { error: result.message },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
