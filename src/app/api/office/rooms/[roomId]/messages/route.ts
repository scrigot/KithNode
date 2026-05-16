// /api/office/rooms/:roomId/messages
//
// POST: append a user message, invoke the room's adapter, stream tokens via
//       Server-Sent Events. Persist final assistant message + emit
//       invoke_started/invoke_completed AgentEvent rows.
// GET:  fetch last 50 messages for the room (oldest first).

import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getAdapter } from "@/lib/agent-office/registry";
import type { AgentContext } from "@/lib/agent-office/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const HISTORY_LIMIT = 50;

async function loadRoomForUser(roomId: string, userId: string) {
  const room = await prisma.agentRoom.findUnique({ where: { id: roomId } });
  if (!room || room.userId !== userId) return null;
  return room;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { roomId } = await params;
  const room = await loadRoomForUser(roomId, session.user.email);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const messages = await prisma.agentMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
  });

  return NextResponse.json({
    messages: messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> },
) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.email;
  const { roomId } = await params;
  const room = await loadRoomForUser(roomId, userId);
  if (!room) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = (await req.json()) as { message?: string };
  const userMessage = (body.message || "").trim();
  if (!userMessage) {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Persist user message + invoke_started event before streaming.
  await prisma.agentMessage.create({
    data: { roomId: room.id, role: "user", content: userMessage },
  });
  await prisma.agentEvent.create({
    data: {
      userId,
      roomId: room.id,
      kind: "invoke_started",
      summary: `${room.name} is thinking...`,
    },
  });

  // Load recent history (excluding the message we just inserted) for the adapter.
  const recentMessages = await prisma.agentMessage.findMany({
    where: { roomId: room.id },
    orderBy: { createdAt: "asc" },
    take: HISTORY_LIMIT,
  });
  const history = recentMessages
    .slice(0, -1) // drop the message we just inserted
    .filter((m): m is typeof m & { role: "user" | "assistant" } =>
      m.role === "user" || m.role === "assistant",
    )
    .map((m) => ({ role: m.role, content: m.content }));

  const adapter = getAdapter(room.adapterType);
  const ctx: AgentContext = {
    roomId: room.id,
    roomSlug: room.slug,
    systemPrompt: room.systemPrompt,
    history,
    userMessage,
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let finalText = "";
      try {
        for await (const event of adapter.invoke(ctx)) {
          if (event.type === "token") {
            finalText += event.content;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "token", content: event.content })}\n\n`,
              ),
            );
          } else if (event.type === "done") {
            finalText = event.finalText || finalText;
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "done", finalText })}\n\n`,
              ),
            );
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "adapter error";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", message })}\n\n`,
          ),
        );
      } finally {
        // Persist final assistant message + completion event regardless of
        // how the stream ended (best-effort — agent may have errored).
        if (finalText) {
          await prisma.agentMessage.create({
            data: {
              roomId: room.id,
              role: "assistant",
              content: finalText,
            },
          });
        }
        const summary =
          finalText.length > 0
            ? `${room.name}: ${finalText.slice(0, 60)}${finalText.length > 60 ? "..." : ""}`
            : `${room.name}: (no response)`;
        await prisma.agentEvent.create({
          data: {
            userId,
            roomId: room.id,
            kind: "invoke_completed",
            summary,
          },
        });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}
