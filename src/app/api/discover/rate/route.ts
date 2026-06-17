import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { poolSafeContact } from "@/lib/redact";

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

  const { error } = await supabase
    .from("UserDiscover")
    .upsert(
      { userId, contactId, rating },
      { onConflict: "userId,contactId" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // On high_value, return the unlocked contact so the UI can reveal the real
  // identity. The service-role client can read every column, so we MUST project
  // down before responding: poolSafeContact drops the owner's private columns
  // (importedByUserId, isFriend, lastSpokenAt, speakFrequency, hometown,
  // highSchool, passions) and empties email — mirroring the email:"" contract in
  // contacts/[id]/route.ts. We also verify the row is genuinely in the shared
  // pool (imported by ANOTHER user) before unlocking; an IDOR with the caller's
  // own id or a non-pool id must never hand back PII.
  if (rating === "high_value") {
    const { data: contact } = await supabase
      .from("AlumniContact")
      .select(
        "id, name, title, firmName, university, linkedInUrl, education, location, warmthScore, tier, affiliations, source, graduationYear, industry, degrees, concentration, track, role, importedByUserId",
      )
      .eq("id", contactId)
      .neq("importedByUserId", userId)
      .neq("importedByUserId", "")
      .maybeSingle();

    return NextResponse.json({
      success: true,
      contact: contact ? poolSafeContact(contact) : null,
    });
  }

  return NextResponse.json({ success: true });
}
