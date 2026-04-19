import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { supabase } from "./supabase";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false;

      // Alpha gate: @unc.edu emails + whitelisted testers
      const ALLOWED_EMAILS = ["samrigot31@gmail.com"];
      if (!user.email.endsWith("@unc.edu") && !ALLOWED_EMAILS.includes(user.email)) {
        return false;
      }

      // Upsert user row so billing/settings routes can find the user
      await supabase.from("User").upsert(
        { email: user.email, name: user.name ?? "", image: user.image ?? "" },
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
