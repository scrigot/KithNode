// Personal "/me" workspace config.
//
// PERSONAL_MODE gates the ENTIRE /me surface (routes + nav) so it can never
// render for production users — even if this code ships to prod, the flag is
// off there. ME_USER_EMAIL is the single dogfood owner whose data the workspace
// scopes to (userId == email, matching the rest of the app's convention).
//
// Isolation note: /me reads/writes via Prisma against DATABASE_URL, which in the
// dogfood setup points at a LOCAL Postgres (supabase start / dev project), never
// prod. An ESLint boundary (eslint.config.mjs) forbids importing the prod
// Supabase client anywhere under /me.

export const PERSONAL_MODE =
  process.env.PERSONAL_MODE === "true" || process.env.PERSONAL_MODE === "1";

export function meUserEmail(): string {
  return process.env.ME_USER_EMAIL || "samrigot@kithnode.ai";
}
