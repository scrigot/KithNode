"use client";

import { useState, useEffect } from "react";
import {
  CreditCard,
  Check,
  Sparkles,
  Loader2,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { apiFetch } from "@/lib/api-client";

type PlanType = "monthly" | "annual";

interface BillingData {
  subscription_status: "trial" | "active" | "past_due" | "canceled" | string;
  subscription_plan: "monthly" | "annual" | null;
  subscription_ends_at: string | null;
  trial_ends_at: string | null;
  trial_days_left: number | null;
  has_stripe_customer: boolean;
  referral_count: number;
  pipeline_total: number;
  ratings: { high_value: number; total: number };
  stats: { contacts: number };
}

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
    badge: "Flexible",
    buttonText: "Subscribe · $15/mo",
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
    trialBadge: "7-Day Free Trial",
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

function formatDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export default function BillingPage() {
  const [loading, setLoading] = useState<PlanType | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [data, setData] = useState<BillingData | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/api/dashboard/overview")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) setData(d);
      })
      .catch(() => {});
  }, []);

  const status = data?.subscription_status ?? "trial";
  const plan = data?.subscription_plan ?? null;
  const isActive = status === "active" && !!plan;
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";
  const trialDaysLeft = data?.trial_days_left ?? null;
  const isFreeTier =
    !isActive &&
    !isPastDue &&
    !isCanceled &&
    !(status === "trial" && trialDaysLeft != null && trialDaysLeft > 0);
  const periodEnd =
    data?.subscription_ends_at ||
    data?.trial_ends_at ||
    null;

  async function handleCheckout(plan: PlanType) {
    setLoading(plan);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        setCheckoutError(d.error || "Unable to start checkout. Please try again.");
        setLoading(null);
      }
    } catch {
      setCheckoutError(
        "Unable to reach payment server. Check your connection and try again.",
      );
      setLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const d = await res.json();
      if (d.url) {
        window.location.href = d.url;
      } else {
        setCheckoutError(d.error || "Unable to open billing portal.");
        setPortalLoading(false);
      }
    } catch {
      setCheckoutError("Unable to reach billing portal.");
      setPortalLoading(false);
    }
  }

  const statusBadge = (() => {
    if (isActive) {
      return {
        label: "ACTIVE",
        className: "border-green-500/30 bg-green-500/10 text-green-400",
        icon: <CheckCircle2 className="h-3 w-3" />,
      };
    }
    if (isPastDue) {
      return {
        label: "PAST DUE",
        className: "border-red-500/30 bg-red-500/10 text-red-400",
        icon: <AlertTriangle className="h-3 w-3" />,
      };
    }
    if (isCanceled) {
      return {
        label: "CANCELED",
        className: "border-zinc-500/30 bg-zinc-500/10 text-zinc-400",
        icon: <Clock className="h-3 w-3" />,
      };
    }
    if (isFreeTier) {
      return {
        label: "FREE TIER",
        className: "border-amber-500/30 bg-amber-500/10 text-amber-400",
        icon: <Clock className="h-3 w-3" />,
      };
    }
    return {
      label: `TRIAL${trialDaysLeft != null ? ` · ${trialDaysLeft}d left` : ""}`,
      className: "border-accent-teal/30 bg-accent-teal/10 text-accent-teal",
      icon: <Sparkles className="h-3 w-3" />,
    };
  })();

  return (
    <div className="flex min-h-full flex-col p-5">
      {/* Header */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
            BILLING
          </h2>
          <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
            Subscription + usage
          </p>
        </div>
        <span
          className={`flex items-center gap-1.5 border px-2 py-1 text-[9px] font-bold uppercase tracking-wider ${statusBadge.className}`}
        >
          {statusBadge.icon}
          {statusBadge.label}
        </span>
      </div>

      <div className="mt-3 h-px bg-border" />

      {/* Status strip: plan + renewal + actions */}
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="border border-white/[0.06] bg-card px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Current Plan
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <CreditCard className="h-4 w-4 shrink-0 text-accent-teal" />
            <span className="text-[15px] font-bold text-foreground">
              {isActive
                ? plan === "annual"
                  ? "Annual · $120/yr"
                  : "Monthly · $15/mo"
                : isCanceled
                  ? "Canceled"
                  : "Free Trial"}
            </span>
          </div>
          {isActive && plan === "annual" && (
            <p className="mt-0.5 text-[10px] text-muted-foreground">
              Effective $10/mo billed annually
            </p>
          )}
        </div>

        <div className="border border-white/[0.06] bg-card px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            {isActive ? "Renews" : "Trial Ends"}
          </p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums text-foreground">
            {periodEnd ? formatDate(periodEnd) : "—"}
          </p>
          {trialDaysLeft != null && status === "trial" && (
            <p
              className={`mt-0.5 text-[10px] ${
                trialDaysLeft <= 2
                  ? "text-accent-amber"
                  : "text-muted-foreground"
              }`}
            >
              {trialDaysLeft} {trialDaysLeft === 1 ? "day" : "days"} remaining
            </p>
          )}
        </div>

        <div className="flex flex-col border border-white/[0.06] bg-card px-4 py-3">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Manage
          </p>
          {isActive || data?.has_stripe_customer ? (
            <button
              onClick={handlePortal}
              disabled={portalLoading}
              className="mt-1 flex items-center justify-center gap-1.5 border border-white/[0.12] bg-muted py-1.5 text-[11px] font-bold uppercase tracking-wider text-foreground transition-colors hover:bg-white/[0.08] disabled:opacity-50"
            >
              {portalLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CreditCard className="h-3 w-3" />
              )}
              Stripe Portal
            </button>
          ) : (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Start a subscription to open the billing portal.
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {checkoutError && (
        <div className="mt-3 flex items-start gap-2 border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-400" />
          <p className="text-[11px] text-amber-400">{checkoutError}</p>
        </div>
      )}

      {/* Usage strip */}
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <div className="border border-white/[0.06] bg-card px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Discovered
          </p>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-foreground">
            {data?.stats.contacts ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            total contacts
          </p>
        </div>
        <div className="border border-white/[0.06] bg-card px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Warm Signals
          </p>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-accent-green">
            {data?.ratings.high_value ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            hot + warm
          </p>
        </div>
        <div className="border border-white/[0.06] bg-card px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            In Pipeline
          </p>
          <p className="mt-0.5 font-mono text-lg font-bold tabular-nums text-accent-teal">
            {data?.pipeline_total ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            active outreach
          </p>
        </div>
        <div className="border border-white/[0.06] bg-card px-3 py-2">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground/60">
            Referrals
          </p>
          <p className="mt-0.5 flex items-baseline gap-1 font-mono text-lg font-bold tabular-nums text-accent-blue">
            <Users className="h-3 w-3" />
            {data?.referral_count ?? 0}
          </p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            signed up from your link
          </p>
        </div>
      </div>

      {/* Past due banner */}
      {isPastDue && (
        <div className="mt-3 flex items-center gap-2 border border-red-500/30 bg-red-500/5 px-3 py-2">
          <AlertTriangle className="h-3 w-3 shrink-0 text-red-400" />
          <p className="flex-1 text-[11px] text-red-400">
            Your last payment failed. Update your card in the Stripe portal to
            keep access.
          </p>
          <button
            onClick={handlePortal}
            className="border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/20"
          >
            Update Card
          </button>
        </div>
      )}

      {/* Pricing cards */}
      <div className="mt-4 flex items-center gap-2">
        <Sparkles className="h-3 w-3 text-accent-teal" />
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-accent-teal">
          {isActive ? "Change Plan" : "Choose Your Plan"}
        </h3>
      </div>

      <div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-2">
        {PLANS.map((p) => {
          const isCurrentPlan = isActive && plan === p.id;
          const isLoading = loading === p.id;
          const isAnnual = p.id === "annual";

          return (
            <div
              key={p.id}
              className={`relative flex flex-col border bg-card ${
                isAnnual
                  ? "border-accent-teal/40 shadow-[0_0_20px_-4px_rgba(14,165,233,0.15)]"
                  : "border-white/[0.08]"
              }`}
            >
              {p.trialBadge && (
                <div className="absolute right-3 top-3 bg-accent-teal px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                  {p.trialBadge}
                </div>
              )}

              <div className="border-b border-white/[0.06] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  {p.name}
                </p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold text-foreground">
                    {p.price}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    /{isAnnual ? "yr" : "mo"}
                  </span>
                  {p.badge && (
                    <span
                      className={`ml-auto px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isAnnual
                          ? "bg-accent-teal/15 text-accent-teal"
                          : "border border-white/[0.1] text-muted-foreground"
                      }`}
                    >
                      {p.badge}
                    </span>
                  )}
                </div>
                {isAnnual && (
                  <p className="mt-0.5 text-[10px] text-accent-teal">
                    {p.perMonth} billed annually
                  </p>
                )}
              </div>

              <ul className="flex-1 space-y-1.5 px-4 py-3">
                {p.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2 text-[12px] text-muted-foreground"
                  >
                    <Check className="h-3 w-3 shrink-0 text-accent-teal" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="border-t border-white/[0.06] px-4 py-3">
                <button
                  onClick={() =>
                    isCurrentPlan ? handlePortal() : handleCheckout(p.id)
                  }
                  disabled={isLoading || (isCurrentPlan && portalLoading)}
                  className={`flex w-full items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    isCurrentPlan
                      ? "border border-white/[0.12] bg-muted text-muted-foreground"
                      : isAnnual
                        ? "bg-accent-teal text-white hover:bg-accent-teal/80"
                        : "border border-accent-teal/40 text-accent-teal hover:bg-accent-teal/10"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : isCurrentPlan ? (
                    "Current Plan"
                  ) : (
                    p.buttonText
                  )}
                </button>
                {p.buttonSubtext && !isCurrentPlan && (
                  <p className="mt-1 text-center text-[10px] text-muted-foreground">
                    {p.buttonSubtext}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fine print */}
      <div className="mt-3 border border-white/[0.06] bg-card px-4 py-3">
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          The annual plan includes a 7-day free trial. You won&apos;t be charged
          until the trial ends. The monthly plan is charged immediately. Cancel
          anytime from the Stripe portal. Payments are securely processed by
          Stripe.
        </p>
      </div>
    </div>
  );
}
