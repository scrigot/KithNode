import "server-only";
import { auth } from "@/lib/auth";

export async function careerWorkspaceEmail() {
  const session = await auth();
  return session?.user?.email?.trim().toLowerCase() || null;
}
