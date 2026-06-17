# Access Boundary - What Interns Never Touch

Every intern reads and signs this before getting any account. It is short on purpose.

## The trust plane (no intern access, ever)

| Surface | Why it is fenced off |
|---------|----------------------|
| Stripe (keys, dashboard) | Fake-payment and refund risk; one mistake is real money |
| Supabase service role key + direct prod DB | The service role bypasses RLS. App-layer owner-scoping is the only tenant guard. We already fixed a cross-tenant takeover bug; do not reopen it |
| Production env vars | A leaked secret is an incident. Only `NEXT_PUBLIC_*` vars are meant to cross the bundle |
| RLS policies (Supabase dashboard) | Every table's tenant isolation lives here, not in Prisma. Changing it wrong leaks student data |
| AutoGuard controls (`src/lib/autoguard.ts`) | The kill-switch that stops follow-ups to people who already replied. Bypassing it kills authenticity, which is the product |
| Vercel / Railway deploys | Shipping is gated on typecheck + lint + test + smoke; one person owns the button |
| GitHub write access (P0) | Code review and the trust plane stay with the founder until there is a hired engineer |
| Student educational records / PII export | FERPA. Student records are not pasted into sheets, Claude Projects, or anywhere outside the product |

## Open product/security items (Sam-owned, not intern work)

From the 0-to-100k roadmap, these are real fixes that remain on the founder's plate and are
explicitly not delegated:

- Remove the service-role-key RLS bypass and enforce real row-level security.
- Move the hardcoded Supabase URL to env config.
- Key `userId` to a stable UUID, not the mutable email.

## The two-plane principle

There are two planes. Interns live on one of them.

- Data and distribution plane (interns): Google Sheets, Slack, Notion, CRM (read/comment),
  PostHog (Viewer), the campus, the community. Work here is low-blast-radius and reversible.
- Trust plane (Sam): Stripe, Supabase, prod env, RLS, banking, cap table, deploy, student PII.

The only hand-off between planes is Sam importing a cleaned sheet into the product. An intern
never holds a prod, financial, or student-PII credential. A bad row in a sheet is a 30-second
revert. A bad row written straight to prod is an incident.

## Acknowledgement

I have read the above. I will not request or use access to any trust-plane surface, and I will
never move student personal data out of the product.

Name: ______________________   Date: ____________
