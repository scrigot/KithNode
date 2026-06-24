import { NextRequest, NextResponse } from "next/server";
import { PERSONAL_MODE, meUserEmail } from "@/lib/me/config";
import { prisma } from "@/lib/me/db";
import { parseLinkedInCsv } from "@/lib/me/linkedin-csv";

// Imports a LinkedIn Connections.csv into MeContact (local Postgres only — the
// ESLint boundary forbids the prod Supabase client here). Idempotent: rows with
// a URL upsert on (userId, linkedInUrl); URL-less rows dedupe by name. Re-running
// the same export does not create duplicates.

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!PERSONAL_MODE) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const userId = meUserEmail();
  let csv: string;
  try {
    const body = await req.json();
    csv = body?.csv;
  } catch {
    return NextResponse.json({ error: "Expected JSON { csv }" }, { status: 400 });
  }
  if (!csv || typeof csv !== "string") {
    return NextResponse.json({ error: "Missing csv text" }, { status: 400 });
  }

  const { rows, skipped, headerFound } = parseLinkedInCsv(csv);
  if (!headerFound) {
    return NextResponse.json(
      { error: "Could not find the LinkedIn header row (First Name, URL …). Is this a Connections.csv export?" },
      { status: 422 },
    );
  }

  let created = 0;
  let updated = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const r of rows) {
    const data = {
      userId,
      name: r.name,
      firmName: r.firmName || null,
      title: r.title || null,
      email: r.email || null,
      connectedOn: r.connectedOn ? new Date(r.connectedOn) : null,
      source: "linkedin_csv",
    };
    try {
      if (r.linkedInUrl) {
        const res = await prisma.meContact.upsert({
          where: { userId_linkedInUrl: { userId, linkedInUrl: r.linkedInUrl } },
          create: { ...data, linkedInUrl: r.linkedInUrl },
          update: data, // refresh firm/title/email/connectedOn on re-import
        });
        // upsert can't tell us created vs updated directly; check createdAt≈now.
        if (Date.now() - new Date(res.createdAt).getTime() < 5000) created++;
        else updated++;
      } else {
        // No URL → dedupe by name among URL-less rows for this user.
        const existing = await prisma.meContact.findFirst({
          where: { userId, name: r.name, linkedInUrl: null },
        });
        if (existing) {
          await prisma.meContact.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await prisma.meContact.create({ data: { ...data, linkedInUrl: null } });
          created++;
        }
      }
    } catch (e) {
      failed++;
      if (errors.length < 20) errors.push(`${r.name}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({
    total: rows.length,
    created,
    updated,
    failed,
    skipped,
    errors,
  });
}
