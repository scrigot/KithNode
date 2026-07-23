import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);
export default auth;

export const config = {
  matcher: [
    // Dashboard pages
    "/dashboard/:path*",
    // Single-owner personal workspace, gated in auth.config when enabled.
    "/me",
    "/me/:path*",
    // Private API routes (auth, health, and Stripe webhook are excluded)
    "/api/me/:path*",
    "/api/contacts/:path*",
    "/api/discover/:path*",
    "/api/pipeline/:path*",
    "/api/dashboard/:path*",
    "/api/import/:path*",
    "/api/digest",
    "/api/digest/:path*",
    "/api/outreach/:path*",
    "/api/assistant/:path*",
    "/api/resume/:path*",
    "/api/coffee-prep/:path*",
    "/api/integrations/:path*",
    "/api/linkedin-profiles/:path*",
    "/api/opportunities/:path*",
    "/api/applications/:path*",
    "/api/organizations/:path*",
    "/api/documents/:path*",
    "/api/memory/:path*",
    "/api/knowledge-sources/:path*",
    "/api/recents/:path*",
    "/api/saved-views/:path*",
    "/api/job-sources/:path*",
    "/api/research/:path*",
    "/api/professors/:path*",
    "/api/user/:path*",
  ],
};
