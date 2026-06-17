import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { listMessages, sendMessage, type ThreadType } from "@/lib/kith/messaging";
import { mapKithError } from "@/lib/kith/http";

function parseThreadType(v: string | null): ThreadType | null {
  return v === "dm" || v === "node" ? v : null;
}

export async function GET(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const sp = req.nextUrl.searchParams;
    const threadType = parseThreadType(sp.get("threadType"));
    const threadId = sp.get("threadId");
    if (!threadType || !threadId) {
      return NextResponse.json({ error: "threadType and threadId required" }, { status: 400 });
    }
    const since = sp.get("since") ?? undefined;
    return NextResponse.json(await listMessages(session.user.email, threadType, threadId, since));
  } catch (err) {
    return mapKithError(err);
  }
}

export async function POST(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { threadType: rawType, threadId, body } = await req.json();
    const threadType = parseThreadType(rawType);
    if (!threadType || !threadId || typeof threadId !== "string") {
      return NextResponse.json({ error: "threadType and threadId required" }, { status: 400 });
    }
    return NextResponse.json(await sendMessage(session.user.email, threadType, threadId, body));
  } catch (err) {
    return mapKithError(err);
  }
}
