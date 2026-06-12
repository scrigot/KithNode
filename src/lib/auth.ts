import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Alpha gate: @unc.edu emails + whitelisted testers
      const ALLOWED_EMAILS = ["samrigot31@gmail.com", "samrigot@kithnode.ai"];
      if (
        !user.email.endsWith("@unc.edu") &&
        !user.email.endsWith("@ad.unc.edu") &&
        !ALLOWED_EMAILS.includes(user.email)
      ) {
        return false;
      }

      // Upsert user row so billing/settings routes can find the user.
      // ignoreDuplicates ensures defaults only land on first insert, not on
      // every sign-in (idempotent) — so existing users keep their status.
      // NO default trial: access is code-or-pay. A fresh user lands with
      // subscriptionStatus "none" (no access) and 0 credits until they redeem a
      // beta code or subscribe at the end of onboarding.
      const { supabase } = await import("./supabase");
      await supabase.from("User").upsert(
        {
          email: user.email,
          name: user.name ?? "",
          image: user.image ?? "",
          subscriptionStatus: "none",
        },
        { onConflict: "email", ignoreDuplicates: true }
      );

      return true;
    },
    async jwt({ token }) {
      // Use email as the user identifier (no DB lookup needed for alpha)
      if (token.email) {
        token.userId = token.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
  },
});
