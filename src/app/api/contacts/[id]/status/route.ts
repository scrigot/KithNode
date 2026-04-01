import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { updateOutreachStatus } from "@/lib/api";

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

  try {
    const result = await updateOutreachStatus(Number(id), status);
    return NextResponse.json({
      connection: { id, status: result.status },
    });
  } catch (error) {
    const errStatus = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: "Failed to update status" },
      { status: errStatus },
    );
  }
}
