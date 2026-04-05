import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { getUserId } from "@/lib/get-user";

export async function POST(request: NextRequest) {
  const userId = await getUserId();
  const { contactId, rating } = await request.json();

  if (!contactId || !["high_value", "skip"].includes(rating)) {
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

  return NextResponse.json({ success: true });
}
