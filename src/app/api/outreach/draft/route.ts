import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { draftOutreach } from "@/lib/api";

export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { contactId } = body;

  if (!contactId) {
    return NextResponse.json(
      { error: "contactId is required" },
      { status: 400 },
    );
  }

  try {
    const result = await draftOutreach(Number(contactId));
    return NextResponse.json({
      draft: result.body,
      subject: result.subject,
      outreachId: result.outreach_id,
    });
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: "Failed to generate draft" },
      { status },
    );
  }
}
