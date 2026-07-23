import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env/server";
import {
  jobSourceCreateSchema,
  listJobSources,
  saveJobSource,
} from "@/lib/jobs/source-service";

export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const sources = await listJobSources(userId);
    return NextResponse.json({
      sources,
      searchConfigured: Boolean(serverEnv().BRAVE_SEARCH_API_KEY),
      discoveryEnabled: serverEnv().ENABLE_JOB_DISCOVERY !== "false",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not load job sources" }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = jobSourceCreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid job source", issues: parsed.error.issues }, { status: 400 });
  try {
    const source = await saveJobSource(userId, parsed.data);
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not save job source" }, { status: 400 });
  }
}
