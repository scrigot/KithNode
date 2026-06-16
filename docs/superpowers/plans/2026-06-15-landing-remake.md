# KithNode Landing Remake Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the KithNode landing onto the Cluely skeleton (hero -> how-it-works -> AI-scoring wow -> objection handler -> founder -> FAQ -> CTA), reusing existing components, killing duplication, and adding the missing objection block, FAQ, and manifesto.

**Architecture:** Restructure-in-place. Reuse `hero-section`, `product-cards` (the card tour), the real `PanelScoring` panel, the transparency strip, and the founder card. Cut the duplicate dual-panel section, `ValueProps`, and `SolutionsSection` from the render. Add two new sections (objection block inline + an FAQ component) and one new route (`/manifesto`). All landing sections are dark; copy is finance-first; no em dashes; no fabricated numbers.

**Tech Stack:** Next.js 16 App Router (server components by default), Tailwind v4, framer-motion (existing), TypeScript strict, Vitest. Repo `/Users/scrigot/projects/apps/kithnode`, branch `feat/contact-intelligence`.

**Spec:** `docs/superpowers/specs/2026-06-15-landing-remake-design.md`

---

## File Structure

- `src/app/_landing/navbar.tsx` — MODIFY: trim nav links to How it works · Demo · Why KithNode · Request Access.
- `src/app/_landing/hero-section.tsx` — MODIFY: sub-copy gains the anti-automation line.
- `src/app/_landing/testimonials.tsx` — MODIFY: founder card body -> the full-underdog note.
- `src/app/_landing/faq.tsx` — CREATE: a static `<details>` FAQ section (server component, no client JS).
- `src/app/manifesto/page.tsx` — CREATE: "Why KithNode exists" page (expanded founder story).
- `src/app/_landing/cta-section.tsx` — MODIFY: closing headline -> "Stop cold-emailing strangers. Walk in warm."
- `src/app/page.tsx` — MODIFY (the structural task): retitle the scoring section + drop `PanelOutreach` from it, add the inline objection block, render `<FAQ />`, remove `<ValueProps />` + `<SolutionsSection />` (+ their imports), add a footer manifesto link.

Each task ends with the project gate (`npx tsc --noEmit && npx eslint <files>`) and a commit. The full suite (`npm run test`, 1127 tests) runs once at the end (Task 8).

---

### Task 1: Trim the nav

**Files:** Modify `src/app/_landing/navbar.tsx`

- [ ] **Step 1: Read the file** to find the nav-links array/markup.
- [ ] **Step 2: Replace the link set** with exactly these four, in order: `How it works` (href `#how-it-works`), `Demo` (href `/demo`), `Why KithNode` (href `/manifesto`), and the primary CTA `Request Access` (href `/waitlist`). Remove any other links (Products, Solutions, Pricing, Sign in). Keep the logo, the existing styling classes, and the mobile menu behavior.
- [ ] **Step 3: Verify** `cd /Users/scrigot/projects/apps/kithnode && npx tsc --noEmit 2>&1 | tail -3 && npx eslint src/app/_landing/navbar.tsx`. Expected: no errors.
- [ ] **Step 4: Commit** `git add src/app/_landing/navbar.tsx && git commit -m "feat(landing): trim nav to How it works / Demo / Why KithNode / Request Access"`

---

### Task 2: Hero sub-copy (anti-automation line)

**Files:** Modify `src/app/_landing/hero-section.tsx`

- [ ] **Step 1:** Replace the subhead paragraph text (currently "KithNode maps every alum at the firms you care about, ranks each warm path by shared signals (school, club, Greek, hometown), and drafts the message. Warm intros land replies 5x more often than cold emails.") with exactly:

```
KithNode finds the alumni who can actually introduce you, scores each warm path by real shared signals, and drafts the message. You send it yourself, no automation, no bots, nothing that ever touches your LinkedIn account.
```

Keep the `<motion.p>` wrapper, classes, and variants unchanged. Leave the headline (already "into every bank, fund, / and firm on your list."), pill, CTAs, and footer credit as-is.

- [ ] **Step 2: Verify** `npx tsc --noEmit 2>&1 | tail -3 && npx eslint src/app/_landing/hero-section.tsx`. No errors. Confirm no em dashes.
- [ ] **Step 3: Commit** `git add src/app/_landing/hero-section.tsx && git commit -m "feat(landing): hero sub-copy leads with no-automation, you-send-it-yourself"`

