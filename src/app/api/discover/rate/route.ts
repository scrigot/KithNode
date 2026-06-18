import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const { contactId, rating } = await request.json();

  if (!contactId || !["high_value", "skip", "later"].includes(rating)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  // Discover no longer gates visibility: contacts are shown unredacted in the
  // deck, so a rating is purely a record (skip advances; high_value keeps the
  // contact unlocked in the pipeline view). The old "high_value -> reveal the
  // unlocked contact" projection branch is gone.
  const { error } = await supabase
    .from("UserDiscover")
    .upsert(
      { userId, contactId, rating },
      { onConflict: "userId,contactId" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
