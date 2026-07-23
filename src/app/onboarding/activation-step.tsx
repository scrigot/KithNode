"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, KeyRound, Loader2, Lock, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { trackEvent } from "@/lib/posthog";

type PlanType = "monthly" | "annual";

const PLANS: {
  id: PlanType;
  name: string;
  price: string;
  cadence: string;
  sub: string;
  badge: string;
  cta: string;
  highlight: boolean;
  features: string[];
}[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: "$15",
    cadence: "/mo",
    sub: "Billed monthly, cancel anytime",
    badge: "Flexible",
    cta: "Subscribe · $15/mo",
    highlight: false,
    features: [
      "Unlimited warm signals",
      "AI outreach drafts",
      "Pipeline tracking",
      "LinkedIn import",
    ],
  },
  {
    id: "annual",
    name: "Annual",
    price: "$120",
    cadence: "/yr",
    sub: "$10/mo, billed annually",
    badge: "Save $60",
    cta: "Subscribe · $120/yr",
    highlight: true,
    features: [
      "Everything in Monthly",
      "2 months free",
      "Early access to new features",
      "Priority support",
    ],
  },
];

/**
 * Final gate of the onboarding funnel. Rendered after the reveal step, or
 * jumped to directly when the URL carries ?activate=1 (the dashboard gate's
 * return path for an already-onboarded but unpaid user). Two ways through:
 * an access code (POST /api/redeem) or a Stripe plan (POST /api/stripe/checkout,
 * same call shape as the billing page).
 */
export function ActivationStep() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<PlanType | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function redeem() {
    const trimmed = code.trim();
    if (!trimmed) {
      setRedeemError("Enter your access code.");
      return;
    }
    setRedeeming(true);
    setRedeemError(null);
    try {
      const res = await apiFetch("/api/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data?.ok) {
        trackEvent("onboarding_activated", { method: "code" });
        router.push("/dashboard");
        return;
      }
      setRedeemError(data?.error || "That code didn't work. Try again.");
    } catch {
      setRedeemError("Couldn't reach the server. Try again.");
    } finally {
      setRedeeming(false);
    }
  }

  async function checkout(plan: PlanType) {
    setCheckoutLoading(plan);
    setCheckoutError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        trackEvent("onboarding_checkout_started", { plan });
        window.location.href = data.url;
        return;
      }
      setCheckoutError(data?.error || "Unable to start checkout. Try again.");
      setCheckoutLoading(null);
    } catch {
      setCheckoutError("Unable to reach payment server. Try again.");
      setCheckoutLoading(null);
    }
  }

  return (
    <div className="mt-4 space-y-3">
      <section className="border border-accent-teal/30 bg-bg-card p-5">
        <div className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5 text-accent-teal" />
          <h2 className="text-[11px] font-bold uppercase tracking-wider text-accent-teal">
            Unlock your network
          </h2>
        </div>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Enter your access code, or choose a plan to open every warm path we
          mapped.
        </p>
      </section>

      {/* Access code */}
      <section className="border border-white/[0.06] bg-bg-card">
        <div className="flex items-center gap-1.5 border-b border-white/[0.06] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-accent-teal">
          <KeyRound className="h-3 w-3" />
          Have an access code?
        </div>
        <div className="space-y-2 p-4">
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setRedeemError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void redeem();
                }
              }}
              placeholder="ACCESS-CODE"
              aria-label="Access code"
              disabled={redeeming}
              className="flex-1 border border-border bg-muted px-3 py-2 font-mono text-[13px] uppercase tracking-wider text-foreground placeholder:text-muted-foreground/50 focus:border-accent-teal/60 focus:outline-none disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void redeem()}
              disabled={redeeming || !code.trim()}
              className="flex shrink-0 items-center gap-1.5 bg-accent-teal px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-teal/90 disabled:opacity-50"
            >
              {redeeming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Redeem"
              )}
            </button>
          </div>
          {redeemError && (
            <p className="text-[11px] text-red-400">{redeemError}</p>
          )}
        </div>
      </section>

      {/* Plans */}
      <div className="flex items-center gap-2 pt-1">
        <Sparkles className="h-3 w-3 text-accent-teal" />
        <h3 className="text-[10px] font-bold uppercase tracking-wider text-accent-teal">
          Or choose a plan
        </h3>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {PLANS.map((p) => {
          const isLoading = checkoutLoading === p.id;
          return (
            <div
              key={p.id}
              className={`flex flex-col border bg-bg-card ${
                p.highlight
                  ? "border-accent-teal/40 shadow-[0_0_20px_-4px_rgba(14,165,233,0.15)]"
                  : "border-border-soft"
              }`}
            >
              <div className="border-b border-white/[0.06] px-4 py-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {p.name}
                  </p>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                      p.highlight
                        ? "bg-accent-teal/15 text-accent-teal"
                        : "border border-border text-muted-foreground"
                    }`}
                  >
                    {p.badge}
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="font-mono text-3xl font-bold text-foreground">
                    {p.price}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {p.cadence}
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  {p.sub}
                </p>
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
                  type="button"
                  onClick={() => void checkout(p.id)}
                  disabled={isLoading || checkoutLoading !== null}
                  className={`flex w-full items-center justify-center gap-2 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors disabled:opacity-50 ${
                    p.highlight
                      ? "bg-accent-teal text-white hover:bg-accent-teal/80"
                      : "border border-accent-teal/40 text-accent-teal hover:bg-accent-teal/10"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    p.cta
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {checkoutError && (
        <p className="text-[11px] text-red-400">{checkoutError}</p>
      )}

      <p className="border border-white/[0.06] bg-bg-card px-4 py-3 text-[11px] leading-relaxed text-muted-foreground">
        Both plans are charged immediately. Cancel anytime. Payments are
        securely processed by Stripe.
      </p>
    </div>
  );
}