---

### Task 3: Founder note (full underdog)

**Files:** Modify `src/app/_landing/testimonials.tsx`

- [ ] **Step 1:** In the `FounderCard` body, replace the three `<p>` paragraphs of body copy with the approved underdog note (one or two `<p>` blocks, same `text-white/80` styling):

```
I'm Sam, a UNC freshman. I'm not in the business school yet, I don't have a target-school resume or a high GPA. But I'm interning at a Fortune 500 building enterprise-scale RAG systems and at a PE firm building AI automations like deal sourcing, and I got the PE one through a friend in my pledge class who introduced me. Not a cold app. A warm path.

That's the whole thesis: the intro beats the resume. KithNode is the method I used, automated. If it worked for me with none of the pedigree, it'll work for you.
```

Keep the signature block. Update the signature line to: `Founder · UNC Chapel Hill '29` (drop the "Fortune 500 Intern, Summer 2026" sub-line or keep only if you want; the body already carries the credential). Keep the `SR` avatar. No em dashes (use commas/periods).

- [ ] **Step 2: Verify** `npx tsc --noEmit 2>&1 | tail -3 && npx eslint src/app/_landing/testimonials.tsx`. No errors.
- [ ] **Step 3: Commit** `git add src/app/_landing/testimonials.tsx && git commit -m "feat(landing): rewrite founder note to the full-underdog warm-path story"`

---

### Task 4: FAQ component

**Files:** Create `src/app/_landing/faq.tsx`

- [ ] **Step 1: Create the file** (server component, native `<details>`, dark aesthetic):

```tsx
const FAQS: { q: string; a: string }[] = [
  {
    q: "Will this get my LinkedIn restricted or banned?",
    a: "No. KithNode never automates, scrapes, or logs into your LinkedIn. Nothing runs on your account, and nothing sends on its own. You copy each message and send it yourself.",
  },
  {
    q: "Where does the contact data come from?",
    a: "Permitted public sources and the LinkedIn data export you choose to share. Never your private account, never your password.",
  },
  {
    q: "How is the warmth score calculated?",
    a: "Real shared signals you can verify yourself: same school, club, Greek org, hometown, major, mutual connections, and whether they sit at a firm on your target list. You see every signal behind the score.",
  },
  {
    q: "Will recruiters know it's AI?",
    a: "The draft is a starting point grounded in a real shared connection, and you edit it before you send it. It is not a template blast, and it is not sent automatically.",
  },
  {
    q: "Is it free?",
    a: "Free for the founding cohort.",
  },
  {
    q: "Who is it for?",
    a: "Students breaking into finance (investment banking, private equity, consulting) who would rather walk in warm than cold-email strangers.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="relative bg-black px-4 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Questions, answered
        </h2>
        <div className="mt-10 flex flex-col gap-3">
          {FAQS.map((item) => (
            <details
              key={item.q}
              className="group rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-4"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-semibold text-white">
                {item.q}
                <span className="text-[#0EA5E9] transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                {item.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit 2>&1 | tail -3 && npx eslint src/app/_landing/faq.tsx`. No errors.
- [ ] **Step 3: Commit** `git add src/app/_landing/faq.tsx && git commit -m "feat(landing): add FAQ section (account safety, data, scoring, authenticity)"`

---

### Task 5: Manifesto page

**Files:** Create `src/app/manifesto/page.tsx`

- [ ] **Step 1: Create the route** (server component, light-on-dark, matches the landing). Expanded founder story + a primary CTA back to the waitlist and a back link to `/`:

