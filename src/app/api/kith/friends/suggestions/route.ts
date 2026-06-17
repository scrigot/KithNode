import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { supabase } from "@/lib/supabase";
import { getUserProfiles } from "@/lib/kith/users";

// Returns users in the same chapter (greekOrg) who have no Friendship row
// with the current user in any direction (pending/accepted/blocked).
// Excludes self. Returns safe profile fields only: email, name, image.
export async function GET() {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.email;

  // 1. Fetch this user's greekOrg.
  const { data: me } = await supabase.from("User").select("greekOrg").eq("email", userId).single();
  const greekOrg: string = me?.greekOrg?.trim() ?? "";
  if (!greekOrg) return NextResponse.json([]);

  // 2. Fetch all users in the same chapter (excluding self).
  const { data: chapterUsers } = await supabase
    .from("User")
    .select("email")
    .eq("greekOrg", greekOrg)
    .neq("email", userId);
  if (!chapterUsers || chapterUsers.length === 0) return NextResponse.json([]);

  const chapterEmails: string[] = chapterUsers.map((u) => u.email as string);

  // 3. Fetch all Friendship rows involving this user (either direction, any status).
  const [asReq, asAddr] = await Promise.all([
    supabase.from("Friendship").select("addresseeId").eq("requesterId", userId),
    supabase.from("Friendship").select("requesterId").eq("addresseeId", userId),
  ]);
  const connectedEmails = new Set<string>([
    ...((asReq.data ?? []).map((r) => r.addresseeId as string)),
    ...((asAddr.data ?? []).map((r) => r.requesterId as string)),
  ]);

  // 4. Filter out anyone already connected.
  const candidateEmails = chapterEmails.filter((e) => !connectedEmails.has(e));
  if (candidateEmails.length === 0) return NextResponse.json([]);

  // 5. Return safe profiles.
  const profiles = await getUserProfiles(candidateEmails);
  const result = candidateEmails
    .map((e) => profiles.get(e) ?? { email: e, name: e, image: "" })
    .slice(0, 20); // cap at 20

  return NextResponse.json(result);
}
