import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { grantCredits } from "@/lib/credits";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userEmail = session.user.email;

  const body = await req.json().catch(() => ({}));
  const raw: unknown = body?.code;
  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }
  const code = raw.trim().toUpperCase();

  const { data: promo } = await supabase
    .from("PromoCode")
    .select("id, code, days, credits, plan, redeemedByEmail, redeemedAt")
    .eq("code", code)
    .maybeSingle();

  if (!promo) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  if (promo.redeemedByEmail) {
    if (promo.redeemedByEmail !== userEmail) {
      return NextResponse.json({ error: "Code already used" }, { status: 400 });
    }
    // Already redeemed by this user — idempotent
    return NextResponse.json({ ok: true, alreadyRedeemed: true });
  }

  // Conditional update: only succeeds if redeemedByEmail is still null.
  // This prevents double-grant from concurrent requests.
  const now = new Date().toISOString();
  const { data: updated } = await supabase
    .from("PromoCode")
    .update({ redeemedByEmail: userEmail, redeemedAt: now })
    .eq("id", promo.id)
    .is("redeemedByEmail", null)
    .select("id")
    .maybeSingle();

  if (!updated) {
    // Lost the race — another concurrent request already claimed it
    return NextResponse.json({ error: "Code already used" }, { status: 400 });
  }

  const trialEndsAt =
    promo.plan === "trial"
      ? new Date(Date.now() + promo.days * 86_400_000).toISOString()
      : null;

  await supabase
    .from("User")
    .update({
      subscriptionStatus: promo.plan === "trial" ? "trial" : "active",
      ...(trialEndsAt ? { trialEndsAt } : {}),
    })
    .eq("email", userEmail);

  const balance = await grantCredits(userEmail, promo.credits);

  return NextResponse.json({
    ok: true,
    daysGranted: promo.days,
    creditsGranted: promo.credits,
    balance,
  });
}
