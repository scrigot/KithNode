"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { trackEvent } from "@/lib/posthog";
import { FEEDBACK_CREDITS } from "@/lib/credit-costs";
import { Sparkles, Check, Loader2, Star } from "lucide-react";

const PMF_OPTIONS = [
  { value: "very", label: "Very disappointed" },
  { value: "somewhat", label: "Somewhat disappointed" },
  { value: "not", label: "Not disappointed" },
] as const;

const STEP_OPTIONS = [
  { value: "imported", label: "Imported my network" },
  { value: "discover", label: "Ran Discover" },
  { value: "saved", label: "Saved a contact" },
  { value: "drafted", label: "Drafted an email" },
  { value: "sent", label: "Sent one" },
] as const;

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
      {required && <span className="ml-1 text-accent-teal">*</span>}
    </label>
  );
}

/** 1–5 rating row. */
function Rating({
  value,
  onChange,
  lowLabel,
  highLabel,
}: {
  value: number | null;
  onChange: (n: number) => void;
  lowLabel: string;
  highLabel: string;
}) {
  return (
    <div>
      <div className="flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex h-10 flex-1 items-center justify-center gap-1 border text-[13px] font-bold tabular-nums transition-colors ${
              value === n
                ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                : "border-white/[0.06] text-muted-foreground hover:text-foreground"
            }`}
          >
            {value === n && <Star className="h-3 w-3" />}
            {n}
          </button>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground/50">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export default function FeedbackPage() {
  const [pmf, setPmf] = useState<string>("");
  const [accuracyScore, setAccuracyScore] = useState<number | null>(null);
  const [onboardingScore, setOnboardingScore] = useState<number | null>(null);
  const [furthestStep, setFurthestStep] = useState<string>("");
  const [whoa, setWhoa] = useState("");
  const [friction, setFriction] = useState("");
  const [weeklyUse, setWeeklyUse] = useState("");
  const [willingnessToPay, setWillingnessToPay] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // null = unknown (loading), false = not yet, true = already on record.
  const [alreadySubmitted, setAlreadySubmitted] = useState<boolean | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [grantedCredits, setGrantedCredits] = useState<number | null>(null);

  // On mount, check whether this user already submitted (drives the credit copy).
  useEffect(() => {
    apiFetch("/api/feedback/survey")
      .then((r) => (r.ok ? r.json() : { submitted: false }))
      .then((d) => setAlreadySubmitted(!!d.submitted))
      .catch(() => setAlreadySubmitted(false));
  }, []);

  const canSubmit = pmf && friction.trim() && weeklyUse.trim() && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch("/api/feedback/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pmf,
          accuracyScore,
          onboardingScore,
          furthestStep: furthestStep || null,
          whoa,
          friction,
          weeklyUse,
          willingnessToPay,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        return;
      }
      trackEvent("feedback_submitted", {
        pmf,
        accuracy: accuracyScore,
        furthest_step: furthestStep || null,
        credits_granted: !!data.creditsGranted,
      });
      setGrantedCredits(data.creditsGranted ? data.granted ?? FEEDBACK_CREDITS : 0);
      setJustSubmitted(true);
    } catch {
      setError("Network error. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success state ──────────────────────────────────────────────────────────
  if (justSubmitted) {
    return (
      <div className="mx-auto flex min-h-full max-w-lg flex-col items-center justify-center p-6 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center border border-accent-teal/30 bg-accent-teal/10">
          <Check className="h-6 w-6 text-accent-teal" />
        </div>
        <h1 className="text-lg font-bold text-foreground">Thank you</h1>
        <p className="mt-2 text-[13px] text-muted-foreground">
          {grantedCredits && grantedCredits > 0
            ? `+${grantedCredits} credits added to your account. You're a Beta Contributor — this is exactly what shapes what we build next.`
            : "Your feedback is updated. (Credits are granted once per tester, so no extra this time.)"}
        </p>
        <a
          href="/dashboard/discover"
          className="mt-6 inline-flex items-center gap-2 bg-primary px-4 py-2.5 text-[12px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-primary/80"
        >
          Back to Discover
        </a>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-5">
      {/* Header + reward banner */}
      <div className="mb-4">
        <h1 className="text-sm font-bold uppercase tracking-wider text-accent-teal">
          Beta feedback
        </h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          Brutal honesty &gt; nice. This is what decides what we build next.
        </p>
      </div>

      <div className="mb-4 flex items-center gap-2 border border-accent-teal/30 bg-accent-teal/10 px-3 py-2">
        <Sparkles className="h-4 w-4 shrink-0 text-accent-teal" />
        <p className="text-[12px] font-bold text-accent-teal">
          {alreadySubmitted
            ? "You've already claimed your credits — edits welcome, but no extra credits this time."
            : `Get +${FEEDBACK_CREDITS} free credits when you submit (one time).`}
        </p>
      </div>

      <div className="space-y-4">
        {/* PMF */}
        <section className="border border-white/[0.06] bg-card p-4">
          <Label required>How would you feel if you could no longer use KithNode?</Label>
          <div className="flex flex-col gap-2 sm:flex-row">
            {PMF_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setPmf(o.value)}
                className={`flex-1 border px-3 py-2.5 text-[12px] font-bold transition-colors ${
                  pmf === o.value
                    ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                    : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        {/* Accuracy */}
        <section className="border border-white/[0.06] bg-card p-4">
          <Label>Did the people it surfaced feel real — could you actually get an intro?</Label>
          <Rating
            value={accuracyScore}
            onChange={setAccuracyScore}
            lowLabel="Felt random"
            highLabel="Spot on"
          />
        </section>

        {/* Onboarding */}
        <section className="border border-white/[0.06] bg-card p-4">
          <Label>How smooth was getting set up?</Label>
          <Rating
            value={onboardingScore}
            onChange={setOnboardingScore}
            lowLabel="Painful"
            highLabel="Effortless"
          />
        </section>

        {/* Furthest step */}
        <section className="border border-white/[0.06] bg-card p-4">
          <Label>How far did you get?</Label>
          <div className="flex flex-wrap gap-1.5">
            {STEP_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setFurthestStep(o.value)}
                className={`border px-2.5 py-1.5 text-[11px] font-bold transition-colors ${
                  furthestStep === o.value
                    ? "border-accent-teal bg-accent-teal/15 text-accent-teal"
                    : "border-white/[0.06] text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </section>

        {/* Whoa */}
        <section className="border border-white/[0.06] bg-card p-4">
          <Label>What made you go &ldquo;whoa&rdquo;? What felt useless?</Label>
          <textarea
            value={whoa}
            onChange={(e) => setWhoa(e.target.value)}
            rows={3}
            placeholder="The moment it clicked — or the thing that fell flat."
            className="w-full resize-y border border-input bg-muted p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </section>

        {/* Friction (required) */}
        <section className="border border-white/[0.06] bg-card p-4">
          <Label required>Where did you get stuck or confused?</Label>
          <textarea
            value={friction}
            onChange={(e) => setFriction(e.target.value)}
            rows={3}
            placeholder="Be specific — which screen, what you expected vs. what happened."
            className="w-full resize-y border border-input bg-muted p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </section>

        {/* Weekly use (required) */}
        <section className="border border-white/[0.06] bg-card p-4">
          <Label required>The #1 thing that would make you use this every week?</Label>
          <textarea
            value={weeklyUse}
            onChange={(e) => setWeeklyUse(e.target.value)}
            rows={3}
            placeholder="What's missing between 'cool demo' and 'I open this every day'?"
            className="w-full resize-y border border-input bg-muted p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </section>

        {/* Willingness to pay */}
        <section className="border border-white/[0.06] bg-card p-4">
          <Label>Would you pay for this? If yes, what&apos;s fair per month?</Label>
          <input
            type="text"
            value={willingnessToPay}
            onChange={(e) => setWillingnessToPay(e.target.value)}
            placeholder="e.g. 'yeah ~$15/mo' or 'no, here's why...'"
            className="w-full border border-input bg-muted p-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
        </section>

        {error && <p className="text-[12px] text-red-400">{error}</p>}

        <button
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 bg-accent-teal py-3 text-[13px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-accent-teal/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting
            </>
          ) : (
            <>
              Submit
              {!alreadySubmitted && ` · +${FEEDBACK_CREDITS} credits`}
            </>
          )}
        </button>
        <p className="text-center text-[10px] text-muted-foreground/50">
          PMF, friction, and weekly-use are required. Everything else is optional.
        </p>
      </div>
    </div>
  );
}
