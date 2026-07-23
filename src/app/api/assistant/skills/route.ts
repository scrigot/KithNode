import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CAREER_SKILLS } from "@/lib/assistant/skills";
import { serverEnv } from "@/lib/env/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    enabled: serverEnv().ENABLE_CAREER_SKILLS !== "false",
    discoveryEnabled: serverEnv().ENABLE_JOB_DISCOVERY !== "false",
    searchConfigured: Boolean(serverEnv().BRAVE_SEARCH_API_KEY),
    skills: CAREER_SKILLS,
  });
}
