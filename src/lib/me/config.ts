// Personal "/me" workspace config.
//
// PERSONAL_MODE gates the ENTIRE /me surface in local/dev environments. In
// production, /me is enabled by default and protected by the owner-email
// middleware gate so kithnode.ai/me can be Sam's private workspace.
// ME_USER_EMAIL is the single dogfood owner whose data the workspace scopes to
// (userId == email, matching the rest of the app's convention).
//
// Isolation note: /me reads/writes via Prisma against DATABASE_URL, which in the
// dogfood setup points at a LOCAL Postgres (supabase start / dev project), never
// prod. An ESLint boundary (eslint.config.mjs) forbids importing the prod
// Supabase client anywhere under /me.

export const PERSONAL_MODE =
  process.env.PERSONAL_MODE === "true" ||
  process.env.PERSONAL_MODE === "1" ||
  process.env.VERCEL_ENV === "production";

export function meUserEmail(): string {
  return process.env.ME_USER_EMAIL || "samrigot@kithnode.ai";
}
