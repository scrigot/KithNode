import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardReminders } from "@/lib/dashboard/reminders";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await getDashboardReminders(session.user.id);
    return NextResponse.json({ ...data, degraded: false });
  } catch {
    return NextResponse.json(
      {
        reminders: [],
        degraded: true,
        error: "reminders_query_unavailable",
      },
      { status: 503 },
    );
  }
}
