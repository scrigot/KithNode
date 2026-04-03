import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI_URL}/api/pipeline/reminders`);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ reminders: [] }, { status: 500 });
  }
}
