import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { computeLeaderboard, type LeaderboardWindow } from "@/lib/kith/leaderboard";
import { mapKithError } from "@/lib/kith/http";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const w = req.nextUrl.searchParams.get("window");
    const window: LeaderboardWindow = w === "month" ? "month" : "week";
    return NextResponse.json({ window, rows: await computeLeaderboard(id, session.user.email, window) });
  } catch (err) {
    return mapKithError(err);
  }
}
