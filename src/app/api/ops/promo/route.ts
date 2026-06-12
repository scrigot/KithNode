import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isFounder } from "@/lib/founder";
import { supabase } from "@/lib/supabase";
import { CREDIT_ALLOTMENTS } from "@/lib/credits";

// Unambiguous base32: no 0/O/1/I
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomCode(): string {
  let s = "KITH-";
  for (let i = 0; i < 4; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s;
}

function generateUniqueCodes(count: number): string[] {
  const seen = new Set<string>();
  while (seen.size < count) {
    seen.add(randomCode());
  }
  return [...seen];
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isFounder(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const count = Number(body?.count ?? 1);
  if (!Number.isInteger(count) || count < 1 || count > 200) {
    return NextResponse.json(
      { error: "count must be 1–200" },
      { status: 400 },
    );
  }
  const days: number = Number(body?.days ?? 7);
  const credits: number = Number(body?.credits ?? CREDIT_ALLOTMENTS.betaCode);
  const note: string = String(body?.note ?? "");

  const codes = generateUniqueCodes(count);
  const rows = codes.map((code) => ({ code, days, credits, note }));

  const { data, error } = await supabase
    .from("PromoCode")
    .insert(rows)
    .select("code, days, credits, note");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data });
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isFounder(session)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  void req;

  const { data, error } = await supabase
    .from("PromoCode")
    .select(
      "code, note, days, credits, redeemedByEmail, redeemedAt, createdAt",
    )
    .order("createdAt", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ codes: data });
}
