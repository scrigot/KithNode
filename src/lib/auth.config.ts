import Google from "next-auth/providers/google";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
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
    // Microsoft (UNC @unc.edu accounts). Only registered when configured, so
    // the build/middleware never breaks before the Azure app exists.
    ...(process.env.AUTH_MICROSOFT_ENTRA_ID_ID
      ? [
          MicrosoftEntraID({
            clientId: process.env.AUTH_MICROSOFT_ENTRA_ID_ID,
            clientSecret: process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
            issuer: process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER,
          }),
        ]
      : []),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/sign-in",
    error: "/sign-in",
  },
  callbacks: {
    authorized: ({ auth, request }) => {
      const { pathname } = request.nextUrl;
      const isLoggedIn = !!auth?.user;
      const isMeRoute = pathname === "/me" || pathname.startsWith("/me/") || pathname.startsWith("/api/me/");
      const personalMode = process.env.PERSONAL_MODE === "true" || process.env.PERSONAL_MODE === "1";
      const requireMeAuth = process.env.ME_REQUIRE_AUTH === "true" || process.env.ME_REQUIRE_AUTH === "1" || process.env.VERCEL_ENV === "production";

      // /me is a single-owner personal workspace. It stays 404-gated in the
      // route layer when PERSONAL_MODE is off. If PERSONAL_MODE is enabled in
      // production, middleware must also protect both pages and APIs; otherwise
      // the local-first APIs would be publicly callable.
      if (isMeRoute && personalMode && requireMeAuth) {
        const allowedEmail = process.env.ME_USER_EMAIL?.trim().toLowerCase();
        const userEmail = auth?.user?.email?.trim().toLowerCase();
        const allowed = Boolean(allowedEmail && userEmail && allowedEmail === userEmail);
        if (allowed) return true;
        if (pathname.startsWith("/api/me/")) {
          return Response.json({ error: "Not found" }, { status: 404 });
        }
        return false;
      }

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
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }

      return true;
    },
  },
};
