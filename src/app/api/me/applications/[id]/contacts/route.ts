import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";

export const runtime = "nodejs";

async function scopedApplication(userId: string, id: string) {
  return prisma.meInternshipApplication.findFirst({ where: { id, userId }, select: { id: true, company: true } });
}

async function scopedContact(userId: string, contactId: string) {
  return prisma.meContact.findFirst({ where: { id: contactId, userId }, select: { id: true, name: true } });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const contactId = typeof body.contactId === "string" ? body.contactId.trim() : "";
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const [application, contact] = await Promise.all([scopedApplication(userId, id), scopedContact(userId, contactId)]);
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  if (!contact) return NextResponse.json({ error: "Contact not found" }, { status: 404 });

  const link = await prisma.meApplicationContact.upsert({
    where: { userId_applicationId_contactId: { userId, applicationId: id, contactId } },
    create: { userId, applicationId: id, contactId },
    update: {},
    include: { contact: { select: { id: true, name: true, firmName: true, title: true, linkedInUrl: true } } },
  });
  await prisma.meApplicationEvent.create({
    data: {
      userId,
      applicationId: id,
      type: "contact_attached",
      title: "Attached contact",
      detail: contact.name,
      meta: { contactId },
    },
  });
  return NextResponse.json({ link }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const userId = meUserEmail();
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const contactId = typeof body.contactId === "string" ? body.contactId.trim() : "";
  if (!contactId) return NextResponse.json({ error: "contactId required" }, { status: 400 });

  const application = await scopedApplication(userId, id);
  if (!application) return NextResponse.json({ error: "Application not found" }, { status: 404 });
  const res = await prisma.meApplicationContact.deleteMany({ where: { userId, applicationId: id, contactId } });
  if (res.count === 0) return NextResponse.json({ error: "Contact link not found" }, { status: 404 });
  await prisma.meApplicationEvent.create({
    data: {
      userId,
      applicationId: id,
      type: "contact_detached",
      title: "Removed contact",
      detail: contactId,
      meta: { contactId },
    },
  });
  return NextResponse.json({ ok: true });
}
