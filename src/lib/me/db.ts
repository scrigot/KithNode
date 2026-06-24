// Prisma access for the /me workspace.
//
// Reuses the app's Prisma singleton (@/lib/db), which connects to DATABASE_URL.
// In the isolated dogfood setup DATABASE_URL points at a LOCAL Postgres
// (`supabase start` / a throwaway dev project) — never prod. This module is the
// single data entrypoint for /me; the ESLint boundary forbids importing the
// prod Supabase service-role client (@/lib/supabase) anywhere under /me, so the
// personal workspace can only ever touch the local DB.
import { prisma } from "@/lib/db";
import { meUserEmail } from "./config";

export { prisma, meUserEmail };
