import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for /dashboard routes.
 *
 * Auth enforcement is disabled until Google OAuth credentials are
 * configured in production (AUTH_SECRET + GOOGLE_CLIENT_ID/SECRET).
 * Without AUTH_SECRET the NextAuth edge handler throws, which crashes
 * the entire dashboard with a 500.
 *
 * Re-enable by uncommenting the NextAuth import block below once
 * env vars are set on Vercel.
 */

// import NextAuth from "next-auth";
// import { authConfig } from "@/lib/auth.config";
// const { auth } = NextAuth(authConfig);
// export default auth;

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
