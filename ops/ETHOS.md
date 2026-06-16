# KithNode ETHOS — Iron Laws (protected)

> The non-negotiable principles every session, agent, and toolkit chain cites before acting. This file is load-bearing: do NOT soften or silently edit a law without Sam's explicit approval. Why/principles live here; codebase patterns live in `AGENTS.md`; routing + session-start live in `CLAUDE.md`; goals live in `ops/roadmap.md`.

## Product
- **AUTHENTICITY IS THE PRODUCT.** Never ship outreach or content that feels robotic.
  - Excuse | Reality: "auto-sending is faster" | robotic outreach kills the only thing KithNode sells.
- **DO NOT BUILD AHEAD OF USERS.** Pre-launch with one real user: make it correct + safe, resist multi-user machinery.
  - Excuse | Reality: "we'll need it at scale" | you have 1 user; speculative machinery is how pre-PMF founders die in a vacuum.

## Security / data
- **RLS POLICY ON EVERY TABLE, IN THE SAME MIGRATION.** New table = enable RLS + at least one policy in the Supabase dashboard; the Prisma migration alone is insufficient.
  - Excuse | Reality: "it's just a prototype table" | prototypes reach prod with the anon key bundled; an unprotected table is a public table.
- **APP-LAYER OWNER-SCOPING IS THE ONLY TENANT GUARD.** The service-role Supabase client bypasses RLS, so every read-then-write path MUST `.eq("importedByUserId", userId)`. A missing filter is a cross-tenant takeover (see `c236acb`).
  - Excuse | Reality: "RLS will catch it" | service-role bypasses RLS; there is no net below the app layer.
- **NEVER** expose the service-role key to the client, bypass the Stripe webhook signature, or bypass AutoGuard.

## Truth / output
- **NO PUBLISHED CLAIM WITHOUT A SOURCE NUMBER.** Every metric in content / marketing / UI traces to a real `ops/build-log.md` or `metrics.ts` value; missing = "n/a", never invented.
  - Excuse | Reality: "round the waitlist up, it's basically there" | that is the Cluely $7M lie at small scale; it ends your credibility.
- **NO EM DASHES. NO EMOJIS.** (Sam's standing output rule.)
- **AUTHORING != REVIEW.** Never self-approve in the same pass; a separate reviewer / verifier (or a toolkit review skill) checks the work.

## Build discipline
- **SHIP -> TEST -> FIX.** Smallest working version, Sam tests, iterate on real feedback. No speculative abstractions.
- **CO-DESIGN NON-TRIVIAL FEATURES.** Brainstorm / PRD before building anything beyond a one-shot fix (see `ops/playbook.md`).
- **VALIDATE ONLY AT SYSTEM BOUNDARIES.** Trust internal code; no error handling for scenarios that cannot happen.
- **CONTEXT7 BEFORE FRAMEWORK CODE.** Next 16 / Tailwind v4 / NextAuth v5 / Prisma v7 / AI SDK v6 all had breaking changes; check docs first.
- **SEARCH POOLS FOR EVERY TYPEAHEAD.** Every search / typeahead input gets a vendored option pool; free text only as a fallback.
