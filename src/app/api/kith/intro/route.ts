import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { createIntroFromPool } from "@/lib/kith/warm-path";
import { mapKithError } from "@/lib/kith/http";

/** Warm-path intro through a Node friend who owns the contact. */
export async function POST(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { contactId, message } = await req.json();
    if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });
    return NextResponse.json(await createIntroFromPool(session.user.email, contactId, message ?? ""));
  } catch (err) {
    return mapKithError(err);
  }
}
