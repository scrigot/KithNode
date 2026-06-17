import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getBalance } from "@/lib/credits";
import { supabase } from "@/lib/supabase";

export async function GET() {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [balance, userData] = await Promise.all([
    getBalance(email),
    supabase
      .from("User")
      .select("tutorialDoneAt")
      .eq("email", email)
      .maybeSingle(),
  ]);

  const { data: recentData } = await supabase
    .from("UsageEvent")
    .select("userEmail, action, credits, costUsd, createdAt, meta")
    .eq("userEmail", email)
    .order("createdAt", { ascending: false })
    .limit(50);

  return NextResponse.json({
    balance,
    tutorialDoneAt: userData.data?.tutorialDoneAt ?? null,
    recent: recentData ?? [],
  });
}
