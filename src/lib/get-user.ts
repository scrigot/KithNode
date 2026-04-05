import { auth } from "@/lib/auth";

export async function getUserId(): Promise<string> {
  const session = await auth();
  return session?.user?.email || "anonymous";
}
