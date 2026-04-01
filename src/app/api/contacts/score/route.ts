import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Scoring is handled by the FastAPI backend (scoring.py).
  // This endpoint is a no-op now — scores are computed during pipeline runs.
  return NextResponse.json({
    scored: 0,
    message: "Scoring is handled by the backend pipeline. Run the seed script to re-score.",
  });
}
