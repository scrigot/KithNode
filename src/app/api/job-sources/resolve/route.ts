import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { serverEnv } from "@/lib/env/server";
import { jobSourceResolveSchema, resolveJobSources } from "@/lib/jobs/source-service";

export async function POST(request: NextRequest) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (serverEnv().ENABLE_JOB_DISCOVERY === "false") {
    return NextResponse.json({ error: "Job discovery is disabled", code: "job_discovery_disabled" }, { status: 503 });
  }
  const parsed = jobSourceResolveSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid companies", issues: parsed.error.issues }, { status: 400 });
  try {
    return NextResponse.json(await resolveJobSources(userId, parsed.data.companies, serverEnv().BRAVE_SEARCH_API_KEY));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not resolve job sources" }, { status: 503 });
  }
}
