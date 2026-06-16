# Landing rebuild spec — Cluely-structure, KithNode identity

> Hand-off for the session that owns `src/app/_landing/*`. Sam's call (2026-06-16): rebuild the landing to be **structurally 1:1 with cluely.com**, but **keep KithNode's visual identity** (saturated blue + lime + network-graph hero). This is NOT a monochrome pivot. Calibrate every decision against `brand/landing.md` + `ops/ETHOS.md`.

## The directive
- **Match Cluely's LAYOUT and section flow.** Do NOT adopt Cluely's black-and-white aesthetic. Keep your blue + lime + network-graph look.
- **Cut the demo / walkthrough content** (the "watch the warm path get found" stuff). Replace animated product demos with static product visuals, the Cluely pattern.

## Cluely's section spine (scraped 2026-06-16) — mirror this order
1. Navbar — minimal sticky, wordmark left, 2-3 links + primary CTA right.
2. Hero — **centered** (not left-aligned), one long benefit-led headline + subhead + single primary CTA, backed by a product mockup/visual.
3. Interactive product proof — a realistic UI mockup right under the hero (for KithNode: a STATIC dashboard screenshot, not an auto-playing demo).
4-6. How-it-works / value-prop — alternating left-text/right-visual blocks, each anchored to a real product screenshot.
7. Showcase feature — one signature feature shown across device frames.
8-11. Themed feature cluster — Cluely groups 3 sub-features under one promise ("Undetectable in every way"). KithNode equivalent: pick one signature promise (e.g. "Walk in warm") and break it into 2-3 visualized sub-features.
12. Logo cloud / compatibility — SEE HONESTY NOTE.
13. Stats strip — 3 metric blocks. SEE HONESTY NOTE.
14. FAQ accordion.
15. Final centered CTA — repeats the hero ask.
16. Dark multi-column footer — resources / support / legal + status pill + socials.

## Cut from the current landing (demo / walkthrough)
- `section-email-mac.tsx` (EmailMacDemo) — the auto-looping warm-path walkthrough. CUT. (Used in `hero-section.tsx`.)
- `demo/_components/panel-scoring.tsx` (PanelScoring) + the inline "Scoring" section in `page.tsx` (~lines 42-67). CUT.
- `section-outpace.tsx` replicas (EdgeReplica / PipelineReplica / RemindersReplica) — animated dashboard panels. Replace with static visuals or cut.
- `section-import-rank.tsx` right-side `warm-signals-replica.tsx` — demo scoring output. Cut the replica; the CSV-import idea can stay as a static visual.

## Keep
- The blue + lime + network-graph identity (`hero-network.tsx` is fine as a hero/CTA visual, it's not a walkthrough).
- Real features, shown as STATIC product screenshots (Cluely's whole pattern is "real UI screenshot per section").
- Testimonials/Founder letter, FAQ, footer.

## Two flags before building
1. **Density tension.** Cluely uses generous whitespace; that's the opposite of the Bloomberg-density rule, but `brand/landing.md` is already the Cluely-derived (spacious) system, distinct from `brand/dashboard.md`. So spacious is OK on the LANDING. Confirm with Sam if unsure.
2. **Honesty (ETHOS, the Cluely-lying lesson).** Pre-launch with ~5 waitlist signups, there are no customer logos and no real usage stats. So either **cut** the logo cloud + 3-stat strip, or reframe them honestly (build-in-public: "building since X", waitlist count) with **no fabricated numbers**. No "trusted by 500 students."

## Verify
Run `/kithnode-landing-fix` (design-review vs `brand/landing.md` -> /qa -> before/after screenshots) after the rebuild.
