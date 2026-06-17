import { NextResponse } from "next/server";
import { SignJWT } from "jose";
import { auth } from "@/lib/auth";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";

// Mints a short-lived JWT the browser feeds to supabase.realtime.setAuth(), so an
// otherwise-anon Realtime socket can authenticate as this user and read ONLY its
// own private topic (the realtime.messages RLS policy keys off the `email` claim).
// Signed with SUPABASE_JWT_SECRET (the project's Realtime/GoTrue HS256 secret) —
// the same secret Realtime uses to verify, so no Supabase Auth session is needed.
//
// If the secret isn't configured, return 503 so the client hook degrades to
// polling instead of erroring.
export async function POST() {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const secret = process.env.SUPABASE_JWT_SECRET;
  if (!secret) return NextResponse.json({ error: "realtime_unconfigured" }, { status: 503 });

  // role 'authenticated' so the realtime SELECT policy (TO authenticated) applies;
  // sub + email both = the user's email (the policy matches on the email claim).
  const token = await new SignJWT({ role: "authenticated", email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(email)
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(secret));

  return NextResponse.json({ token });
}
