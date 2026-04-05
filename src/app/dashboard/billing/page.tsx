"use client";

import { useState } from "react";
import { CreditCard, Check, Sparkles, Loader2 } from "lucide-react";

type PlanType = "monthly" | "annual";

const PLANS: {
  id: PlanType;
  name: string;
  price: string;
  perMonth: string;
  badge?: string;
  trialBadge?: string;
  buttonText: string;
  buttonSubtext?: string;
  features: string[];
}[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$15",
    perMonth: "$15/mo",
    buttonText: "Subscribe — $15/mo",
    features: [
      "Unlimited warm signals",
      "AI outreach drafts",
      "Pipeline tracking",
      "LinkedIn import",
      "Priority support",
    ],
  },
  {
    id: "annual",
    name: "Annual",
    price: "$120",
    perMonth: "$10/mo",
    badge: "Save $60",
    trialBadge: "7-DAY FREE TRIAL",
    buttonText: "Start 7-day free trial",
    buttonSubtext: "then $120/yr ($10/mo)",
    features: [
      "Everything in Monthly",
      "2 months free",
      "Early access to new features",
      "Unlimited warm signals",
      "Priority support",
    ],
  },
];

export default function BillingPage() {
  const [loading, setLoading] = useState<PlanType | null>(null);

  // TODO: fetch real subscription status from API
  const subscriptionStatus: string = "trial";
  const subscriptionPlan: string = "";

  const isSubscribed =
    subscriptionStatus === "active" && !!subscriptionPlan;

  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handleCheckout(plan: PlanType) {
    setLoading(plan);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setCheckoutError(data.error || "Unable to start checkout. Please try again.");
        setLoading(null);
      }
    } catch {
      setCheckoutError("Unable to reach payment server. Check your connection and try again.");
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("monthly"); // reuse loading state
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("Portal error:", data.error);
        setLoading(null);
      }
    } catch (err) {
      console.error("Portal error:", err);
      setLoading(null);
    }
  }

  return (
    <div className="p-5">
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-white">Billing</h2>
        <p className="mt-1 text-sm text-text-secondary">
          Manage your subscription and billing details
        </p>
      </div>

      {/* Current Status */}
      <div className="mb-6 border border-white/[0.10] bg-bg-card p-5">
        <div className="flex items-center gap-3">
          <CreditCard size={20} className="text-accent-teal" />
          <div>
            <p className="text-[13px] font-medium text-white">
              {isSubscribed
                ? `${subscriptionPlan === "annual" ? "Annual" : "Monthly"} Plan`
                : "Free Trial"}
            </p>
            <p className="text-[12px] text-text-secondary">
              {isSubscribed
                ? "Your subscription is active"
                : "7 days remaining in your trial"}
            </p>
          </div>
        </div>
        {isSubscribed && (
          <button
            onClick={handlePortal}
            className="mt-4 border border-white/[0.10] bg-white/[0.04] px-4 py-2 text-[13px] font-medium text-white transition-all duration-150 hover:bg-white/[0.08]"
          >
            Manage Subscription
          </button>
        )}
      </div>

      {/* Checkout Error */}
      {checkoutError && (
        <div className="mb-4 border border-accent-amber/20 bg-accent-amber/5 p-4">
          <p className="text-sm font-medium text-accent-amber">{checkoutError}</p>
        </div>
      )}

      {/* Pricing Cards */}
      <div className="mb-4">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-accent-teal" />
          <h3 className="text-[11px] font-medium uppercase tracking-wider text-text-muted">
            Choose Your Plan
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {PLANS.map((plan) => {
          const isCurrentPlan =
            isSubscribed && subscriptionPlan === plan.id;
          const isLoading = loading === plan.id;

          return (
            <div
              key={plan.id}
              className={`relative border bg-bg-card p-6 transition-all duration-150 ${
                plan.id === "annual"
                  ? "border-accent-teal/40 shadow-[0_0_30px_-5px_rgba(14,165,233,0.15)]"
                  : "border-white/[0.10]"
              }`}
            >
              {/* Badges */}
              <div className="absolute right-4 top-4 flex flex-col items-end gap-1.5">
                {plan.trialBadge && (
                  <span className="bg-accent-teal px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                    {plan.trialBadge}
                  </span>
                )}
                {plan.badge && (
                  <span className="bg-accent-teal/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-accent-teal">
                    {plan.badge}
                  </span>
                )}
              </div>

              <h4 className="text-[13px] font-medium uppercase tracking-wider text-text-muted">
                {plan.name}
              </h4>

              <div className="mt-3 flex items-end gap-1.5">
                <span className="font-mono text-4xl font-bold text-white">
                  {plan.price}
                </span>
                <span className="mb-1 text-sm text-text-secondary">
                  /{plan.id === "annual" ? "yr" : "mo"}
                </span>
              </div>

              {plan.id === "annual" && (
                <p className="mt-1 text-[12px] text-accent-teal">
                  {plan.perMonth} billed annually
                </p>
              )}

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-2.5 text-[13px] text-text-secondary"
                  >
                    <Check
                      size={14}
                      className="shrink-0 text-accent-teal"
                    />
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <button
                  onClick={() =>
                    isCurrentPlan ? handlePortal() : handleCheckout(plan.id)
                  }
                  disabled={isLoading}
                  className={`flex w-full items-center justify-center gap-2 py-3 text-[13px] font-semibold transition-all duration-150 ${
                    isCurrentPlan
                      ? "border border-white/[0.10] bg-white/[0.04] text-text-secondary"
                      : plan.id === "annual"
                        ? "bg-accent-teal text-white hover:bg-accent-teal/90"
                        : "border border-accent-teal/40 text-accent-teal hover:bg-accent-teal/10"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : (
                    plan.buttonText
                  )}
                </button>
                {plan.buttonSubtext && !isCurrentPlan && (
                  <p className="mt-1.5 text-center text-[11px] text-text-muted">
                    {plan.buttonSubtext}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FAQ / Note */}
      <div className="mt-6 border border-white/[0.06] bg-bg-card p-5">
        <p className="text-[12px] text-text-muted leading-relaxed">
          The annual plan includes a 7-day free trial — you won&apos;t be
          charged until your trial ends. The monthly plan is charged
          immediately. Cancel anytime from the billing portal. Payments are
          securely processed by Stripe.
        </p>
      </div>
    </div>
  );
}
