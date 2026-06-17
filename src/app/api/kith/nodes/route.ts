import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";
import { createNode, getMyNodes } from "@/lib/kith/nodes";
import { mapKithError } from "@/lib/kith/http";

export async function GET() {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getMyNodes(session.user.email));
  } catch (err) {
    return mapKithError(err);
  }
}

export async function POST(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { name } = await req.json();
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Node name required" }, { status: 400 });
    }
    return NextResponse.json(await createNode(session.user.email, name));
  } catch (err) {
    return mapKithError(err);
  }
}
