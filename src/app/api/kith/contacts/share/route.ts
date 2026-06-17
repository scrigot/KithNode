import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";

/** Toggle a contact's sharedInNodes opt-out. Owner-only. */
export async function POST(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.email;

  const { contactId, sharedInNodes } = await req.json();
  if (!contactId || typeof sharedInNodes !== "boolean") {
    return NextResponse.json({ error: "contactId and sharedInNodes (boolean) required" }, { status: 400 });
  }

  // Owner-only: scope the update by importedByUserId so a non-owner can't flip
  // someone else's contact even if they know the id.
  const { data, error } = await supabase
    .from("AlumniContact")
    .update({ sharedInNodes })
    .eq("id", contactId)
    .eq("importedByUserId", userId)
    .select("id, sharedInNodes")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Not your contact" }, { status: 403 });
  return NextResponse.json(data);
}
