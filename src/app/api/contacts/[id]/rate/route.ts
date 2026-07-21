import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isContactRating, saveContactRating } from "@/lib/discover/rating";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!id || !isContactRating(body.rating)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const result = await saveContactRating(session.user.id, id, body.rating);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to rate contact" },
      { status: 500 },
    );
  }
}