```tsx
import Link from "next/link";

export const metadata = {
  title: "Why KithNode exists",
  description: "The intro beats the resume. KithNode is the warm-path method, automated.",
};

export default function ManifestoPage() {
  return (
    <main className="min-h-screen bg-black px-6 py-20">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-sm font-medium text-white/50 transition-colors hover:text-white"
        >
          &larr; Back
        </Link>
        <h1 className="mt-8 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Why KithNode exists
        </h1>
        <div className="mt-8 flex flex-col gap-5 text-lg leading-relaxed text-white/80">
          <p>
            Cold outreach is a numbers game you usually lose. Out of every
            hundred-plus cold emails, almost no one replies. The students who
            actually get the meeting did not have better resumes. They had a
            warm path: someone two degrees away who made the intro.
          </p>
          <p>
            I'm Sam, a UNC freshman. I'm not in the business school yet, I don't
            have a target-school resume or a high GPA. But I'm interning at a
            Fortune 500 building enterprise-scale RAG systems, and at a PE firm
            building AI automations like deal sourcing, and I got the PE one
            through a friend in my pledge class who introduced me. Not a cold
            app. A warm path.
          </p>
          <p>
            KithNode is that method, automated. It finds the alumni who can
            actually introduce you, scores each path by signals you can verify,
            and drafts the message. You send it yourself. No automation, no
            bots, nothing that touches your LinkedIn account.
          </p>
          <p>
            The intro beats the resume. If it worked for me with none of the
            pedigree, it'll work for you.
          </p>
        </div>
        <Link
          href="/waitlist"
          className="mt-10 inline-flex items-center rounded-lg bg-[#0EA5E9] px-8 py-4 text-base font-semibold text-white transition-all hover:bg-[#0284C7]"
        >
          Request Access
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify** `npx tsc --noEmit 2>&1 | tail -3 && npx eslint src/app/manifesto/page.tsx` and `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/manifesto` (expect 200). No errors.
- [ ] **Step 3: Commit** `git add src/app/manifesto/page.tsx && git commit -m "feat(manifesto): add Why KithNode exists page"`

---

### Task 6: Final CTA headline

**Files:** Modify `src/app/_landing/cta-section.tsx`

- [ ] **Step 1: Read the file**, find the closing headline (currently "Your warm path to the room where it happens.") and replace it with: `Stop cold-emailing strangers. Walk in warm.` Keep the primary button "Request Access", the existing data-sourcing line, and the structure. No fabricated numbers.
- [ ] **Step 2: Verify** `npx tsc --noEmit 2>&1 | tail -3 && npx eslint src/app/_landing/cta-section.tsx`. No errors.
- [ ] **Step 3: Commit** `git add src/app/_landing/cta-section.tsx && git commit -m "feat(landing): sharpen final CTA headline (walk in warm)"`

---

### Task 7: Restructure page.tsx (the big one)

**Files:** Modify `src/app/page.tsx`

- [ ] **Step 1: Imports.** Remove `import { ValueProps } from "./_landing/value-props";` and `import { SolutionsSection } from "./_landing/solutions-section";`. Remove `import { PanelOutreach } from "@/app/demo/_components/panel-outreach";`. Add `import { FAQ } from "./_landing/faq";`. Keep `PanelScoring` and `Link` imports.

- [ ] **Step 2: Restructure the render** so the section order between `<Navbar />`/hero and the footer is exactly:

```tsx
      <ProductCards />

      {/* The wow: AI scoring shown transparently. Real PanelScoring + the
          plain-English how-it-scores + where-data-comes-from explainer. */}
      <section className="relative bg-black px-4 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#0EA5E9]">
              The math, not magic
            </span>
            <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Know exactly who to talk to, and why.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-white/60">
              Every warm path gets a score you can see straight through. Real
              output from the live demo, sample data.
            </p>
          </div>
          <PanelScoring />
          <div className="mt-10 text-center">
            <Link
              href="/demo"
              className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-8 py-4 text-base font-semibold text-white/90 backdrop-blur-sm transition-all hover:border-[#0EA5E9]/50 hover:bg-[#0EA5E9]/10 hover:text-white"
            >
              Explore the full live demo &rarr;
            </Link>
          </div>
        </div>
      </section>

      {/* Keep the existing transparency strip section (How the score works / Where
          the data comes from) exactly as-is, immediately after the scoring section. */}
      {/* ...existing transparency <section> stays here... */}

      {/* Objection handler: the fears people actually voice (from research). */}
      <section className="relative bg-black px-4 py-20 sm:py-24">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10 text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#0EA5E9]/25 bg-[#0EA5E9]/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#0EA5E9]">
              What KithNode won't do
            </span>
            <h2 className="mt-5 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl">
              The stuff you're actually worried about
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
              <h3 className="font-heading text-lg font-bold text-white">
                Won't get your LinkedIn banned
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                No automation, no scraping, no bots. KithNode never logs into
                your account, and never sends on its own. You send every message
                yourself.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
              <h3 className="font-heading text-lg font-bold text-white">
                Won't make you sound like a robot
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Every draft is grounded in a real shared connection and is a
                starting point you edit before sending. Not send-ready spam.
              </p>
            </div>
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-7">
              <h3 className="font-heading text-lg font-bold text-white">
                Won't make you the 100th identical message
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-white/70">
                Built on your specific shared signals, so no two students send
                the same thing.
              </p>
            </div>
          </div>
        </div>
      </section>

      <Testimonials />
      <FAQ />
      <CTASection />
```

Remove the old standalone "Real output, not a mockup" dual-panel section (its `PanelScoring` moves into the new wow section above; its `PanelOutreach` is dropped, already represented by the ProductCards Smart Outreach card). Remove `<ValueProps />` and `<SolutionsSection />` from the render entirely.

- [ ] **Step 3: Footer manifesto link.** In the footer's Company column, add a link: `<a href="/manifesto" ...>Why KithNode</a>` using the same classes as the sibling footer links.

- [ ] **Step 4: Verify** `npx tsc --noEmit 2>&1 | tail -3 && npx eslint src/app/page.tsx`. No errors (watch for unused imports). Then `curl -s -o /tmp/h.html -w "%{http_code}\n" http://localhost:3000/` (expect 200) and `grep -oiE "What KithNode won't do|Know exactly who to talk to|Questions, answered" /tmp/h.html` (all present) and `grep -oiE "Three steps to your warmest|alumni mapped" /tmp/h.html || echo gone` (ValueProps/Solutions gone).
- [ ] **Step 5: Commit** `git add src/app/page.tsx && git commit -m "feat(landing): restructure to Cluely skeleton (wow + objection + FAQ; cut dupes)"`

---

### Task 8: Full verification + draft-only pre-publish check

**Files:** none (verification only)

- [ ] **Step 1: Draft-only check (BLOCKING).** Confirm the beta outreach flow is draft-only. Read `src/lib/outreach.ts` and `src/app/api/outreach/draft/route.ts` and grep for any send path: `grep -rniE "nodemailer|resend\\.|sendMail|transport\\.send|messages.create|/send" src/lib/outreach.ts src/app/api/outreach`. Expected: the outreach flow produces a draft only; no automatic send to targets. If a send/auto-send path exists for user outreach, STOP and report — the hero/objection/FAQ "you send it yourself" copy must change or that path must be gated off for beta.
- [ ] **Step 2: Gate.** Run `cd /Users/scrigot/projects/apps/kithnode && npm run test && npx tsc --noEmit && npx eslint src`. Expected: 1127+ tests pass, tsc clean, lint clean.
- [ ] **Step 3: Em-dash + fabrication scan.** `git diff main...HEAD -- src/app/_landing src/app/page.tsx src/app/manifesto | grep -E "^\\+" | grep "—"` (expect none) and re-grep rendered components for `Activity Signals|Reachability|alumni mapped|276` (expect none in rendered files).
- [ ] **Step 4: Browser proof.** Start the dev server (preview_start "KithNode"), screenshot `/` (the new section flow) and `/manifesto`. Confirm: hero anti-automation line, the AI-scoring wow, the objection block, the FAQ, one clear primary CTA at hero + mid + close.
- [ ] **Step 5: Report** the final section order, the gate result, and the draft-only finding. Note that the batch still needs to deploy (gated on Sam) for the next Swarm run to test it.

---

## Self-Review (completed)

- **Spec coverage:** Hero (T2), how-it-works/card tour (kept, T7), AI-scoring wow (T7), objection handler (T7), founder note (T3), FAQ (T4/T7), final CTA (T6), manifesto (T5), trimmed nav (T1), cut dupes (T7), draft-only check (T8). All spec sections mapped.
- **Placeholder scan:** New-component code is complete (FAQ, objection block, manifesto, hero/founder/CTA copy verbatim). Edits to navbar/cta/testimonials instruct read-then-replace with exact target copy.
- **Consistency:** `FAQ` named export used in T4 and rendered in T7. `PanelScoring` reused, `PanelOutreach`/`ValueProps`/`SolutionsSection` removed consistently. Signal vocabulary matches across hero, wow, objection, FAQ.
