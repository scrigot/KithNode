import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { isEmailAllowed } from "./auth-allowlist";
import { TRIAL_CREDITS } from "./credit-costs";
import { KITH_NODES_ENABLED } from "./kith/flags";

export { isEmailAllowed };

// Cookie name written by /sign-in page when an invite link is followed.
const INVITER_COOKIE = "kith_inviter";

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
          credits: TRIAL_CREDITS,
        },
        { onConflict: "email", ignoreDuplicates: true }
      );
      if (error) {
        console.error("[auth] User upsert failed:", error);
      }

      // Auto-friend: if the new user arrived via a Kith invite link, create an
      // accepted Friendship immediately. Gated behind KITH_NODES_ENABLED. Safe
      // to run on every sign-in — findBetween / upsert logic in createKithFriendship
      // is idempotent and no-ops if a Friendship row already exists.
      if (KITH_NODES_ENABLED && user.email) {
        try {
          const { cookies } = await import("next/headers");
          const jar = await cookies();
          const inviterEmail = jar.get(INVITER_COOKIE)?.value?.trim().toLowerCase();
          if (inviterEmail && inviterEmail !== user.email.toLowerCase()) {
            const { createKithFriendship } = await import("./kith/friendships");
            await createKithFriendship(inviterEmail, user.email);
            // Clear the cookie so re-logins don't re-trigger.
            jar.delete(INVITER_COOKIE);
          }
        } catch (err) {
          // Non-fatal: log and proceed. The user is still signed in.
          console.error("[auth] kith auto-friend failed:", err);
        }
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
