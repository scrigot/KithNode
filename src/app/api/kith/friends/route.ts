import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { listFriends, sendFriendRequest } from "@/lib/kith/friendships";
import { mapKithError } from "@/lib/kith/http";

export async function GET() {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listFriends(session.user.email));
  } catch (err) {
    return mapKithError(err);
  }
}

export async function POST(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email required" }, { status: 400 });
    }
    return NextResponse.json(await sendFriendRequest(session.user.email, email));
  } catch (err) {
    return mapKithError(err);
  }
}
