import { NextRequest, NextResponse } from "next/server";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET(request: NextRequest) {
  // Pass all query params through to FastAPI
  const params = request.nextUrl.searchParams.toString();
  const url = `${FASTAPI_URL}/api/discover${params ? `?${params}` : ""}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ contacts: [], total: 0 });
  }
}
