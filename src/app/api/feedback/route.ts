import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { isFounder } from "@/lib/founder";
import { sendFounderFeedbackAlert } from "@/lib/resend";

const MAX_MESSAGE_LEN = 2000;

/** POST: any signed-in user sends a help/feedback message to the founder. */
export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email;

  let body: { message?: unknown; page?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return NextResponse.json(
      { error: `Message too long (${MAX_MESSAGE_LEN} max)` },
      { status: 400 },
    );
  }
  const page = typeof body.page === "string" ? body.page.slice(0, 200) : "";

  const { error } = await supabase
    .from("Feedback")
    .insert({ userEmail: email, page, message });

  if (error) {
    console.error("Feedback insert error:", error.message);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }

  // Best-effort email alert: the message is already stored, so a Resend
  // failure must never fail the request.
  await sendFounderFeedbackAlert({ fromEmail: email, page, message }).catch(
    () => {},
  );

  return NextResponse.json({ ok: true });
}

/** GET: founder inbox — latest messages, newest first. */
export async function GET() {
  const session = await auth();
  if (!isFounder(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("Feedback")
    .select("*")
    .order("createdAt", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ feedback: data ?? [] });
}

/** PATCH: founder toggles a message between new and done. */
export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!isFounder(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}) as Record<string, unknown>);
  const id = typeof body.id === "string" ? body.id : "";
  const status =
    body.status === "done" ? "done" : body.status === "new" ? "new" : "";
  if (!id || !status) {
    return NextResponse.json({ error: "id and status (new|done) required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("Feedback")
    .update({ status })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
