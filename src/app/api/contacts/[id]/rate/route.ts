import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { rateContact } from "@/lib/api";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  try {
    const result = await rateContact(
      Number(id),
      body.rating,
    );
    return NextResponse.json(result);
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: "Failed to rate contact" },
      { status },
    );
  }
}
