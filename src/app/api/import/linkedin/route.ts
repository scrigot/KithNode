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
  } catch (error) {
    const status = (error as { status?: number }).status || 500;
    return NextResponse.json(
      { error: "Import failed" },
      { status },
    );
  }
}
