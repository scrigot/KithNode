import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { respondToRequest } from "@/lib/kith/friendships";
import { mapKithError } from "@/lib/kith/http";

export async function POST(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { requesterId, action } = await req.json();
    if (!requesterId || (action !== "accept" && action !== "block")) {
      return NextResponse.json({ error: "requesterId and action (accept|block) required" }, { status: 400 });
    }
    return NextResponse.json(await respondToRequest(session.user.id, requesterId, action));
  } catch (err) {
    return mapKithError(err);
  }
}
