import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getJobSource, testJobSource } from "@/lib/jobs/source-service";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  try {
    const source = await getJobSource(userId, id);
    if (!source) return NextResponse.json({ error: "Job source not found" }, { status: 404 });
    const result = await testJobSource(userId, source);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not test job source" }, { status: 503 });
  }
}
