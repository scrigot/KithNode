import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { error: "Deprecated endpoint", replacement: "/api/contacts/rescore" },
    { status: 410 },
  );
}
