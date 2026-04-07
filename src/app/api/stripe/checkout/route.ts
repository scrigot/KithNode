import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getStripe, STRIPE_PRICES, TRIAL_DAYS } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const plan = body.plan as "monthly" | "annual";

  if (!plan || !["monthly", "annual"].includes(plan)) {
    return NextResponse.json(
      { error: "Invalid plan. Must be 'monthly' or 'annual'." },
      { status: 400 }
    );
  }

  const priceId = STRIPE_PRICES[plan];
  console.log("Stripe checkout priceId:", priceId, "plan:", plan);
  if (!priceId) {
    return NextResponse.json(
      { error: "Stripe price not configured for this plan." },
      { status: 500 }
    );
  }

  try {
    // Look up or create Stripe customer
    let stripeCustomerId: string | null = null;

    const userEmail = session.user.email;
    if (!userEmail) {
      return NextResponse.json({ error: "Missing user email" }, { status: 400 });
    }

    const { data: user } = await supabase
      .from("User")
      .select("stripeCustomerId")
      .eq("email", userEmail)
      .single();

    if (user?.stripeCustomerId) {
      stripeCustomerId = user.stripeCustomerId;
    } else {
      const customer = await getStripe().customers.create({
        email: userEmail,
        metadata: { userId: userEmail },
      });
      stripeCustomerId = customer.id;

      await supabase
        .from("User")
        .update({ stripeCustomerId: customer.id })
        .eq("email", userEmail);
    }

    const origin = req.nextUrl.origin;

    const checkoutSession = await getStripe().checkout.sessions.create({
      customer: stripeCustomerId || undefined,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      ...(plan === "annual"
        ? { subscription_data: { trial_period_days: TRIAL_DAYS } }
        : {}),
      success_url: `${origin}/dashboard?checkout=success`,
      cancel_url: `${origin}/dashboard/billing`,
      metadata: {
        userId: userEmail,
        plan,
      },
    });

    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("Stripe checkout error:", msg);
    return NextResponse.json(
      { error: "Failed to create checkout session", detail: msg },
      { status: 500 }
    );
  }
}
