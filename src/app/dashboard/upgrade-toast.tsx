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

export function UpgradeToast() {
  const [reason, setReason] = useState<Reason | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ reason?: string }>).detail;
      const r = (detail?.reason as Reason) || "no_sub";
      setReason(r);
    };
    window.addEventListener("kithnode:upgrade-required", handler);
    return () => window.removeEventListener("kithnode:upgrade-required", handler);
  }, []);

  useEffect(() => {
    if (!reason) return;
    const t = setTimeout(() => setReason(null), 6000);
    return () => clearTimeout(t);
  }, [reason]);

  if (!reason) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 flex w-[320px] items-start gap-2 border border-accent-teal/40 bg-card px-3 py-2.5 shadow-2xl shadow-accent-teal/20"
    >
      <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-teal" />
      <div className="flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-accent-teal">
          Upgrade Required
        </p>
        <p className="mt-0.5 text-[11px] leading-snug text-foreground">
          {REASON_COPY[reason]}
        </p>
        <Link
          href="/dashboard/billing"
          onClick={() => setReason(null)}
          className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-accent-teal hover:text-white"
        >
          View plans →
        </Link>
      </div>
      <button
        onClick={() => setReason(null)}
        aria-label="Dismiss"
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
