import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();

  const svixId = req.headers.get("svix-id");
  const svixTimestamp = req.headers.get("svix-timestamp");
  const svixSignature = req.headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return NextResponse.json(
      { error: "Missing svix signature headers" },
      { status: 400 }
    );
  }

  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("[resend-webhook] RESEND_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: {
    type: string;
    created_at: string;
    data: {
      email_id: string;
      from: string;
      to: string[];
      subject: string;
      created_at: string;
      tags?: Record<string, string>;
      broadcast_id?: string;
    };
  };

  try {
    const wh = new Webhook(webhookSecret);
    event = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    }) as typeof event;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[resend-webhook] signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  const recipient = (event.data.to?.[0] ?? "").toLowerCase();
  console.log(`[resend-webhook] ${event.type} -> ${recipient}`);

  try {
    await prisma.emailEvent.create({
      data: {
        emailId: event.data.email_id,
        type: event.type,
        recipient,
        subject: event.data.subject ?? null,
        payload: JSON.parse(body) as object,
      },
    });
  } catch (error) {
    console.error("[resend-webhook] DB write failed:", error);
    return NextResponse.json(
      { error: "Failed to persist event" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
