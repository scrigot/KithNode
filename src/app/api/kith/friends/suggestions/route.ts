import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { supabase } from "@/lib/supabase";
import { getUserProfiles } from "@/lib/kith/users";

// Returns users in the same chapter (greekOrg) who have no Friendship row
// with the current user in any direction (pending/accepted/blocked).
// Excludes self. Identity = the User UUID; returns safe profile fields only:
// id, email, name, image.
export async function GET() {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // 1. Fetch this user's greekOrg.
  const { data: me } = await supabase.from("User").select("greekOrg").eq("id", userId).single();
  const greekOrg: string = me?.greekOrg?.trim() ?? "";
  if (!greekOrg) return NextResponse.json([]);

  // 2. Fetch all users in the same chapter (excluding self).
  const { data: chapterUsers } = await supabase
    .from("User")
    .select("id")
    .eq("greekOrg", greekOrg)
    .neq("id", userId);
  if (!chapterUsers || chapterUsers.length === 0) return NextResponse.json([]);

  const chapterIds: string[] = chapterUsers.map((u) => u.id as string);

  // 3. Fetch all Friendship rows involving this user (either direction, any status).
  const [asReq, asAddr] = await Promise.all([
    supabase.from("Friendship").select("addresseeId").eq("requesterId", userId),
    supabase.from("Friendship").select("requesterId").eq("addresseeId", userId),
  ]);
  const connectedIds = new Set<string>([
    ...((asReq.data ?? []).map((r) => r.addresseeId as string)),
    ...((asAddr.data ?? []).map((r) => r.requesterId as string)),
  ]);

  // 4. Filter out anyone already connected.
  const candidateIds = chapterIds.filter((id) => !connectedIds.has(id));
  if (candidateIds.length === 0) return NextResponse.json([]);

  // 5. Return safe profiles.
  const profiles = await getUserProfiles(candidateIds);
  const result = candidateIds
    .map((id) => profiles.get(id) ?? { id, email: id, name: id, image: "" })
    .slice(0, 20); // cap at 20

  return NextResponse.json(result);
}
