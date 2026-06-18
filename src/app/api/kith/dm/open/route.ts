import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { canDM, dmThreadId } from "@/lib/kith/messaging";
import { mapKithError } from "@/lib/kith/http";

// Resolve (or open) the DM thread between the caller and `withEmail`. This is the
// server-side gate for who-may-DM-whom: never trust the client to enforce scope.
export async function POST(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { withEmail } = await req.json();
    if (!withEmail || typeof withEmail !== "string") {
      return NextResponse.json({ error: "withEmail required" }, { status: 400 });
    }
    const userId = session.user.email;
    if (!(await canDM(userId, withEmail))) {
      return NextResponse.json({ error: "Cannot message this user" }, { status: 403 });
    }
    return NextResponse.json({ threadId: dmThreadId(userId, withEmail) });
  } catch (err) {
    return mapKithError(err);
  }
}
