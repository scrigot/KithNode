import Google from "next-auth/providers/google";
import type { NextAuthConfig } from "next-auth";

/**
 * Shared auth configuration that can be used in Edge Runtime (middleware).
 * Does NOT import Prisma or any Node.js-only modules.
 */
export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/",
  },
  callbacks: {
    authorized: ({ auth, request }) => {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;

      // Dashboard pages: require session, redirect to / on failure.
      if (pathname.startsWith("/dashboard")) {
        return isLoggedIn;
      }

      // API routes that must remain public (matcher already excludes the
      // auth handler, health check, and Stripe webhook, but we double-check
      // here for defense in depth).
      if (
        pathname.startsWith("/api/auth/") ||
        pathname === "/api/health" ||
        pathname.startsWith("/api/health/") ||
        pathname === "/api/stripe/webhook"
      ) {
        return true;
      }

      // All other API routes covered by the matcher require a session.
      // Return a 401 instead of the default redirect so client fetches can
      // handle the failure gracefully (apiFetch flips to /?signin=required).
      if (pathname.startsWith("/api/")) {
        if (isLoggedIn) return true;
        return Response.json(
          { error: "Unauthorized" },
          { status: 401 },
        );
      }

      return true;
    },
  },
};
