import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { CAREER_SKILLS } from "@/lib/assistant/skills";
import { serverEnv } from "@/lib/env/server";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  return NextResponse.json({
    enabled: serverEnv().ENABLE_CAREER_SKILLS !== "false",
    skills: CAREER_SKILLS,
  });
}
