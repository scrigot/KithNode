import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getDashboardCoverage } from "@/lib/dashboard/coverage";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const data = await getDashboardCoverage(session.user.id, session.user.email);
    return NextResponse.json({ ...data, degraded: false });
  } catch {
    return NextResponse.json(
      {
        covered: [],
        uncovered: [],
        total_target: 0,
        total_covered: 0,
        degraded: true,
        error: "coverage_query_unavailable",
      },
      { status: 503 },
    );
  }
}
