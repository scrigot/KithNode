# KithNode Tasks (canonical)

> Agents: read at session start, update before you finish. This is the source of truth for "what's next." Full shipped history is in build-log.md.
> Gate backbone (lanes x gates, the Founder OS): `ops/roadmap.md`. KithNode is at **G0**. Tag new tasks `[Lane][Gn]`.

## Now (active)
- [ ] [Product/Eng][G0] Beta launch prep (one real user today; beta this week)

## Next
- [ ] [Growth][G0] Marketing Phase 0 wiring: source-tag the /waitlist (`?source=` capture) + add lead-magnet download to /waitlist/thanks. See `marketing/strategy.md`.
- [ ] [People/Hiring][G0] Stand up the intern-ready ops kit (see `ops/scaling/`): run the week-1 setup checklist in `ops/scaling/README.md`.
- [ ] [Sales][G0] Build the procurement answer-library Claude Project (FERPA / security questionnaire / SSO / DPA) per `ops/scaling/automation-map.md`.
- [ ] [Ops][G0] Trust-plane automation backlog (Sam-owned): email-inbound reply webhook, Loops sequence wiring, batch enrichment runner. See `ops/scaling/automation-map.md`.

## Blocked
- (none)

## Done (recent; see build-log.md for detail)
- [x] KN-FU1: GET privacy-blanking regression tests (0907d5b)
- [x] KN-FU2: findPoolRow `.single()` to `.maybeSingle()` (5182b5f)
- [x] Cross-tenant takeover fix + link-on-match + read-side privacy scoping (c236acb, 9240068)
- [x] KN-001..008 MVP stories
