import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";

/**
 * Stripe webhook handler.
 *
 * Required Supabase migration (run via Supabase MCP):
 *
 * ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "stripeCustomerId" TEXT DEFAULT '';
 * ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionStatus" TEXT DEFAULT 'trial';
 * ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionPlan" TEXT DEFAULT '';
 * ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP DEFAULT NOW() + INTERVAL '7 days';
 * ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMP;
 */

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const plan = session.metadata?.plan || "";

        await supabase
          .from("User")
          .update({
            stripeCustomerId: customerId,
            subscriptionStatus: "active",
            subscriptionPlan: plan,
          })
          .eq("stripeCustomerId", customerId);

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const status = subscription.status === "active" ? "active" : subscription.status;
        // Get current period end from the first item's period
        const items = subscription.items?.data;
        const periodEnd = items?.[0]?.current_period_end;
        const currentPeriodEnd = periodEnd
          ? new Date(periodEnd * 1000).toISOString()
          : null;

        await supabase
          .from("User")
          .update({
            subscriptionStatus: status,
            subscriptionEndsAt: currentPeriodEnd,
          })
          .eq("stripeCustomerId", customerId);

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        await supabase
          .from("User")
          .update({
            subscriptionStatus: "churned",
            subscriptionPlan: "",
          })
          .eq("stripeCustomerId", customerId);

        break;
      }

      default:
        // Unhandled event type — log and acknowledge
        console.log(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
