import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { hashExtensionToken } from "@/lib/extension-auth";

const createSchema = z.object({ name: z.string().trim().min(1).max(100).default("Chrome extension") });
const revokeSchema = z.object({ id: z.string().min(1) });

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: tokens, error } = await supabase.from("ExtensionToken").select("id,name,scopes,expiresAt,revokedAt,lastUsedAt,createdAt").eq("userId", userId).order("createdAt", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  return NextResponse.json({ tokens });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid token name" }, { status: 400 });
  const raw = `knx_${randomBytes(32).toString("base64url")}`;
  const { data: token, error } = await supabase.from("ExtensionToken").insert({ id: randomBytes(16).toString("hex"), userId, name: parsed.data.name, tokenHash: hashExtensionToken(raw), scopes: "contacts:write profiles:write", createdAt: new Date().toISOString() }).select("*").single();
  if (error || !token) return NextResponse.json({ error: error?.message || "Could not create token" }, { status: 503 });
  return NextResponse.json({ id: token.id, token: raw, name: token.name, scopes: token.scopes, warning: "Copy this token now. KithNode stores only its hash and cannot show it again." }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = revokeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  const { data: updated, error } = await supabase.from("ExtensionToken").update({ revokedAt: new Date().toISOString() }).eq("id", parsed.data.id).eq("userId", userId).is("revokedAt", null).select("id");
  if (error) return NextResponse.json({ error: error.message }, { status: 503 });
  if (!updated?.length) return NextResponse.json({ error: "Token not found" }, { status: 404 });
  return NextResponse.json({ revoked: true });
}
