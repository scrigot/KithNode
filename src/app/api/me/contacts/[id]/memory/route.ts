import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";

export const runtime = "nodejs";

const REL_TYPES = ["", "buyer", "practitioner", "ecosystem"];
const cleanActionItems = (items: unknown[]) =>
  items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 25);

// Upsert the per-contact memory layer (relationship type drives ICP ranking;
// strategic value / notes / action items feed coffee-prep later).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id: contactId } = await params;

  const contact = await prisma.meContact.findFirst({ where: { id: contactId, userId } });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const data: {
    relationshipType?: string;
    strategicValue?: string;
    notes?: string;
    actionItems?: Prisma.InputJsonValue;
  } = {};
  if (typeof body.relationshipType === "string" && REL_TYPES.includes(body.relationshipType)) {
    data.relationshipType = body.relationshipType;
  }
  if (typeof body.strategicValue === "string") data.strategicValue = body.strategicValue;
  if (typeof body.notes === "string") data.notes = body.notes;
  if (Array.isArray(body.actionItems)) data.actionItems = cleanActionItems(body.actionItems) as Prisma.InputJsonValue;
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const memory = await prisma.meContactMemory.upsert({
    where: { contactId },
    create: { userId, contactId, ...data },
    update: data,
  });
  return NextResponse.json({ memory });
}
