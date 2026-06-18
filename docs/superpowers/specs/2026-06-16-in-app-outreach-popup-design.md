# In-App Outreach Popup — Design

Date: 2026-06-16 · Branch: feat/contact-intelligence · Status: approved design, pre-plan

## Context
The landing page demos a "Draft Outreach" popup: a dark dashboard modal that generates a
personalized email to a contact, highlights the shared/mutual signals in teal ("proof this is a
warm path, not a template"), and offers Open in Outlook / Edit / Regen. Today the real app has a
**plain light slide-over** (`src/app/dashboard/contacts/outreach-slide-over.tsx`) that already calls a
real LLM draft API and offers a generic mailto. Sam wants the landing popup to be the actual in-app
experience.

The good news from exploration: the hard parts already exist.
- **Real LLM draft**: `src/app/api/outreach/draft/route.ts` uses `generateText` (AI Gateway,
  `anthropic/claude-sonnet-4.5`) with a rich prompt (school, Greek org, clubs, firm, affiliations,
  "warm connection phrases", sender context). Returns `{subject, draft}`. Gated by
  `requireSubscription` + `requireCredits(CREDIT_COSTS.draft)`; logs cost to `api_cost_log`.
- **Named mutuals already captured**: `ContactConnection` (Prisma model) stores per-(owner,contact)
  named mutuals from LinkedIn ("people you both know"), parsed/resolved by `src/lib/mutuals.ts` and
  already rendered on the contact page. So "named-mutual tracking" is wiring, not a new subsystem.
- **Shared-attribute detection**: `detectSharedSignals(ctx)` in `src/lib/outreach.ts`
  (university/industry/firm); `AlumniContact` has `email` (default "", filled by enrichment),
  `affiliations`, `greekOrg`, `clubs`.

## Goals
- Replace the light slide-over with a dark dashboard modal matching the landing popup +
  `brand/dashboard.md` (sharp 0px, navy, mono micro-labels, teal).
- Draft references the **named mutual** when one is captured, and **highlights** the mutual +
  shared signals (school, Greek org, firm) in the body.
- Actions: **Open in Outlook** + **Open in Gmail** (web-compose deep links, pre-filled),
  **Edit** (toggle to editable textarea), **Regen with AI**.
- Reuse the real draft API, credits/subscription gating, and PostHog telemetry. Don't regress them.

## Non-goals
- No new mutual-detection logic (the capture pipeline + `ContactConnection` already exist; we only
  READ them here).
- No structured/segmented draft output from the LLM (highlighting is client-side string-match).
- No change to scoring, no new outreach automation, no AutoGuard changes.

## Approach (recommended)
Extend the existing draft API to (a) include captured named mutuals in the prompt and (b) return the
highlight `signals` + `recipientEmail`; build a new `OutreachModal` that replaces `OutreachSlideOver`
at every render site; highlight client-side from the returned `signals`.

Rejected: (B) LLM returns structured highlighted segments — more robust highlighting but forces
fragile structured LLM output; (C) keep the slide-over, add highlighting only — fails the dark-modal
ask.

## Architecture & components

### 1. `src/app/api/outreach/draft/route.ts` (extend, do not rewrite)
- After the contact + ownership + credit checks, query `ContactConnection` for
  `ownerUserId = userEmail` AND `contactId = contactId`; map via `edgesToResolvedMutuals` and take the
  top 1-2 `mutualName`s (prefer ones with a resolved `mutualContactId`, i.e. in the owner's network).
- Add a `MUTUAL CONNECTIONS:` line to the existing prompt: "the sender and contact both know <names>;
  if natural, reference one by name (e.g. 'our mutual friend <name>')." Keep the existing
  prompt-injection guard wording for any free-text.
- Build a `signals: string[]` list = unique of: the captured mutual name(s), the user's
  short school name (reuse `shortSchoolName`/`prefs.university`), `prefs.greekOrg`, the contact's
  `firmName`, and any `detectSharedSignals` details that apply. (Only terms a reader could verify.)
- Return `{ subject, draft, signals, recipientEmail }` where `recipientEmail = contact.email || ""`.
- Unchanged: gating, credit charge, cost logging, placeholder fallback (which must also return
  `signals: []`, `recipientEmail`).

### 2. `src/app/dashboard/contacts/outreach-modal.tsx` (new; replaces `outreach-slide-over.tsx`)
Client component, dark `brand/dashboard.md` styling, centered modal (`fixed inset-0 ...
flex items-center justify-center`, `border-primary/30 bg-card`), mirroring the landing
`EmailMacDemo` modal:
- Header: "Draft Outreach" + a chip "AI Drafting…" (loading) → "AI Drafted" (done).
- To: `contactName` + `recipientEmail` (email shown only when non-empty).
- Subject: editable input.
- Body: **read view** renders `highlightSignals(draft, signals)` segments (teal spans on matches);
  **edit view** is a plain `<textarea>` bound to the draft. An **Edit** button toggles.
- Legend: "Mutual signals, highlighted for relevance" (show only when `signals.length > 0`).
- Actions row: **Open in Outlook**, **Open in Gmail** (anchors to the deep-link builders, `_blank`),
  **Edit**, **Regen with AI** (re-POSTs the API; label notes it uses a credit).
- Preserve the existing PostHog events (`outreach_drafted`, `outreach_draft_generated`,
  `outreach_sent`/`outreach_draft_sent`, `outreach_draft_abandoned`) and the abandon-on-close logic.
- Props: keep `{ contactId|connectionId, contactName, open, onClose }` (the API already accepts
  `contactId ?? connectionId ?? id`).

### 3. `src/lib/outreach-highlight.ts` (new, pure, unit-tested)
- `highlightSignals(text: string, signals: string[]): Array<{ text: string; signal: boolean }>` —
  case-insensitive, whole-ish-term match, longest-first to avoid nested matches, never splits
  mid-word, returns ordered segments. Pure, no React.
- `buildOutlookComposeUrl({to, subject, body})` and `buildGmailComposeUrl({to, subject, body})` —
  pure URL builders (Outlook: `https://outlook.office.com/mail/deeplink/compose?to=&subject=&body=`;
  Gmail: `https://mail.google.com/mail/?view=cm&fs=1&to=&su=&body=`), URL-encoded, blank `to` allowed.

### 4. Wiring
Replace every `OutreachSlideOver` render/import with `OutreachModal` (same props). Render sites to
update (the plan enumerates exact lines): the contacts list/table draft action and the
`warm-signal-card` DRAFT action (`onDraftOutreach`) and any discover surface. Delete
`outreach-slide-over.tsx` once no importers remain (keep its test coverage by porting relevant cases).

## Data flow
DRAFT click → `OutreachModal` opens → POST `/api/outreach/draft {contactId}` → API loads contact +
mutuals, builds prompt, calls the LLM, returns `{subject, draft, signals, recipientEmail}` → modal
renders highlighted body → user edits / Regens / clicks Open in Outlook|Gmail (deep link) → PostHog
`outreach_sent`.

## Error handling
- API failure → modal shows the existing error state ("Could not generate draft. Please try again.").
- No mutuals captured / no email → draft falls back to shared attributes; `signals` may be just
  school/Greek/firm or `[]`; To shows name only; deep-link `to` blank. All graceful, no crash.
- Regen failure → keep the prior draft, show a non-blocking error.

## Testing
- Unit: `highlightSignals` (matches, case-insensitivity, overlapping/longest-first, no mid-word, empty
  signals), `buildOutlookComposeUrl`/`buildGmailComposeUrl` (encoding, blank to). Vitest.
- API: the draft route's new mutual-fetch + `signals`/`recipientEmail` shape (mock supabase +
  `generateText`), including the no-mutuals and placeholder-fallback paths. Do NOT import NextAuth in
  the test (repo rule) — follow the existing route-test mocking pattern.
- Component: port the existing `outreach-slide-over.test.tsx` cases to the modal (loading, draft
  render, abandon-on-close, open-in actions) + a highlighted-body case.
- Gate: `npm run typecheck && eslint src && vitest run` green. Manual: dashboard → contact → DRAFT →
  modal drafts, highlights, Outlook/Gmail open pre-filled, Edit/Regen work.

## Risks & decisions (locked with Sam, 2026-06-16)
- **Scope**: faithful port of the whole popup.
- **Highlight = named mutuals + shared attributes**; named-mutual tracking already exists
  (`ContactConnection`), only conditional (present when captured via the LinkedIn extension).
- **Send = Outlook + Gmail web-compose deep-link buttons** (not generic mailto).
- **Regen charges a credit** (API bills per draft) — surfaced in the UI so it's not a surprise.
- Highlighting is string-match → a term only lights up if the LLM used it (prompt nudges it).
- Contact `email` is often "" → To name-only, deep-link `to` blank.

## Out of scope (possible fast-follows)
- Capturing mutuals for contacts that don't have them yet (that's the extension's job).
- Server-authoritative highlight segments. A "copy to clipboard" / generic mailto tertiary action.
- Sending email directly from KithNode (we hand off to Outlook/Gmail; no inbox integration).
