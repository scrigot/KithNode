import { NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI_URL}/api/dashboard/overview`);
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ ratings: { high_value: 0, medium: 0, low: 0 }, total_contacts: 0, pipeline: { researched: 0, connected: 0, email_sent: 0, follow_up: 0, responded: 0, meeting_set: 0 }, recent_activity: [] });
  }
}
