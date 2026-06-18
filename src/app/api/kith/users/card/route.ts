import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { getUserCard } from "@/lib/kith/cards";
import { mapKithError } from "@/lib/kith/http";

/** A member's profile/contact card — gated to friends or node co-members. */
export async function GET(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const email = req.nextUrl.searchParams.get("email");
  if (!email) return NextResponse.json({ error: "email is required" }, { status: 400 });
  try {
    const card = await getUserCard(session.user.id, email);
    if (!card) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(card);
  } catch (err) {
    return mapKithError(err);
  }
}
