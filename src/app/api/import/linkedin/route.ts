import { NextRequest, NextResponse } from "next/server";
import { importLinkedIn } from "@/lib/api";

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.urls || !Array.isArray(body.urls)) {
    return NextResponse.json(
      { error: "urls array is required" },
      { status: 400 },
    );
  }

  try {
    const result = await importLinkedIn(body.urls);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ imported: 0, failed: body.urls.length, contacts: [], message: "Backend is not available. Import will work when the backend is deployed." });
  }
}
