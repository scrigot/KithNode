import { auth } from "@/lib/auth";

/**
 * Returns the authenticated user's email (used as userId), or null when not signed in.
 * Route handlers MUST check for null and return 401 before performing any reads.
 */
export async function getUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.email ?? null;
}

/** Throws when no session exists. Convenience for handlers that prefer try/catch. */
export async function getUserIdOrThrow(): Promise<string> {
  const userId = await getUserId();
  if (!userId) throw new Error("Unauthorized");
  return userId;
}
