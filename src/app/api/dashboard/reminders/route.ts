import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  try {
    const res = await fetch(
      `${FASTAPI_URL}/api/pipeline/reminders?userId=${encodeURIComponent(userId)}`,
    );
    return NextResponse.json(await res.json());
  } catch {
    return NextResponse.json({ reminders: [] });
  }
}
