import { NextRequest, NextResponse, after } from "next/server";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/lib/supabase";
import { CREDIT_ALLOTMENTS } from "@/lib/credits";
import { notifyFounder } from "@/lib/notify";
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

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook Error: ${message}` },
      { status: 400 }
    );
  }

  // Map raw Stripe subscription statuses to the app's narrower vocabulary.
  // UI in dashboard/billing only knows trial | active | past_due | canceled.
  function normalizeStatus(raw: Stripe.Subscription.Status): string {
    switch (raw) {
      case "active":
        return "active";
      case "trialing":
        return "trial";
      case "past_due":
        return "past_due";
      case "canceled":
      case "unpaid":
      case "incomplete_expired":
        return "canceled";
      case "incomplete":
        return "incomplete";
      case "paused":
        return "paused";
      default:
        return raw;
    }
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const plan = session.metadata?.plan || "";
        const userEmail = session.metadata?.userId || ""; // checkout writes email to metadata.userId

        // Activation also seeds the credit wallet: set the monthly allotment for
        // the plan, grant it in full now, and arm the renewal a month out (the
        // lazy refill in lib/credits advances it from there).
        const allotment =
          CREDIT_ALLOTMENTS[plan === "annual" ? "annual" : "monthly"];
        const renewAt = new Date();
        renewAt.setMonth(renewAt.getMonth() + 1);

        const update = {
          stripeCustomerId: customerId,
          subscriptionStatus: "active",
          subscriptionPlan: plan,
          creditsMonthlyAllotment: allotment,
          credits: allotment,
          creditsRenewAt: renewAt.toISOString(),
        };

        // Primary lookup by stripeCustomerId; fall back to email if no match
        // (covers customers created out-of-band via portal/dashboard/import).
        const { data: byCustomer } = await supabase
          .from("User")
          .update(update)
          .eq("stripeCustomerId", customerId)
          .select("id");

        if ((!byCustomer || byCustomer.length === 0) && userEmail) {
          await supabase.from("User").update(update).eq("email", userEmail);
        }

        // Best-effort founder ping on a new paid subscription. Deferred via
        // after() so a slow Slack POST never blocks the webhook ack — Stripe
        // would otherwise time out and retry, duplicating the credit grant.
        after(() =>
          notifyFounder({
            event: "subscription",
            title: "💸 New subscription",
            lines: [userEmail || customerId, `Plan: ${plan || "—"}`],
          }).catch(() => {}),
        );

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const status = normalizeStatus(subscription.status);
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

        // Best-effort founder ping on churn. Deferred via after() so it never
        // blocks the webhook ack (see above).
        after(() =>
          notifyFounder({
            event: "subscription",
            title: "📉 Subscription canceled",
            lines: [`Stripe customer: ${customerId}`],
          }).catch(() => {}),
        );

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
