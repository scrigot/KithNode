import "server-only";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

export interface ExtensionIdentity {
  userId: string;
  email: string;
  mode: "session" | "token";
}

export const hashExtensionToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function extensionIdentity(request: NextRequest, requiredScope: "contacts:write" | "profiles:write"): Promise<ExtensionIdentity | null> {
  const session = await auth();
  if (session?.user?.id && session.user.email) return { userId: session.user.id, email: session.user.email, mode: "session" };
  const raw = (request.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (!raw || raw.length < 32 || raw.length > 500) return null;
  const { data: token } = await supabase.from("ExtensionToken").select("*").eq("tokenHash", hashExtensionToken(raw)).maybeSingle();
  if (!token || token.revokedAt || (token.expiresAt && new Date(token.expiresAt) <= new Date())) return null;
  if (!token.scopes.split(/\s+/).includes(requiredScope)) return null;
  const { data: user } = await supabase.from("User").select("email").eq("id", token.userId).maybeSingle();
  if (!user) return null;
  await supabase.from("ExtensionToken").update({ lastUsedAt: new Date().toISOString() }).eq("id", token.id).eq("userId", token.userId);
  return { userId: token.userId, email: user.email, mode: "token" };
}
