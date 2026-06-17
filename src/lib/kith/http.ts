import { NextResponse } from "next/server";
import { NotNodeMemberError } from "@/lib/kith/authz";

/** Map kith lib errors to HTTP responses. Authz → 403, validation → 400. */
export function mapKithError(err: unknown): NextResponse {
  if (err instanceof NotNodeMemberError) {
    return NextResponse.json({ error: err.message }, { status: 403 });
  }
  const name = err instanceof Error ? err.name : "";
  const msg = err instanceof Error ? err.message : "Server error";
  if (["FriendRequestError", "NodeError", "WarmPathError"].includes(name)) {
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  console.error("[kith] route error", err);
  return NextResponse.json({ error: "Server error" }, { status: 500 });
}
