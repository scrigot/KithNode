import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export interface SearchResult {
  id: string;
  name: string;
  title: string;
  firmName: string;
  warmthScore: number;
  tier: string;
}

/**
 * Build the ilike filter string for a sanitized query term.
 * Exported for unit testing without importing next-auth.
 */
export function buildSearchFilter(q: string): string {
  return `name.ilike.%${q}%,firmName.ilike.%${q}%,title.ilike.%${q}%,education.ilike.%${q}%,skills.ilike.%${q}%`;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const raw = request.nextUrl.searchParams.get("q") ?? "";
  // Sanitize: strip characters that could escape ilike pattern context, cap at 80 chars
  const q = raw.trim().replace(/[%_\\]/g, "").slice(0, 80);

  if (q.length < 2) {
    return NextResponse.json([] as SearchResult[]);
  }

  // Get the user's high_value discover set for the privacy boundary
  const { data: discoveries } = await supabase
    .from("UserDiscover")
    .select("contactId, rating")
    .eq("userId", userId);

  const highValueIds = new Set<string>(
    (discoveries || [])
      .filter((d) => d.rating === "high_value")
      .map((d) => d.contactId as string),
  );

  const filter = buildSearchFilter(q);

  // Own contacts (imported by this user)
  const { data: ownData } = await supabase
    .from("AlumniContact")
    .select("id, name, title, firmName, warmthScore, tier")
    .eq("importedByUserId", userId)
    .or(filter)
    .order("warmthScore", { ascending: false })
    .limit(8);

  const ownContacts: SearchResult[] = (ownData || []).map((c) => ({
    id: c.id as string,
    name: (c.name as string) || "",
    title: (c.title as string) || "",
    firmName: (c.firmName as string) || "",
    warmthScore: (c.warmthScore as number) || 0,
    tier: (c.tier as string) || "cold",
  }));

  // High-value discovered contacts — only fetch if we have some
  let discoveredContacts: SearchResult[] = [];
  if (highValueIds.size > 0) {
    const { data: discData } = await supabase
      .from("AlumniContact")
      .select("id, name, title, firmName, warmthScore, tier")
      .in("id", Array.from(highValueIds))
      .or(filter)
      .order("warmthScore", { ascending: false })
      .limit(8);

    discoveredContacts = (discData || []).map((c) => ({
      id: c.id as string,
      name: (c.name as string) || "",
      title: (c.title as string) || "",
      firmName: (c.firmName as string) || "",
      warmthScore: (c.warmthScore as number) || 0,
      tier: (c.tier as string) || "cold",
    }));
  }

  // Merge, deduplicate, sort by warmthScore, cap at 8
  const seen = new Set<string>();
  const results = [...ownContacts, ...discoveredContacts]
    .filter((c) => {
      if (seen.has(c.id)) return false;
      seen.add(c.id);
      return true;
    })
    .sort((a, b) => b.warmthScore - a.warmthScore)
    .slice(0, 8);

  return NextResponse.json(results);
}
