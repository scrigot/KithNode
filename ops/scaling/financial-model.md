# Financial Model - Deal-Based Path to $100k MRR

Companion to `templates/financial-model.csv`. The model is deal-based, not user-count-based,
because the spine is institutional site-licenses, not self-serve subscriptions.

## The core identity

```
Institutional MRR = paying logos x avg seats per logo x $20
Total MRR        = Institutional MRR + Self-serve MRR
$100k MRR        ~= 15 logos x ~350 seats x $20  ( = $105k ) plus a modest self-serve tail
```

So the lever that matters is logos and seats-per-logo, not raw student count. At $20/seat a
single 350-seat career-center deal is ~$7k MRR (~$84k ARR). Roughly 15 of those is the goal.

## Assumptions (edit these; they are the model's inputs)

- Seat price: $20/student/mo. Institutional contracts are annual; recognize monthly.
- Avg seats per logo: starts ~300 (one finance cohort), grows to ~350 as adoption deepens.
- Pilot to paid conversion: ~60% (illustrative). Pilots are free in P0.
- Logo churn: low for annual institutional contracts (~10%/yr illustrative); the renewal
  engine in P2/P3 is what protects this.
- Self-serve: a secondary wedge. Modest and demand-proof, not the spine.
- CAC: near-zero in P0/P1 (founder-led, warm intros), rising as you hire reps in P2/P3.
- Gross margin: target 75%+ (the SaaS benchmark). COGS is mostly enrichment APIs + LLM spend
  (track via `src/lib/ai-cost.ts` + the `UsageEvent` table).

## Benchmark guardrails (cited)

- LTV:CAC at or above 3:1; median across SaaS is ~3.6:1, investors expect 3:1 minimum.
- CAC payback under 12 months survives downturns.
- Net revenue retention above 100% grows 1.5-3x faster than peers.
- Gross margin 75%+ lets you reinvest without external capital.
- Early-stage valuation runs ~5-10x MRR.

Note on this business: because a logo is ~$84k ARR and founder-led CAC is a few thousand
dollars, LTV:CAC is far above 3:1. The binding constraint here is sales capacity and
procurement cycle length, not unit economics. The model should be read as "how many logos can
we close and onboard per quarter", not "can we afford to acquire a customer."

## How to drive the model (in Sheets)

The CSV ships as values so it opens cleanly. To make it live, wire these formulas:

- Institutional MRR row = `paying_logos * avg_seats * seat_price`
- Self-serve MRR row = `self_serve_subs * seat_price`
- Total MRR row = `institutional_MRR + self_serve_MRR`
- LTV per logo = `(avg_seats * seat_price * 12) * gross_margin / annual_logo_churn`
- LTV:CAC = `LTV_per_logo / CAC_per_logo`
- Total burn = `tools_and_COGS + intern_stipends` (add founder/FTE salaries as you add them)
- Runway = `cash_balance / total_burn`

The milestones in the CSV are tied to the roadmap: P1 ~$15-20k MRR, P2 ~$45k, P3 $100k.

## What the illustrative numbers show

Closing roughly 1-2 logos per month from month 4, with seats-per-logo creeping up and a small
self-serve tail, crosses ~$15-20k around month 7 (P1), ~$45k around month 11 (P2), and ~$100k
around month 15 (P3). All figures in the CSV are illustrative placeholders, not forecasts or
claims. Replace them with real inputs as pilots convert.

## Sources

- SaaS metrics and benchmarks (LTV:CAC, NRR, payback, margin, valuation): https://www.nxcode.io/resources/news/saas-financial-modeling-101-mrr-arr-ltv-cac-explained , https://www.averi.ai/blog/15-essential-saas-metrics-every-founder-must-track-in-2026-(with-benchmarks)
- Free model templates to copy: https://www.thevccorner.com/p/saas-financial-model-excel-template , https://wildfront.co/saas-financial-model-template
