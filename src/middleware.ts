import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: [
    // Dashboard pages
    "/dashboard/:path*",
    // Private API routes (auth, health, and Stripe webhook are excluded)
    "/api/contacts/:path*",
    "/api/discover/:path*",
    "/api/pipeline/:path*",
    "/api/dashboard/:path*",
    "/api/import/:path*",
    "/api/digest",
    "/api/digest/:path*",
    "/api/outreach/:path*",
    "/api/professors/:path*",
    "/api/user/:path*",
  ],
};
