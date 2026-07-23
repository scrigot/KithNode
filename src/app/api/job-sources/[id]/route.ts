import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { jobSourcePatchSchema, removeJobSource, updateJobSource } from "@/lib/jobs/source-service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = jobSourcePatchSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job source update", issues: parsed.error.issues }, { status: 400 });
  try {
    const { id } = await params;
    const source = await updateJobSource(userId, id, parsed.data);
    if (!source) return NextResponse.json({ error: "Job source not found" }, { status: 404 });
    return NextResponse.json({ source });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not update job source" }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const { id } = await params;
    const removed = await removeJobSource(userId, id);
    return removed
      ? NextResponse.json({ deleted: true })
      : NextResponse.json({ error: "Job source not found" }, { status: 404 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not remove job source" }, { status: 503 });
  }
}
