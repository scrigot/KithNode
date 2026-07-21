import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isOutreachStatus, setOutreachStatus } from "@/lib/outreach/status";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { status } = body;
  if (!isOutreachStatus(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  try {
    const result = await setOutreachStatus(session.user.id, id, status);
    if (!result) return NextResponse.json({ error: "Outreach draft not found" }, { status: 404 });

    // Include conversion data when status reaches a conversion milestone
    const isConversion =
      status.toLowerCase() === "responded" || status.toLowerCase() === "meeting_set";
    let conversion: {
      contactId: string;
      source: string;
      stage: string;
    } | undefined;

    if (isConversion) {
      conversion = {
        contactId: id,
        source: "outreach_status",
        stage: status.toLowerCase(),
      };
    }

    return NextResponse.json({
      connection: { id, contactId: result.contactId, status: result.status },
      ...(conversion ? { conversion } : {}),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: 500 },
    );
  }
}
