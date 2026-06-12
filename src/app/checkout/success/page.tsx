import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { getStripe } from "@/lib/stripe";
import { CREDIT_ALLOTMENTS } from "@/lib/credit-costs";

/**
 * Stripe success landing. Lives OUTSIDE /dashboard so the subscription gate
 * can't bounce a user whose activating webhook hasn't landed yet.
 *
 * Stripe's recommended pattern is to fulfill on BOTH the success redirect and
 * the webhook, idempotently. We verify the Checkout Session server-side, and
 * if it's genuinely paid AND belongs to the signed-in user, we apply the same
 * activation the webhook applies (stripe/webhook checkout.session.completed)
 * keyed by email, then send them to the dashboard. The webhook stays
 * authoritative; running the same absolute update twice is a no-op.
 */
async function activatePaidSession(
  sessionId: string,
  email: string,
): Promise<boolean> {
  try {
    const checkout = await getStripe().checkout.sessions.retrieve(sessionId);
    const paid =
      checkout.payment_status === "paid" || checkout.status === "complete";
    const sessionEmail =
      checkout.customer_details?.email || checkout.metadata?.userId || "";
    const ownedByUser =
      !!sessionEmail && sessionEmail.toLowerCase() === email.toLowerCase();
    if (!paid || !ownedByUser) return false;

    const plan = checkout.metadata?.plan || "";
    const allotment =
      CREDIT_ALLOTMENTS[plan === "annual" ? "annual" : "monthly"];
    const renewAt = new Date();
    renewAt.setMonth(renewAt.getMonth() + 1);

    await supabase
      .from("User")
      .update({
        stripeCustomerId: (checkout.customer as string) ?? undefined,
        subscriptionStatus: "active",
        subscriptionPlan: plan,
        creditsMonthlyAllotment: allotment,
        credits: allotment,
        creditsRenewAt: renewAt.toISOString(),
      })
      .eq("email", email);

    return true;
  } catch (err) {
    console.error("[checkout/success] verify failed:", err);
    return false;
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const authSession = await auth();
  const email = authSession?.user?.email;

  // redirect() throws to unwind, so it must run OUTSIDE the verify try/catch.
  const activated =
    email && sessionId ? await activatePaidSession(sessionId, email) : false;

  redirect(activated ? "/dashboard" : "/onboarding?activate=1");
}
