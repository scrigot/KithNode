import { NextRequest, NextResponse } from "next/server";
import { getContactsRanked } from "@/lib/api";

export async function GET(request: NextRequest) {
  const curated = request.nextUrl.searchParams.get("curated") === "true";

  try {
    const contacts = await getContactsRanked(0, 100, curated);
    return NextResponse.json(contacts);
  } catch {
    return NextResponse.json([]);
  }
}
