import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;

  const { contactId, rating } = await request.json();

  if (!contactId || !["high_value", "skip", "later"].includes(rating)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const { error } = await supabase
    .from("UserDiscover")
    .upsert(
      { userId, contactId, rating },
      { onConflict: "userId,contactId" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // On high_value, return the unlocked contact so the UI can reveal the real identity.
  if (rating === "high_value") {
    const { data: contact } = await supabase
      .from("AlumniContact")
      .select("id, name, title, firmName, email, linkedInUrl, education, location, warmthScore, tier, affiliations, source")
      .eq("id", contactId)
      .maybeSingle();

    return NextResponse.json({ success: true, contact: contact ?? null });
  }

  return NextResponse.json({ success: true });
}
