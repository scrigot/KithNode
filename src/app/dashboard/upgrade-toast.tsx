"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X } from "lucide-react";

type Reason = "no_sub" | "trial_expired" | "canceled" | "past_due" | "no_user";

const REASON_COPY: Record<Reason, string> = {
  no_sub: "Upgrade to KithNode Pro to use AI features.",
  trial_expired: "Your free trial ended. Upgrade to keep using AI features.",
  canceled: "Your subscription was canceled. Resubscribe to use AI features.",
  past_due: "Payment failed. Update your card to keep AI features.",
  no_user: "Sign in to use AI features.",
};

interface ToastState {
  reason: Reason;
  outOfCredits: boolean;
}

export function UpgradeToast() {
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ reason?: string; error?: string }>).detail;
      const r = (detail?.reason as Reason) || "no_sub";
      const outOfCredits = detail?.error === "out_of_credits";
      setToast({ reason: r, outOfCredits });
    };
    window.addEventListener("kithnode:upgrade-required", handler);
    return () => window.removeEventListener("kithnode:upgrade-required", handler);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!toast) return null;

  const isOutOfCredits = toast.outOfCredits;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 flex w-[320px] items-start gap-2 border border-accent-teal/40 bg-card px-3 py-2.5 shadow-2xl shadow-accent-teal/20"
    >
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-teal" />
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent-teal">
          {isOutOfCredits ? "Out of Credits" : "Upgrade Required"}
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-foreground">
          {isOutOfCredits
            ? "You have no credits remaining. Add more to continue using AI features."
            : REASON_COPY[toast.reason]}
        </p>
        <Link
          href={isOutOfCredits ? "/dashboard/billing" : "/dashboard/billing"}
          onClick={() => setToast(null)}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent-teal hover:text-white"
        >
          {isOutOfCredits ? "Billing & usage →" : "View plans →"}
        </Link>
      </div>
      <button
        onClick={() => setToast(null)}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
