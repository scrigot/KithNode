import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Edge-compatible middleware that only checks JWT session.
 * Does NOT import Prisma — uses the lightweight auth.config.
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: ["/dashboard/:path*"],
};
