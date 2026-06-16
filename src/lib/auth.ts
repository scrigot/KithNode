import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { isEmailAllowed } from "./auth-allowlist";

export { isEmailAllowed };

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      if (!isEmailAllowed(user.email)) return false;

      // Upsert user row so billing/settings routes can find the user.
      // ignoreDuplicates ensures defaults only land on first insert, not on
      // every sign-in (idempotent) — so existing users keep their status/credits.
      // Beta access: a fresh allowlisted user lands on a 7-day trial with a
      // starter credit bundle so they can actually use the product end to end.
      // trialEndsAt gets its now()+7d DB default on insert; checkSubscription
      // allows "trial" while that date is in the future. (Switch back to "none"
      // = code-or-pay for a paid launch.)
      const { supabase } = await import("./supabase");
      const { error } = await supabase.from("User").upsert(
        {
          email: user.email,
          name: user.name ?? "",
          image: user.image ?? "",
          subscriptionStatus: "trial",
          credits: 50,
        },
        { onConflict: "email", ignoreDuplicates: true }
      );
      if (error) {
        console.error("[auth] User upsert failed:", error);
      }

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
