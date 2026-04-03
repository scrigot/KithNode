import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI_URL}/api/dashboard/coverage`);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ covered: [], uncovered: [], total_target: 0, total_covered: 0 }, { status: 500 });
  }
}
