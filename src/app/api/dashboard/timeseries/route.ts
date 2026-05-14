// NOTE: AlumniContact has no createdAt column. Timeseries is derived from
// Connection.createdAt (when the user first connected a contact), filtered
// to Connection rows whose linked AlumniContact.tier is 'hot' or 'warm'.
// This faithfully represents "warm signal growth over time".

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Range = "7d" | "30d" | "90d" | "all";

function rangeToMs(range: Range): number | null {
  switch (range) {
    case "7d":
      return 7 * 24 * 60 * 60 * 1000;
    case "30d":
      return 30 * 24 * 60 * 60 * 1000;
    case "90d":
      return 90 * 24 * 60 * 60 * 1000;
    case "all":
      return null;
  }
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function shortLabel(isoDate: string): string {
  // "MMM D" — e.g. "May 3"
  const d = new Date(isoDate + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function fillDays(
  counts: Map<string, number>,
  startDate: Date,
  endDate: Date,
): Array<{ date: string; count: number }> {
  const result: Array<{ date: string; count: number }> = [];
  const cursor = new Date(startDate);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    const key = toISODate(cursor);
    result.push({ date: shortLabel(key), count: counts.get(key) ?? 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return result;
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const searchParams = new URLSearchParams(request.url.split("?")[1] ?? "");
  const metric = searchParams.get("metric") ?? "warm_signals";
  const rawRange = searchParams.get("range") ?? "30d";

  // Validate params
  if (metric !== "warm_signals") {
    return NextResponse.json({ error: "Unknown metric" }, { status: 400 });
  }
  const VALID_RANGES: Range[] = ["7d", "30d", "90d", "all"];
  if (!VALID_RANGES.includes(rawRange as Range)) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }
  const range = rawRange as Range;

  const now = new Date();
  const rangeMs = rangeToMs(range);
  const rangeStart = rangeMs ? new Date(now.getTime() - rangeMs) : null;
  const priorStart = rangeMs
    ? new Date(now.getTime() - rangeMs * 2)
    : null;

  // Fetch all user Connections joined with alumni tier
  // We select createdAt + alumniId, then filter by tier from a second query.
  // (Supabase JS client doesn't support cross-table filters inline without views,
  // so we pull both tables and join in-memory — same pattern as overview route.)

  // 1. Get all warm/hot alumni IDs for this user
  const { data: warmAlumni, error: alumniErr } = await supabase
    .from("AlumniContact")
    .select("id")
    .eq("importedByUserId", userId)
    .in("tier", ["hot", "warm"]);

  if (alumniErr) {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  const warmAlumniIds = new Set((warmAlumni ?? []).map((a) => a.id));

  if (warmAlumniIds.size === 0) {
    return NextResponse.json({
      data: [],
      total: 0,
      delta: 0,
      deltaPct: 0,
    });
  }

  // 2. Get connections for those alumni (scoped to this user)
  let connectionsQuery = supabase
    .from("Connection")
    .select("createdAt, alumniId")
    .eq("userId", userId)
    .in("alumniId", Array.from(warmAlumniIds));

  if (rangeStart) {
    connectionsQuery = connectionsQuery.gte(
      "createdAt",
      priorStart!.toISOString(),
    );
  }

  const { data: connections, error: connErr } = await connectionsQuery;

  if (connErr) {
    return NextResponse.json({ error: "Query failed" }, { status: 500 });
  }

  // 3. Partition into current range vs prior range and build day counts
  const currentCounts = new Map<string, number>();
  let currentTotal = 0;
  let priorTotal = 0;

  for (const conn of connections ?? []) {
    const ts = new Date(conn.createdAt);
    const isoDay = toISODate(ts);

    if (rangeStart) {
      if (ts >= rangeStart) {
        currentCounts.set(isoDay, (currentCounts.get(isoDay) ?? 0) + 1);
        currentTotal++;
      } else {
        // falls in prior window (>= priorStart, < rangeStart)
        priorTotal++;
      }
    } else {
      // "all" — everything goes in current
      currentCounts.set(isoDay, (currentCounts.get(isoDay) ?? 0) + 1);
      currentTotal++;
    }
  }

  // 4. Fill missing days for a continuous line
  let filledData: Array<{ date: string; count: number }>;
  if (currentCounts.size === 0) {
    filledData = [];
  } else if (rangeStart) {
    filledData = fillDays(currentCounts, rangeStart, now);
  } else {
    // "all": span from first recorded day to today
    const sortedDays = Array.from(currentCounts.keys()).sort();
    const first = new Date(sortedDays[0] + "T00:00:00Z");
    filledData = fillDays(currentCounts, first, now);
  }

  // 5. Compute delta
  const delta = currentTotal - priorTotal;
  const deltaPct = priorTotal === 0 ? 0 : (delta / priorTotal) * 100;

  return NextResponse.json({
    data: filledData,
    total: currentTotal,
    delta,
    deltaPct: Math.round(deltaPct * 10) / 10,
  });
}
