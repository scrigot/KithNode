import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { generateMeText } from "@/lib/me/ai";
import { buildEnrichPrompt, parseEnrich, mergeMemory } from "@/lib/me/enrich-chat";

export const runtime = "nodejs";

// A chatbot enrichment turn. Stores Sam's message append-only, asks the model to
// extract structured facts, then a DETERMINISTIC merge updates MeContactMemory.
// The model never writes memory; raw notes are never executed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id: contactId } = await params;

  const { message } = await req.json().catch(() => ({}));
  if (!message || typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const contact = await prisma.meContact.findFirst({
    where: { id: contactId, userId },
    include: {
      memory: true,
      enrichmentNotes: { orderBy: { createdAt: "desc" }, take: 8 },
    },
  });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  // 1) Store the raw user turn (append-only, never executed).
  const userNote = await prisma.meContactNote.create({
    data: { userId, contactId, author: "user", kind: "chat", content: message.trim() },
  });

  // 2) Extract structured facts.
  const recent = [...contact.enrichmentNotes].reverse().map((n) => ({ author: n.author, content: n.content }));
  const gen = await generateMeText(
    buildEnrichPrompt({
      name: contact.name,
      title: contact.title || "",
      firmName: contact.firmName || "",
      currentNotes: contact.memory?.notes || "",
      currentStrategicValue: contact.memory?.strategicValue || "",
      currentRelationshipType: contact.memory?.relationshipType || "",
      recent,
      userMessage: message.trim(),
    }),
  );
  const ex = gen.ok ? parseEnrich(gen.text) : null;

  // 3) Store the assistant turn (+ what it extracted, for provenance).
  const reply = ex?.reply || "Saved.";
  const assistantNote = await prisma.meContactNote.create({
    data: {
      userId,
      contactId,
      author: ex ? "assistant" : "extractor",
      kind: "chat",
      content: reply,
      extracted: ex ? (ex as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });

  // 4) Deterministic merge into memory (only when we got a valid extraction).
  let memory = contact.memory;
  if (ex) {
    const merged = mergeMemory(
      {
        notes: contact.memory?.notes || "",
        strategicValue: contact.memory?.strategicValue || "",
        relationshipType: contact.memory?.relationshipType || "",
      },
      ex,
    );
    memory = await prisma.meContactMemory.upsert({
      where: { contactId },
      create: { userId, contactId, ...merged },
      update: merged,
    });
  }

  return NextResponse.json({
    reply,
    ai: Boolean(ex),
    memory,
    notes: [userNote, assistantNote],
  });
}
