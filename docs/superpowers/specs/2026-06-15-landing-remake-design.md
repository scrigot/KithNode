# KithNode Landing Remake — Design Spec (2026-06-15)

## Context
KithNode's landing took a run of Swarm AI user-testing findings, all the same root: claims and a polished scoring UI without plain-English proof of how it works or where data comes from, padded with fabricated traction, and no real handling of the fears a skeptical student actually has. Prior session work already fixed the fabrication, added a transparency strip, real demo panels, and a founder-first request flow.

This remake restructures the landing onto the proven Cluely.com skeleton (one wedge hammered, show-don't-tell, objections handled head-on, FAQ, punchy close) and rewrites the copy. It folds in three decisions from the user and one research input:
- **Wedge:** warm beats cold. Differentiator amplifier (from research): **KithNode drafts, you send. No automation, no scraping, no bots on your LinkedIn.**
- **The "wow":** AI scoring, shown transparently (user's call).
- **Founder note:** full-underdog framing (user's call).
- **Objection handler + FAQ:** content driven by real competitor-pain research (below).

Finance-first positioning (locked earlier). Dark landing aesthetic stays (do not pivot to light).

## Competitor-pain research (what this market hates, ranked)
Source: ~16 web searches across LinkedIn-automation complaints, AI cold-email studies (Hunter.io), warm-intro/alumni-platform gripes, finance-networking culture (WSO, r/FinancialCareers).
1. **Account bans from automation/scraping** (STRONGEST). "$500/month, all accounts banned in 48 hours." Students have ONE account; a ban kills recruiting season.
2. **"Obviously AI / a template"** (VERY STRONG). 83% can identify an AI cold email; 47% wouldn't reply.
3. **"Personalization theater" feels creepy/stalkery.** Surfaced personal details read as robot-stalking.
4. **"Does it actually get replies?"** effectiveness skepticism (burned by auto-apply tools).
5. **Stale/wrong contact data** (lethal for a warm-path product).
6. **"Spray and pray feels gross/low-status."**
7. Setup friction (minor). Price is a multiplier on #4, not its own fear.

**The 3 KithNode must pre-empt loudest:** account safety (no automation/scraping/auto-send), anti-"obviously-AI" (editable draft grounded in a real connection, you send it), and "not the 100th identical message" (built on your specific signals, vs the WSO template everyone uses).

## Page structure (approved skeleton)
Navbar (trimmed) -> Hero -> How it works (card tour) -> The wow: AI scoring in the open -> Objection handler ("What KithNode won't do") -> Founder note (full underdog) -> FAQ -> Final CTA -> Footer + "Why KithNode exists" manifesto link.

## Final copy

**1. Nav (trimmed):** How it works · Demo · Why KithNode · **[Request Access]**. Cut Products/Solutions/Sign-in clutter.

**2. Hero**
- Pill: `Private alpha · free for early users`
- H1: **Find a warm path into every bank, fund, and firm on your list.**
- Sub: *KithNode finds the alumni who can actually introduce you, scores each path by real shared signals, and drafts the message. You send it yourself, no automation, no bots, nothing that ever touches your LinkedIn account.*
- CTA: **Request Access** · *See it live, no signup ->* (`/demo`)

**3. How it works** — the compact card tour (reuse ProductCards): **Discover -> Score -> Draft -> Track.** Honest signal labels (already done). The outreach example lives here as the "Draft" beat, not its own section.

**4. The wow: AI scoring, in the open**
- Heading: **Know exactly who to talk to, and why.**
- One real scored path with every signal visible (Same school 92 · Same Greek/club 78 · Mutual connections 74 · Target firm 85).
- Caption: *Every score is built from signals you can verify. No black box, no mystery "AI magic."*
- Merges the real PanelScoring + the transparency strip (how-it-scores + where-data-comes-from) into one section. Link to the live demo.

**5. Objection handler — "What KithNode won't do"** (the defended wedge)
- **Won't get your LinkedIn banned.** No automation, no scraping, no bots. KithNode never logs into your account; you send every message yourself.
- **Won't make you sound like a robot.** Every draft is grounded in a real shared connection and is a starting point you edit before sending, not send-ready spam.
- **Won't make you the 100th identical message.** Built on your specific shared signals, so no two students send the same thing.

**6. Founder note (full underdog)** — verbatim, user-approved:
> I'm Sam, a UNC freshman. I'm not in the business school yet, I don't have a target-school résumé or a high GPA. But I'm interning at a Fortune 500 building enterprise-scale RAG systems and at a PE firm building AI automations like deal sourcing, and I got the PE one through a friend in my pledge class who introduced me. Not a cold app. A warm path. That's the whole thesis: the intro beats the résumé. KithNode is the method I used, automated. If it worked for me with none of the pedigree, it'll work for you.

Signature: Sam Rigot · Founder · UNC '29, linked to linkedin.com/in/samrigot.

**7. FAQ** (research-driven, priority order):
- Will this get my LinkedIn restricted or banned? -> No. KithNode never automates, scrapes, or logs into your LinkedIn. Nothing runs on your account.
- Where does the contact data come from? -> Permitted public sources + your own LinkedIn export. Never your private account.
- How is the warmth score calculated? -> Real shared signals (same school, club, Greek org, hometown, mutual connections, target firm). You see every one.
- Will recruiters know it's AI? -> The draft is a starting point you edit and send yourself, grounded in a real connection. Not a template blast.
- Is it free? -> Free for the founding cohort.
- Who is it for? -> Students breaking into finance (IB, PE, consulting) who'd rather walk in warm than cold-email strangers.

**8. Final CTA** — **Stop cold-emailing strangers. Walk in warm.** + **[Request Access]**

**9. Footer** + a **"Why KithNode exists"** page (`/manifesto` or `/why`) = the founder story expanded.

## Implementation approach (restructure in place)
Reuse what works; do not rebuild from scratch.
- **Keep + reuse:** `hero-section.tsx` (sharpen sub-copy for the anti-automation line), `product-cards.tsx` (the card tour, already de-jargoned), the transparency strip + real `PanelScoring` (merge into section 4), `testimonials.tsx` founder card (rewrite to the underdog note).
- **Cut:** the standalone "See exactly what you get" dual-panel section in `page.tsx` (folds into section 4); the `ValueProps` "Three steps" section (the card tour is now the single "how it works", so ValueProps is redundant); the `SolutionsSection` is optional to keep (3 finance verticals, already de-fabricated) but lands after the objection block if kept.
- **Add (new sections in `page.tsx`, inline like the existing ones, no new files unless a section is reused):** the "What KithNode won't do" objection block; the FAQ (a simple accordion or static list); a `/manifesto` (or `/why`) page for the expanded founder story.
- **Trim nav** in `navbar.tsx`.
- Reuse the real signal vocabulary from `src/lib/linkedin-import.ts` (`detectAffiliations`) so copy matches the algorithm.

## Pre-publish check (blocking)
The hero + objection + FAQ all assert **"you send it yourself, no automation, never auto-sends."** Before publishing, confirm the beta product is draft-only (the outreach flow produces a draft the user copies/sends; nothing auto-sends to targets). If any auto-send path exists in the beta, this positioning must change or that path must be gated off for beta.

## Verification
- `npm run test && npx tsc --noEmit && npm run lint` green.
- Browser (port 3000): curl + screenshot `/`; confirm the new section order, no fabricated numbers, the anti-automation line in the hero, the objection block, and the FAQ render; one clear primary CTA (Request Access) at hero + mid + close.
- Closes the open Swarm findings: black-box scoring (section 4 + FAQ), buried trust (objection block + FAQ), "no real output / manufactured" (real scoring panel + honest copy), and the new account-safety fear (hero + objection + FAQ).
- Commit in themed commits on `feat/contact-intelligence`. Then deploy the batch (gated on Sam) so the next Swarm run tests the new page.
