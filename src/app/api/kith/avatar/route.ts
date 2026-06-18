import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { KITH_NODES_ENABLED } from "@/lib/kith/flags";

// Strict allowlist — raster formats only. SVG is excluded on purpose (it can
// carry script and is an XSS vector when served inline).
const ALLOWED: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/** GET — the current user's avatar + name (read fresh from the DB). */
export async function GET() {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Avatar is a display attribute on the User row; looked up by the stable id.
  const { data } = await supabase
    .from("User")
    .select("name, image")
    .eq("id", session.user.id)
    .maybeSingle();
  return NextResponse.json({ name: data?.name ?? "", image: data?.image ?? "" });
}

/** POST — upload a profile picture. multipart/form-data, field "file". */
export async function POST(req: NextRequest) {
  if (!KITH_NODES_ENABLED) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const session = await auth();
  if (!session?.user?.email || !session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = session.user.id;

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const ext = ALLOWED[file.type];
  if (!ext) {
    return NextResponse.json({ error: "Only PNG, JPEG, or WebP images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 2 MB" }, { status: 400 });
  }

  // Random, server-generated path — no user input in the object key (no path
  // traversal / overwrite of another user's object).
  const path = `${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: false });
  if (upErr) {
    console.error("[kith] avatar upload failed", upErr);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const publicUrl = supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl;

  const { error: dbErr } = await supabase.from("User").update({ image: publicUrl }).eq("id", userId);
  if (dbErr) {
    console.error("[kith] avatar db update failed", dbErr);
    return NextResponse.json({ error: "Failed to save avatar" }, { status: 500 });
  }

  return NextResponse.json({ image: publicUrl });
}
