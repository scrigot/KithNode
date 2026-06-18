import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { listDmThreads } from "@/lib/kith/messaging";
import { mapKithError } from "@/lib/kith/http";

export async function GET() {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await listDmThreads(session.user.id));
  } catch (err) {
    return mapKithError(err);
  }
}
