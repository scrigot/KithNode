import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";

// Returns the personal invite link for the current user. Anyone who signs up
// via this link gets auto-friended (accepted Friendship) immediately.
export async function GET() {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const h = await headers();
  const host = h.get("host") || "kithnode.vercel.app";
  const proto = h.get("x-forwarded-proto") || "https";
  const inviteLink = `${proto}://${host}/sign-in?kith_inviter=${encodeURIComponent(session.user.email)}`;

  return NextResponse.json({ inviteLink });
}
