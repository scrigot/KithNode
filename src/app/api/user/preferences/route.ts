import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET() {
  try {
    const res = await fetch(`${FASTAPI_URL}/api/user/preferences`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({}, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const res = await fetch(`${FASTAPI_URL}/api/user/preferences`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(
      { error: "Failed to save preferences" },
      { status: 500 },
    );
  }
}
