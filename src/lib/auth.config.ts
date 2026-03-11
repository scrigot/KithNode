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
};
