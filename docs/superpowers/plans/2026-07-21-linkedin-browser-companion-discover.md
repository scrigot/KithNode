<!-- /autoplan restore point: /Users/scrigot/.gstack/projects/scrigot-KithNode/fix-railway-backend-port-autoplan-restore-20260721-175011.md -->

# KithNode Guided Network Research and Optional Browser Companion Plan

Status: **APPROVED** on 2026-07-21. Ship the web-first Guided Network Research foundation, followed by a private unpacked no-DOM companion for the owner; public extension distribution remains deferred.

## Summary

Turn Network → Discover into a guided research workspace that starts with an opportunity or firm gap, helps the user identify a relevant person, accepts attributable evidence from approved sources, and turns the reviewed result into a contact or next relationship action.

The first release is complete in the web app. KithNode may open an approved external research link in a normal browser tab, but it preserves a compact evidence form and draft in KithNode. After that foundation passes its security and workflow gates, the owner may use a private unpacked Chrome side panel as an optional accelerator. Broader beta or public distribution remains demand-gated. The workflow never sends messages, connects, applies, crawls search results, or runs unattended.

LinkedIn currently says browser extensions may not scrape or copy its profiles. The existing KithNode extension does parse the rendered LinkedIn DOM, so that behavior is a product and account-safety risk even though it is user-triggered and limited to one profile. The approved direction is the compliant companion path: official exports, user-provided text, manual fields, and approved APIs. DOM capture remains disabled by default.

## Where Discover Is Now

Discover still exists at `/dashboard/discover`. It moved from the primary sidebar into the Network workspace:

```text
Network
├── People
├── Discover
├── Relationship pipeline
├── Firms & coverage
└── Graph
```

The primary sidebar marks Network active for `/dashboard/discover`, and `NetworkNav` renders the Discover tab. The route is stable. The product problem is visibility: users who remember Discover as a top-level item can reasonably think it was removed.

Plan response:

- Keep Discover under Network because discovery is part of building a network.
- Add a visible “Discover people” quick action on Overview and Network.
- Add a short Network landing explanation that distinguishes People, Discover, Pipeline, Firms, and Graph.
- Preserve `/dashboard/discover` and all existing links.

## Current Product Assets to Reuse

| Capability | Existing implementation | Plan use |
|---|---|---|
| Discover deck | `/dashboard/discover`, `/api/discover`, `/api/discover/run`, rating and pipeline actions | Keep as the KithNode pool mode; add a guided LinkedIn research mode beside it |
| LinkedIn Studio | `/dashboard/linkedin`, `LinkedInProfile`, immutable revisions, deterministic audit | Use for the signed-in user's own profile copies and audits |
| Extension side panel | `extension/manifest.json`, `panel.*`, `background.js`, `content.js` | Keep the side-panel shell, pairing UI, explicit user gesture, and review form |
| Extension authentication | `ExtensionToken`, `/api/extension/token`, bearer scopes, revocation | Keep; remove reliance on cross-origin session cookies from the documented setup |
| Contact ingest | `/api/extension/ingest` | Reuse its user ownership, LinkedIn URL dedupe, scoring, mutual edges, and provenance |
| Profile-copy ingest | `/api/linkedin-profiles` | Reuse for “Audit my profile” after reviewed import |
| AI text extraction | `/api/extension/extract` | Use only on text the user explicitly pastes or provides through an approved source |
| Contact enrichment | `/api/contacts/enrich`, `ContactFieldProvenance` | Reuse behind explicit approval and show provider cost and field source |
| LinkedIn data import | `/dashboard/settings/data/import`, `/api/import/linkedin` | Prefer LinkedIn’s official connection export for initial network import |
| Personal discovery leads | `MeDiscoveryLead` and `/api/me/discover/leads` | Reuse the validated lead shape concept, but do not couple the main workspace to `/me` tables |

## Policy and Platform Facts

- LinkedIn’s official help page says third-party browser extensions may not scrape or copy profiles or other service data. This includes browser plug-ins and add-ons: <https://www.linkedin.com/help/linkedin/answer/a1341387/prohibited-software-and-extensions>
- LinkedIn provides an official account-data download. The archive can include the user’s profile sections and first-degree connection fields: <https://www.linkedin.com/help/linkedin/answer/a1339364/download-your-account-data>
- LinkedIn’s generally available OpenID Connect access covers the authenticated member’s basic profile and email. Broader profile access requires approved products or partner permissions: <https://learn.microsoft.com/en-us/linkedin/shared/authentication/getting-access>
- LinkedIn’s Profile API documentation says profile data may only be stored for the authenticated member with permission, not other members: <https://learn.microsoft.com/en-us/linkedin/shared/integrations/people/profile-api>
- Chrome’s Side Panel API is designed for a companion UI beside a web page and can open following a user action: <https://developer.chrome.com/docs/extensions/reference/api/sidePanel>
- Chrome’s `activeTab` permission grants temporary access only after an explicit user gesture and loses access after cross-origin navigation: <https://developer.chrome.com/docs/extensions/develop/concepts/activeTab>

## Premise Alternatives

### A. Compliance-first browser companion, recommended

KithNode opens LinkedIn searches and profiles in a real tab. The side panel does not read the LinkedIn DOM. It lets the user paste selected profile text, enter a URL, or import an official LinkedIn data export. KithNode structures the user-provided text, shows a field-by-field diff, and saves only after review.

For the user’s own profile, support LinkedIn account-data archive import first and optional LinkedIn OIDC basic identity later. For other people, support manual URL plus pasted text and the official first-degree connections export. Keep paid PDL enrichment approval-gated.

Benefits: lowest account and policy risk, clear consent, strong provenance, deployable as a real product. Cost: it is not a magical one-click copy of another member’s profile.

### B. User-triggered one-profile DOM clipper

Keep the current content-script parser. KithNode opens a LinkedIn tab, the user clicks “Read this profile,” reviews every field, and explicitly saves it. No search-page harvesting, no background crawling, and no messaging.

Benefits: best user speed and much of it is already implemented. Cost: LinkedIn’s official guidance explicitly prohibits extensions that scrape or copy profiles, so the account, distribution, and product risk remains even with one-at-a-time capture.

### C. Official LinkedIn APIs and exports only

Use LinkedIn OIDC for the signed-in user’s basic profile and LinkedIn data exports for the user’s own profile and connections. Do not ship a LinkedIn-page extension.

Benefits: cleanest policy posture and easiest production review. Cost: LinkedIn’s open APIs do not provide full profile copies or other members’ profiles, so guided discovery and targeted enrichment become much weaker.

## Proposed User Journeys

These journeys use the approved Alternative A.

### 1. Audit my LinkedIn profile

1. Open Career Toolkit → LinkedIn Studio.
2. Choose “Import from LinkedIn.”
3. Select one source: official LinkedIn data archive, LinkedIn OIDC basic profile, pasted profile text, structured JSON, or manual editor.
4. KithNode parses into every supported section and labels each field with source and capture date.
5. The user reviews a field-by-field preview before creating or updating a profile copy.
6. LinkedIn Studio runs the deterministic audit, shows missing sections and keyword gaps, and creates revision suggestions.
7. Saving creates an immutable revision. KithNode never publishes changes back to LinkedIn.

### 2. Research and save another person

1. Open Network → Discover → LinkedIn research.
2. Choose a goal such as target firm, role, school, location, or connection path.
3. KithNode builds an approved research link and opens it in a real browser tab.
4. The persistent KithNode evidence form lets the user paste selected text or enter four minimal facts manually. A later extension may accelerate this handoff but is not required.
5. KithNode detects possible duplicates by canonical LinkedIn URL, slug, normalized name plus firm, and email when present.
6. The review sheet compares captured values with existing values. No non-empty verified field is silently overwritten.
7. The user chooses “Save as new contact,” “Update existing contact,” “Save as research lead,” or “Discard.”
8. The result appears in People and can be attached to a relationship pipeline or opportunity.

### 3. Enrich an existing contact

1. From a contact, enrichment gaps, firm coverage, or Discover, choose “Research on LinkedIn.”
2. KithNode opens the stored profile URL or an approved people-search URL.
3. The KithNode evidence editor shows which fields are missing and why they matter.
4. The user supplies reviewed text or values.
5. KithNode renders a diff with source, confidence, and freshness for every proposed change.
6. The user approves selected fields. Unselected fields remain unchanged.
7. If the user requests PDL, show the estimated credit cost and require a separate approval.

### 4. Discover people at an under-covered firm

1. Firms & coverage identifies a gap such as no recruiter, no senior contact, only cold contacts, or stale relationships.
2. Choose “Find people at this firm.”
3. Discover opens with firm, role, seniority, location, and school filters prefilled.
4. KithNode provides LinkedIn search links and keeps a small research queue.
5. Each person is reviewed one at a time and can be saved as a contact or research lead.
6. New contacts immediately update the firm coverage score and suggested next actions.

## Product Organization

Discover becomes one workspace organized by recruiting intent:

```text
Network → Discover
├── Suggested people
├── Research a target
└── Review queue
```

The existing Alumni, Professors, and Students pools remain filters inside Suggested people. LinkedIn, official exports, manual entry, and approved enrichment appear as evidence sources inside a research task, not as top-level navigation.

The first screen answers three questions:

1. Who are you trying to find?
2. Why would this person improve your recruiting position?
3. What will happen when you open LinkedIn?

Primary actions:

- Find people at a firm
- Find recruiters or hiring managers
- Find alumni and mutual paths
- Enrich an existing contact
- Review unfinished research

## Optional Browser Companion Architecture

This architecture is deferred until the web foundation passes release-zero ownership/security work and the release-one web journey. The owner-only unpacked companion may then ship for personal dogfooding against the same contracts. Persisted capture sessions, broader beta access, and public distribution remain behind the demand gate.

```text
KithNode Discover or Contact
  |  create reviewed browser task
  v
ExtensionCaptureSession API
  |  returns task id + safe LinkedIn URL
  v
KithNode bridge content script
  |  validates origin, command, and URL
  v
Chrome background worker
  |  opens LinkedIn tab after user click
  v
Chrome side panel
  |  shows task, accepts user-provided data, previews diff
  v
KithNode review API
  |  dedupe + validate + provenance + approval
  v
LinkedInProfile, AlumniContact, or DiscoveryLead
```

### Web application

- Add a LinkedIn research mode to `/dashboard/discover` without removing the existing deck.
- Add “Research on LinkedIn” actions to contact details, firm coverage, enrichment gaps, and LinkedIn Studio.
- Add an active-task banner and recent-capture list.
- Add a review side sheet with field-level accept/reject controls.
- Add clear recovery messages for extension missing, token expired, LinkedIn tab closed, parse failure, duplicate found, and save failure.

### Extension

- Keep Manifest V3, `activeTab`, `scripting`, `storage`, and `sidePanel`.
- Narrow persistent LinkedIn host access where possible. Use `activeTab` for user-triggered access.
- Add a KithNode-origin bridge content script restricted to configured local and production origins.
- Validate all incoming commands against a small allowlist. Never accept arbitrary protocols or arbitrary external hosts.
- Store the revocable pairing token in extension local storage. Never expose it to LinkedIn page scripts.
- Show current KithNode identity, token status, active task, source mode, and destination before saving.
- Keep one-profile-at-a-time behavior. No search-result scraping, automatic tab navigation, background capture, connection requests, messages, or scheduled work.
- Add a diagnostic mode that reports which section could not be read without uploading raw page content.
- Add fixture-based parser tests only if Alternative B is selected.

### Server APIs

Reuse existing routes where their contracts fit:

- `POST /api/extension/token`
- `POST /api/extension/ingest`
- `POST /api/extension/extract`
- `POST /api/linkedin-profiles`
- `POST /api/contacts/enrich`

Add the minimum coordination routes:

- `GET/POST /api/extension/capture-sessions`
- `GET/PATCH /api/extension/capture-sessions/:id`
- `POST /api/extension/capture-sessions/:id/preview`
- `POST /api/extension/capture-sessions/:id/commit`

Every route must use the authenticated UUID or a scoped extension token. Capture-session reads and writes are tenant-scoped. Commits require an idempotency key and reject stale previews.

### Data model

Add `ExtensionCaptureSession` only if the review confirms the web-to-extension task handoff needs persistence:

- `id`, `userId`, `kind`, `status`, `targetContactId`, `targetProfileId`
- `sourceUrl`, `sourceMode`, `requestedFields`, `capturedPayload`
- `previewPayload`, `resultType`, `resultId`, `errorCode`, `errorDetail`
- `createdAt`, `expiresAt`, `reviewedAt`, `completedAt`

Reuse `ContactFieldProvenance` for committed contact fields. Add profile-field provenance inside the versioned LinkedIn profile document unless cross-profile querying proves necessary. Do not create a second canonical contact table.

For unsaved candidates, add a main-workspace `DiscoveryLead` only if the existing `AlumniContact` lifecycle cannot represent a review queue without polluting People. Its shape should borrow validation from `MeDiscoveryLead` but use authenticated UUID ownership and server-only RLS.

## Data Rules

- Captured or pasted information is unverified until the user reviews it.
- A model may structure text but may not invent missing facts.
- Every proposed field shows source, capture time, confidence, and whether it was manually verified.
- Empty captured values never erase stored non-empty values.
- Existing manually verified values win unless the user explicitly replaces them.
- Dedupe before insert and again inside the commit transaction.
- Raw pasted profile text has a short retention window and is removed after commit or expiry. Store only the reviewed structured result long term.
- Paid enrichment is a separate approval with estimated credits.
- Other people’s profile copies are stored as contacts or research leads, not as the user’s own LinkedIn Studio profile.

## Security and Privacy

- Do not collect LinkedIn credentials, cookies, session storage, tokens, or network traffic.
- Do not proxy a logged-in LinkedIn session through KithNode.
- Do not embed LinkedIn in an iframe or remote browser inside the web app.
- Restrict extension commands to `https://www.linkedin.com/in/*` and approved people-search URLs.
- Reject `javascript:`, `data:`, private-network URLs, URL credentials, non-HTTPS production destinations, and open redirects.
- Pairing tokens are hashed server-side, scoped, revocable, and returned once.
- Add token expiry and rotate-on-demand. Show last use and device name in Settings → Integrations.
- Rate-limit capture session creation, preview extraction, and commits per user and token.
- Sanitize pasted text, cap input size, and treat it as untrusted content that cannot issue tool instructions.
- Log capture lifecycle metadata without logging tokens or raw profile text.

## Error and Recovery Contracts

| Failure | What the user sees | Recovery |
|---|---|---|
| Extension missing | “Install or reload the KithNode companion” | Link to install instructions and manual paste flow |
| Pairing token missing or revoked | “This browser is not paired” | Open Settings → Integrations and create a new token |
| LinkedIn blocks or changes the page | “KithNode could not read this page” | Use paste/manual mode; never retry in a loop |
| Task expired | “This research task expired” | Reopen from the original contact or Discover query |
| Duplicate found | Side-by-side existing and proposed contact | Update existing, save as lead, or discard |
| Model unavailable | Preserve pasted text locally and show manual fields | Retry extraction or continue manually |
| Database unavailable | Preserve the reviewed draft in extension storage | Retry when readiness recovers |
| Partial save | Show exactly which destination saved | Retry idempotently; never duplicate the contact |
| Paid enrichment unavailable | Save the reviewed capture without PDL fields | Retry PDL later from enrichment gaps |

## Tests

### Extension

- Manifest permissions and prohibited-permission regression tests.
- KithNode bridge origin validation and command allowlist tests.
- LinkedIn URL normalization and unsafe URL rejection tests.
- Pairing token setup, expiry, revocation, and rotation tests.
- Side-panel keyboard, focus, loading, empty, partial, success, and error states.
- User-gesture enforcement for opening tabs and the side panel.
- Local draft recovery after network or database failure.
- Parser fixture tests and graceful selector degradation only if Alternative B is selected.

### APIs and data

- Tenant isolation for every capture-session route.
- Token scope enforcement and cross-user token rejection.
- Stale preview rejection and commit idempotency.
- Contact and LinkedIn URL dedupe races.
- Provenance correctness for pasted, manual, extension, PDL, and model-structured fields.
- Prompt-injection and oversized-input tests for text extraction.
- Expiry cleanup without deleting committed data.
- Failure injection for database, model, PDL, and browser-task timeouts.

### Browser journeys

- Find people at a target firm, open LinkedIn, review a candidate, and save a lead.
- Open an existing contact, research missing fields, approve selected changes, and verify provenance.
- Import the user’s LinkedIn archive, create a profile copy, audit it, and save a revision.
- Handle extension missing, token revoked, duplicate found, LinkedIn page unavailable, and model outage.
- Verify mobile Discover provides search links and review queues but clearly states the desktop extension requirement.

## Rollout

1. Correct navigation explanation and update the stale extension documentation.
2. Harden pairing tokens, identity display, token expiry, and diagnostic states.
3. Ship LinkedIn archive import for the user’s own profile and connections.
4. Add LinkedIn research mode, safe search-link builder, and manual/paste review flow.
5. Add capture-session coordination between KithNode and the side panel.
6. Add contact enrichment diff and selective field approval.
7. If Alternative B is explicitly approved, gate DOM capture behind a personal-use feature flag and do not publish it as a public integration without separate legal review.

Feature flags:

- `ENABLE_LINKEDIN_BROWSER_COMPANION`
- `ENABLE_LINKEDIN_RESEARCH`
- `ENABLE_LINKEDIN_DOM_CAPTURE` default `false`

## Not in Scope

- Crawling LinkedIn search results or profile lists.
- Bulk profile capture.
- Automated profile visits or navigation.
- Sales Navigator parsing.
- Sending connection requests or LinkedIn messages.
- Publishing profile changes back to LinkedIn.
- Collecting LinkedIn cookies or credentials.
- Remote-browser infrastructure that stores a user’s LinkedIn session.
- Automatic paid enrichment.
- Replacing the existing KithNode pool Discover deck.

## Initial Implementation Tasks

- [ ] T1: Confirm the browser-data premise at the human gate.
- [ ] T2: Update `docs/LINKEDIN-EXTENSION-SPEC.md` and `extension/README.md` to match what is already built and the approved policy posture.
- [ ] T3: Add Discover visibility and Network workspace explanation.
- [ ] T4: Harden pairing token expiry, rotation, identity display, and setup diagnostics.
- [ ] T5: Build LinkedIn archive import for own-profile sections and first-degree connections.
- [ ] T6: Add Discover LinkedIn research mode and safe search URL builder.
- [ ] T7: Add capture-session coordination only if validated by the engineering review.
- [ ] T8: Build the review diff, destination selection, dedupe, provenance, and idempotent commit.
- [ ] T9: Connect enrichment gaps and firm coverage to guided LinkedIn research.
- [ ] T10: Add extension, API, data-isolation, security, accessibility, and end-to-end tests.

## Assumptions Requiring Confirmation

1. The goal is a daily personal recruiting tool, not a LinkedIn automation product.
2. “In-app browser” means a coordinated real browser tab plus KithNode side panel, not an iframe or server-hosted LinkedIn session.
3. The user must review one person at a time before any data is saved.
4. Discover should stay under Network and gain stronger entry points rather than return to the primary sidebar.
5. LinkedIn Studio is for the signed-in user’s own profile versions. Other profiles become contacts or research leads.
6. Automatic messages, connections, applications, profile publication, crawling, and paid enrichment remain prohibited without explicit separate approval.
7. Official exports, user-provided text, and approved APIs are the allowed sources. DOM capture is disabled by default and is not part of the public product.

## Approved Premise Gate

Decision: Alternative A, compliance-first browser companion.

The product will coordinate a real LinkedIn tab with KithNode's Chrome side panel. It will not embed or proxy LinkedIn, collect LinkedIn credentials or cookies, crawl pages, or read the LinkedIn DOM in the public workflow. Users provide selected text, URLs, manual facts, or official exports; KithNode structures and previews that material before an explicit save.

This keeps the high-value loop intact: find a relevant person, understand why they matter, review attributable facts, deduplicate, enrich a contact or create a research lead, and update firm coverage. The tradeoff is one extra user action compared with one-click DOM capture.

## Phase 1: CEO Review

Mode: SELECTIVE EXPANSION. Keep the approved policy boundary, reuse the existing product, and add only work that strengthens the recruiting-outcome loop.

### Premise challenge

| Premise | Verdict | Plan response |
|---|---|---|
| The product is a daily recruiting tool, not LinkedIn automation | Valid | Make opportunity and firm progress the outcome; LinkedIn is one evidence source |
| An in-app browser can embed LinkedIn | Invalid | Use a normal browser tab plus optional Chrome side panel |
| Users will repeatedly paste full profiles | Unproven | Validate a minimal four-field save flow before building browser coordination |
| One-at-a-time review is acceptable | Valid for launch | Measure median save time, abandonment, and seven-day repeat use |
| Discover belongs under Network | Valid | Keep the URL and add stronger entry points from Overview, firms, contacts, opportunities, and Copilot |
| Turning off extension DOM capture creates a policy-safe system | Incomplete | Inventory and disable every automated LinkedIn read path, including server-side metadata reads |
| A LinkedIn-specific capture model will age well | Invalid | Use source-neutral research tasks and evidence drafts; LinkedIn is an adapter |

### Strategic reframing

The product is **Guided Network Research**. The browser extension is optional delivery infrastructure.

```text
CURRENT
  scattered Discover pool + contact enrichment + LinkedIn clipper
      |
      v
THIS PLAN
  opportunity or firm gap
      -> suggested research target
      -> safe outbound research link
      -> reviewed evidence
      -> contact or research lead
      -> next relationship action
      -> measurable coverage improvement
      |
      v
12-MONTH IDEAL
  source-neutral relationship intelligence
      -> recommends who matters and why
      -> accepts evidence from approved sources
      -> preserves provenance and user control
      -> learns which network actions advance opportunities
```

### Implementation alternatives

| Approach | Completeness | Human effort | CC effort | Risk | Decision |
|---|---:|---:|---:|---|---|
| No-extension guided research MVP | 8/10 | 3-5 days | 4-8 hours | Low | Ship first |
| Web workflow plus optional side-panel accelerator | 10/10 | 1-2 weeks | 1-2 days | Medium | Owner-only after web foundation; broader release after repeat-use evidence |
| Persisted capture-session orchestration from day one | 10/10 | 2-3 weeks | 2-4 days | Medium-high | Defer until handoff/recovery need is measured |

### Existing code leverage map

| Sub-problem | Existing code | Decision |
|---|---|---|
| Ranked internal people | `/dashboard/discover`, `/api/discover`, `/api/discover/run` | Keep and reorganize around intent |
| Contact ownership and dedupe | `/api/extension/ingest`, `AlumniContact` | Extract source-neutral preview and commit services |
| Own-profile editor and audit | `/dashboard/linkedin`, `LinkedInProfile`, revisions, audit functions | Reuse without a second editor |
| Pairing and revocation | `ExtensionToken`, `/api/extension/token`, `extensionIdentity` | Reuse; add expiry, device label, and last-use UI |
| Evidence source tracking | `ContactFieldProvenance` | Reuse for every committed field |
| Paid enrichment | `/api/contacts/enrich` and approvals | Keep separate and approval-gated |
| Firm gaps | firm coverage skill and `/dashboard/edge` | Make this a primary research entry point |
| Opportunity context | canonical `Opportunity` and application workspace | Attach research tasks and outcomes |
| Official LinkedIn connections | `/api/import/linkedin` | Separate CSV/archive parsing from any page metadata read |

### Scope decisions

Accepted:

- Rename the feature direction to Guided Network Research.
- Make the web app complete without the extension.
- Add a policy inventory and one server-enforced source-policy module before new feature work.
- Organize Discover by user intent: Suggested people, Research a target, Review queue.
- Use source-neutral `ResearchTask` and `EvidenceDraft` concepts.
- Add outcome metrics tied to coverage and next actions.

Deferred:

- Persisted cross-device capture sessions until the minimal workflow proves repeat use.
- Public Chrome Web Store distribution until legal, privacy, and permission reviews pass.
- LinkedIn OIDC beyond basic signed-in identity until product access is approved.

Rejected:

- A general-purpose LinkedIn profile copier.
- Any public DOM scraping mode.
- A second canonical contact table.

### Temporal interrogation

```text
HOUR 1       Find a weak target firm and save one relevant person with a reason.
HOURS 2-3    Enrich selected missing fields and create a concrete next action.
HOURS 4-6    Repeat across active opportunities; coverage scores visibly improve.
WEEK 1       Review which research sessions produced outreach, meetings, or application progress.
MONTH 1      Keep only sources and flows that reduce time-to-action and drive repeat use.
```

### System architecture

```text
Overview / Opportunity / Firm / Contact / Copilot
                    |
                    v
        Guided Research entry contract
                    |
          +---------+----------+
          |                    |
          v                    v
 Suggested people       Research a target
 existing Discover      safe URL builder
          |                    |
          +---------+----------+
                    v
              Evidence draft
        local-first, source-neutral
                    |
                    v
          Preview + duplicate check
                    |
             explicit approval
                    |
        +-----------+------------+
        v                        v
 existing contact           research lead
 + provenance               if not ready
        |
        v
 coverage recalculation + next action

Optional later accelerator:
Chrome side panel -> same Evidence draft and Preview contracts
```

Coupling rule: feature entry points depend on one guided-research contract. They do not depend directly on extension code or LinkedIn-specific models.

### Data flows and shadow paths

```text
Research intent
  -> validate goal and destination
     nil: show intent picker
     empty: preserve form and explain required fields
     invalid destination: 404 without leaking ownership
  -> build allowlisted source URL
     unsupported source: offer manual entry
     unsafe URL: reject before navigation
  -> collect user-provided evidence
     empty: allow minimal manual fields
     oversized: reject with size limit
     model failure: keep text locally and expose manual fields
  -> preview
     duplicate: side-by-side merge choice
     stale destination: reload before commit
  -> commit transaction
     conflict: re-read and regenerate preview
     database error: retain local draft and retry idempotently
  -> outcome
     contact/lead saved, provenance written, coverage recomputed
```

### Research task state machine

```text
draft -> ready -> opened -> reviewing -> committed
  |       |        |          |            |
  +-----> cancelled <---------+            +-> immutable result reference
           |
           +-> expired

Invalid transitions:
committed -> reviewing     rejected
expired -> committed       requires a new preview
cancelled -> committed     rejected
cross-user destination     authorization failure
```

For the first release this state may remain client-local plus a short-lived signed task ID. Add database persistence only when asynchronous recovery or a review queue proves necessary.

### Error and Rescue Registry

| Method or codepath | Failure | Typed code | Rescue | User sees |
|---|---|---|---|---|
| source policy check | disallowed automated read | `source_not_allowed` | block before request | “This source requires manual entry or an official export.” |
| safe research URL builder | invalid or unsafe URL | `unsafe_source_url` | reject and retain filters | “KithNode could not open that research link.” |
| evidence parser | malformed, refused, empty model output | `extraction_failed` | retain raw text locally; manual form | “We could not structure this text. Continue manually or retry.” |
| evidence parser | oversized input | `input_too_large` | reject before model call | Exact supported limit |
| preview | destination missing or foreign | `destination_not_found` | return tenant-safe 404 | “This contact or opportunity is no longer available.” |
| preview | possible duplicate | `duplicate_detected` | return candidates, no write | Merge, lead, or discard choices |
| commit | stale preview | `stale_preview` | reload and rebuild diff | “This record changed. Review the refreshed differences.” |
| commit | duplicate idempotency key | `already_committed` | return original result | Saved state, no duplicate |
| commit | database unavailable | `database_unavailable` | keep encrypted/local draft | Retry control with draft preserved |
| pairing | expired or revoked token | `pairing_required` | stop write; open settings | “Pair this browser again.” |
| official archive import | unsupported archive/version | `unsupported_archive` | list recognized files | Manual mapping and help path |
| enrichment | provider timeout or credits | `enrichment_unavailable` | preserve reviewed save | Retry enrichment later |

No catch-all may turn these into a generic 500. Logs include request ID, user ID, task kind, destination type, and error code, but never raw evidence or tokens.

### Security and threat model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Old DOM or server-side LinkedIn scraping remains reachable | High | High | Central policy module, default deny, route and extension regression tests |
| Cross-tenant task, preview, or commit access | Medium | High | UUID ownership on every read/write and tenant-isolation tests |
| Prompt injection inside pasted profile text | High | Medium | Treat as inert data, structured schema output, no tool access |
| Stored XSS in evidence or notes | Medium | High | Sanitize, encode on render, CSP, input caps |
| Token theft from page context | Low | High | Extension-local storage, never inject token, scoped hashed tokens, expiry and revocation |
| Sensitive personal data overcollection | Medium | High | Field allowlist, source visibility, deletion/export, retention policy |
| Unsafe outbound links or open redirects | Medium | High | HTTPS allowlist, normalized URLs, no credentials/private hosts |
| Duplicate commits and silent overwrites | Medium | Medium | Transactional dedupe, versioned previews, idempotency keys |

The plan must call this posture “policy-reduced and user-directed” until legal review confirms any stronger claim.

### Interaction edge cases

| Interaction | Edge case | Required behavior |
|---|---|---|
| Open research link | popup blocked | Keep link visible and copyable |
| Minimal save | only URL supplied | Require name, role, and firm or save as incomplete lead |
| Parse text | user navigates away | Keep draft client-local |
| Preview | existing contact changes | Mark stale and rebuild before commit |
| Commit | double click or retry | Same idempotency result |
| Duplicate sheet | multiple plausible matches | Do not auto-merge; require selection |
| Review queue | zero items | Explain how to start from a firm, opportunity, or contact |
| Review queue | many items | Paginate and expire abandoned drafts |
| Mobile | extension unavailable | Full manual research flow remains usable |

### Code quality decisions

- Create one source-neutral `guided-research` domain folder for schemas, URL policy, preview, dedupe, provenance, and commit logic.
- Keep adapters thin: LinkedIn search URLs, official archive parsing, PDL, and future public-source adapters call the same domain services.
- Refactor existing extension ingest logic instead of copying dedupe and scoring code.
- Do not add `ResearchTask` persistence, `DiscoveryLead`, or another service until the existing `AlumniContact` lifecycle is proven insufficient by a testable case.
- Remove stale documentation that says cookie authentication and a future token route are current behavior.

### Test coverage diagram

```text
NEW UX
  intent picker -> unit + browser
  safe outbound link -> unit + browser
  minimal evidence form -> component + browser
  preview/diff -> component + API integration
  merge/save/lead/discard -> API integration + browser

NEW DATA
  evidence -> schema -> preview -> commit -> provenance
  unit schemas + tenant integration + transactional race tests

NEW INTEGRATIONS
  official archive parser -> fixture tests
  optional extension -> manifest, token, origin, local recovery tests
  model extraction -> contract fixtures, refusal, empty, malformed cases

HOSTILE TESTS
  cross-user IDs, poisoned text, unsafe URL, oversized input,
  stale preview, duplicate clicks, revoked token, database outage

CHAOS TEST
  database or model fails after review but before commit;
  draft remains recoverable and retry creates exactly one result
```

### Performance and scaling

- The first likely bottleneck is model extraction, not database writes. Manual fields must bypass it.
- Preview queries use indexed owner plus LinkedIn slug/email/name-firm keys and return bounded candidates.
- Review queues paginate; raw evidence is never loaded in list views.
- Firm coverage recomputation uses the existing scoring path and runs after commit, with a bounded synchronous result or queued refresh if it exceeds the latency budget.
- Target p99: URL generation under 100 ms, preview under 800 ms without a model, commit under 1.5 s, extraction under 15 s with explicit progress.

### Observability

Track:

- `research_started`, `research_link_opened`, `evidence_previewed`, `research_committed`, `research_abandoned`.
- Median time from firm or opportunity gap to saved person.
- Percentage of saves with a credible reason-to-contact.
- Percentage of sessions producing a next action.
- Change in firm coverage after a session.
- Seven-day repeat research rate.
- Model extraction success, manual fallback, duplicate, stale preview, and commit error rates.

Use one correlation ID across web, optional extension, preview, commit, and coverage refresh. Add a support-safe diagnostic view containing lifecycle metadata but no raw evidence.

### Deployment and rollback

```text
1. Land policy inventory, source policy module, flags, and regression tests.
2. Disable DOM and server-side scraping paths in production.
3. Ship navigation visibility and no-extension research MVP.
4. Validate completion time, abandonment, next actions, and repeat use.
5. Ship enrichment diff and coverage update.
6. Add the private unpacked no-DOM side-panel accelerator for the owner after the web foundation passes; require metrics before broader distribution.
7. Ship own-profile archive import on its separate track.
```

Rollback:

```text
Research errors rising?
  yes -> disable ENABLE_GUIDED_RESEARCH
          -> existing Discover and contacts remain available
          -> retain committed data and provenance
  no  -> continue staged rollout

Extension-specific errors?
  yes -> disable ENABLE_RESEARCH_COMPANION
          -> web research remains complete
```

All migrations are additive. Disabling features never drops user data.

### Long-term trajectory

Reversibility: 5/5 if the domain stays source-neutral and the extension remains optional; 2/5 if storage and workflow become LinkedIn-specific.

The source-neutral evidence path can later accept official firm bios, alumni directories, conference pages, approved enrichment, resumes, emails supplied by the user, and manual notes. The durable asset is not captured LinkedIn data. It is an attributable map from recruiting goal to relevant person to relationship action to outcome.

### Design and UX intent

```text
ENTRY CONTEXT
  firm gap / opportunity / contact / Copilot recommendation
        |
        v
RESEARCH TARGET
  what person is missing and why
        |
        v
SAFE RESEARCH
  open source link + compact add form
        |
        v
REVIEW
  field diff + source + freshness + duplicate choice
        |
        v
OUTCOME
  saved person + updated coverage + one suggested next action
```

The primary hierarchy is why this person matters, what evidence is missing, and what action follows. Source and extension mechanics are secondary. Desktop may offer the side panel later; mobile keeps the complete manual path. All steps require visible focus, keyboard operation, labels, 44px touch targets, and reduced-motion support.

### Failure Modes Registry

| Codepath | Failure mode | Rescued | Test | User sees | Logged |
|---|---|---:|---:|---|---:|
| source policy | disallowed legacy read | Yes | Yes | Safe manual/export path | Yes |
| URL builder | unsafe or malformed link | Yes | Yes | Filters retained, correction | Yes |
| extraction | empty/malformed/refusal | Yes | Yes | Manual fallback | Yes |
| preview | duplicate or stale target | Yes | Yes | Merge or refresh sheet | Yes |
| commit | concurrent duplicate | Yes | Yes | Existing saved result | Yes |
| commit | database outage | Yes | Yes | Draft preserved and retry | Yes |
| token | revoked/expired | Yes | Yes | Pair again | Yes |
| archive | unsupported format | Yes | Yes | Recognized-file guidance | Yes |
| enrichment | timeout/credits | Yes | Yes | Base save succeeds | Yes |

### Dream state delta

This plan establishes a source-neutral evidence and approval loop, but it does not yet learn which network actions cause recruiting progress, support team collaboration, or maintain scheduled research queues. Those are later products. The first release proves whether guided research reliably creates relevant contacts and concrete next actions.

### NOT in scope

- Automated browsing, scraping, crawling, messaging, connections, or applications.
- A public LinkedIn profile-copying product.
- Cross-device research queues before repeat-use evidence.
- Remote browser or session proxy infrastructure.
- Automatic paid enrichment.
- Predictive causality claims about network actions and job outcomes.
- Replacing the existing internal Discover pool.

### Phase 1 implementation tasks

- [ ] **C1 (P1, human: ~4h / CC: ~30min)** - Policy - Inventory and disable all automated LinkedIn read paths.
  - Files: `extension/manifest.json`, `extension/content.js`, `extension/panel.*`, `src/lib/discover/signal-detector.ts`, `src/lib/discover/contact-finder.ts`, `src/app/api/import/linkedin/route.ts`
  - Verify: regression tests prove no disabled path fetches or reads LinkedIn page content.
- [ ] **C2 (P1, human: ~1d / CC: ~2h)** - Domain - Extract source-neutral evidence preview and idempotent commit services from extension ingest.
  - Files: `src/app/api/extension/ingest/route.ts`, new `src/lib/guided-research/*`
  - Verify: unit, tenant-isolation, stale-preview, dedupe-race, and idempotency tests.
- [ ] **C3 (P1, human: ~2d / CC: ~4h)** - Product - Ship the no-extension Guided Network Research MVP.
  - Files: `/dashboard/discover`, contact, firm, opportunity, and Copilot entry points.
  - Verify: authenticated browser journey from firm gap to saved person and next action.
- [ ] **C4 (P2, human: ~1d / CC: ~2h)** - Outcomes - Add research funnel and recruiting-outcome metrics.
  - Verify: support-safe events contain no raw evidence.
- [ ] **C5 (P2, human: ~1d / CC: ~2h)** - Privacy - Add source visibility, retention, export, deletion, and sensitive-field rules.
- [ ] **C6 (P2, human: ~2d / CC: ~4h)** - Accelerator - Add private owner-only no-DOM side-panel coordination after the web foundation passes; keep broader use demand-gated.
- [ ] **C7 (P2, human: ~2d / CC: ~4h)** - Own profile - Build official archive import as a separate LinkedIn Studio track.

### CEO completion summary

| Review area | Result |
|---|---|
| Mode | SELECTIVE EXPANSION |
| Premises | 7 evaluated, 3 corrected |
| Architecture | Source-neutral web-first design selected |
| Errors | 12 typed paths, 0 planned silent failures |
| Security | 8 threats mapped, 2 high-priority controls |
| Data and UX | 8 interaction edge cases specified |
| Quality | Shared domain service; no duplicate contact model |
| Tests | Unit, integration, browser, hostile, and chaos layers specified |
| Performance | 4 latency targets and bounded list/query rules |
| Observability | 6 funnel/outcome measures plus correlation IDs |
| Deployment | 7-step staged rollout with two independent flags |
| Future | Reversibility 5/5 when source-neutral |
| Design | Outcome-first five-step journey |
| Scope proposals | 6 accepted, 3 deferred, 3 rejected |
| Critical gaps remaining | 0 after plan changes |

### CEO dual voices

Claude subagent findings:

- Reframe the product as guided network research tied to opportunity and firm outcomes.
- Validate a no-extension four-field save flow before building browser coordination.
- Inventory every LinkedIn-derived read path; disabling only the visible extension reader is insufficient.
- Make research and evidence source-neutral, with the extension as an optional accelerator.
- Use “policy-reduced and user-directed” until privacy and legal review support a stronger claim.
- Organize Discover around intent, not data source.

Codex findings:

- Quarantine the current clipper because an installed content script cannot be disabled by a server flag.
- Repair the canonical person/contact ownership model before adding another ingestion path.
- Do not treat `/api/extension/ingest` as a safe reusable commit contract; it can overwrite fields before provenance is written.
- Keep own-profile archive import in LinkedIn Studio and relationship research in Network.
- Use a web-only demand experiment with explicit activation and retention thresholds.
- Treat Discover visibility as a measured navigation issue, not an assumed rebuild requirement.

```text
CEO DUAL VOICES - CONSENSUS TABLE
====================================================================
Dimension                              Claude    Codex     Consensus
1. Premises valid?                    PARTIAL   PARTIAL   CONFIRMED
2. Right problem to solve?            NO        NO        CONFIRMED
3. Scope calibration correct?         NO        NO        CONFIRMED
4. Alternatives sufficiently explored?PARTIAL   PARTIAL   CONFIRMED
5. Platform risks covered?            NO        NO        CONFIRMED
6. Six-month trajectory sound?        NO        NO        CONFIRMED
====================================================================
```

Cross-model synthesis:

The approved source posture remains valid, but both outside voices reject a browser companion as the first product milestone. Their shared recommendation is a web-complete Guided Network Research experiment, with the extension considered only after repeat use and unique value are proven. This is a user challenge and remains subject to the final Autoplan gate.

The Codex-only contact ownership finding is treated as ship-blocking because it can cause cross-user data corruption. Before any new ingest surface, the engineering plan must resolve whether `AlumniContact` is user-owned or split into canonical `Person` plus user-owned `UserContact`, then make preview, commit, dedupe, and provenance transactional.

Demand gate before broader beta or public extension work. It does not block the approved owner-only unpacked companion after the web foundation passes:

- Run a two-week concierge or web-only test with at least 10 target users or 10 representative guided research sessions for the initial single-user launch.
- At least 70% complete search-to-save without help.
- Median completion is under four minutes.
- At least 50% create a next relationship action.
- At least 30% repeat within seven days.
- Stop or redesign the companion if these thresholds are missed.

## Phase 2: Design Review

Classification: APP UI. Initial design readiness: 6.3/10. Target after plan fixes: 9.2/10.

The gstack designer was available, but image generation failed because the configured OpenAI organization requires verification. No visual mockup was approved in this review. Implementation must use `DESIGN.md` and the specifications below, followed by live `/design-review` QA.

### Canonical information architecture

The earlier source-first split is superseded. Sources are evidence metadata, not navigation.

```text
Network -> Discover
  |
  +-- Suggested people
  |     ranked from goals, opportunities, target firms, and existing network
  |
  +-- Research a target
  |     intent form -> source links -> evidence draft -> review
  |
  +-- Review queue
        incomplete drafts, possible duplicates, and research leads
```

Primary hierarchy on every screen:

1. Why this person or research target matters to an active recruiting goal.
2. The warmest credible path and the evidence still missing.
3. The action that moves the user forward.

Extension state, model confidence, and source mechanics remain secondary metadata.

### Person lifecycle visible to users

```text
Evidence draft
  -> Research lead    incomplete but worth keeping; does not count as a relationship
  -> Contact          minimum identity reviewed; may affect firm coverage
  -> Relationship pipeline
```

Minimum Contact fields: reviewed name plus at least one stable locator or context pair: canonical URL, verified email, or firm plus role. A Research lead may contain less, appears only in Review queue, does not inflate contact metrics, and is promoted by an explicit “Add to People” action. The engineering data model must preserve this distinction without creating ambiguous ownership.

### Research form

The form is one compact, labeled workspace rather than a wizard or card grid.

| Field | Behavior |
|---|---|
| Recruiting objective | Prefilled from active opportunity, goal, or firm; user can change it |
| Firm | Required for firm-driven research; autocomplete from target firms |
| Person type | Recruiter, hiring manager, practitioner, alumnus, connector |
| Function and seniority | Optional filters with clear defaults |
| Location | Optional |
| Shared context | School, prior employer, group, mutual path, or manual note |
| Why this helps | One sentence generated deterministically from the selected objective and editable |

Every result row shows name, role, firm, relationship path, why they matter, source, freshness, and one primary action. Secondary actions live in a row menu.

### Evidence review sheet

Desktop uses a right-side sheet that preserves the research context.

```text
Field          Current value       Proposed value       Include
Name           Samuel Rigot        Samuel Rigot          [locked]
Role           Analyst             Senior Analyst        [x]
Firm           Example Capital     Example Capital       [ ]
Location       blank               New York, NY          [x]
```

Rules:

- Proposed rows have one checkbox and a non-color conflict indicator.
- “Accept all new fields” selects only blank-to-filled changes.
- There is no “Replace all” action.
- Conflicts are reviewed individually.
- Evidence, source date, confidence, and verification live in an expandable row disclosure.
- The footer shows selected field count, destination, and one explicit commit button.
- Mobile converts each row to a stacked current/proposed comparison with the same checkbox semantics.

### Outcome receipt

Saving ends with recruiting progress, not “record created.”

```text
Person saved or updated
  3 reviewed fields added from manual research
  Evercore coverage: 28 -> 41
  Supports: Summer Analyst application
  Next action: Ask Jordan Lee for an introduction

  [Open contact] [Add next action]
```

If coverage refresh is delayed, the receipt says “Coverage update pending” and updates through a live region without blocking the saved result.

### Interaction state matrix

| Surface | Loading | First-use empty | Filtered empty | Error | Partial | Success |
|---|---|---|---|---|---|---|
| Discover landing | skeleton for recommendations | explain three entry paths; primary action “Research a target” | n/a | existing pool stays usable with retry | unavailable sources labeled | top recommendation and target form ready |
| Suggested people | row skeletons | connect goals/import network | clear filters or broaden goal | retain filters and previous rows | stale or missing evidence marked | ranked rows with reasons |
| Research form | prefill shimmer only | labeled fields and one example | n/a | preserve every value | goal unavailable; allow manual objective | research links and evidence form ready |
| Evidence editor | extraction progress with cancel | minimal four-field form | n/a | keep draft locally, manual fallback | parsed fields plus warnings | preview enabled |
| Review queue | row skeletons | explain how drafts are created | clear filter | local drafts remain visible | expired items labeled | draft count and next item |
| Diff sheet | current/proposed skeleton | no changed fields; return to editor | n/a | preserve selection and retry | some evidence unavailable | selected fields committed once |
| Archive import | file validation progress | accepted-file guidance | n/a | recognized files and fix steps | imported sections plus rejected rows | profile or connection summary |
| Optional extension | pairing/task progress | install or use web flow | n/a | exact pairing, origin, or network recovery | draft saved; review in web | task handed back to KithNode |

### User journey storyboard

| Step | User does | Intended feeling | Design support |
|---|---|---|---|
| 1 | Opens Discover from a firm or opportunity | Oriented | Objective and coverage gap appear in the header |
| 2 | Chooses the missing person type | Focused | Five explicit types, not an open-ended search box |
| 3 | Opens a safe research link | In control | Explain external tab, keep a copyable link, preserve draft |
| 4 | Adds minimal reviewed facts | Fast | Four-field path works without AI or extension |
| 5 | Reviews differences | Confident | Current/proposed comparison with source disclosure |
| 6 | Saves | Accomplished | Outcome receipt shows coverage and next action |
| 7 | Returns later | Trusting | Review queue preserves incomplete work and source dates |

Five-second goal: understand who matters and why. Five-minute goal: save one useful person and create a next action. Long-term goal: trust KithNode as the record of how relationships advance recruiting outcomes.

### Trust copy

First use:

> KithNode does not read your LinkedIn page or collect login details. You choose what information to provide, review every change, and can remove saved evidence later.

At paste or manual entry: “Nothing is saved until you review it.”

At commit: “Save selected facts with their source and date.”

Do not repeat legal language on every screen. Keep full policy details in Settings and help.

### Layouts

Desktop web, 1280px and wider:

- Existing app sidebar and `NetworkNav` remain fixed.
- `WorkspaceHeader` contains title, active objective, and one page-level action.
- Intent tabs sit below the header.
- Main content is a full-width result list or form.
- A 420-520px contextual sheet handles evidence and diffs.

Tablet, 768-1279px:

- Sidebar may collapse using the existing shell.
- Intent tabs remain a visible horizontal rail.
- Contextual sheet covers up to 60% width and restores focus on close.

Mobile, below 768px:

- Five-item bottom navigation remains.
- Intent tabs become a horizontally scrollable labeled rail.
- Records become stacked rows grouped by state.
- Evidence and diff review are full-screen routes or sheets.
- The full manual workflow works without an extension.

Optional extension panel, later:

- One column at 360-480px.
- Shows objective, missing fields, evidence form, local draft state, and “Review in KithNode.”
- It never attempts the full comparison table or final conflict merge.

### Accessibility contract

- Semantic `main`, `nav`, `form`, `fieldset`, headings, lists, and tables.
- Visible labels remain after entry; placeholders are examples only.
- Intent choices and person types use keyboard-accessible radios or tabs with documented arrow-key behavior.
- Evidence rows are keyboard selectable and expose field, current value, proposed value, source, and selected state to assistive technology.
- Extraction, draft recovery, commit, and coverage refresh announce through polite live regions; errors use assertive announcements only when action is blocked.
- Opening an external tab is announced before navigation. Returning preserves the draft and prior focus.
- Closing a sheet restores focus to its triggering row.
- Conflicts use icons and text, never color alone.
- 44px mobile targets, body text at least 16px, 4.5:1 body contrast, reduced motion honored.

### AI-slop and design-system checks

- No stacked dashboard-card mosaic. Use header, tabs, list/form workspace, and one contextual sheet.
- No gradients, decorative icons, bubbly radii, colored card borders, or centered marketing copy.
- Use Space Grotesk for display, DM Sans for body, system monospace only for data.
- Use DESIGN.md navy surfaces and Carolina blue for the primary action; semantic colors only for status.
- Cards are allowed only for an individual person when the card itself is the swipe/deck interaction in the existing Suggested people mode.
- Utility copy states orientation, status, evidence, or action.

### Design pass scores

| Pass | Before | After | Fix |
|---|---:|---:|---|
| Information architecture | 5/10 | 10/10 | Intent-first tabs and source as metadata |
| Interaction states | 6/10 | 9/10 | Canonical seven-state surface matrix |
| Journey and emotional arc | 6/10 | 9/10 | Seven-step storyboard and outcome receipt |
| AI-slop risk | 8/10 | 10/10 | Explicit app layout and blacklist enforcement |
| Design system alignment | 8/10 | 10/10 | Named tokens, fonts, and shared components |
| Responsive and accessibility | 7/10 | 9/10 | Three web layouts plus extension constraints |
| Unresolved design decisions | 4/10 | 9/10 | Lead lifecycle, launch surface, sheet model, and timing specified |

### Design implementation tasks

- [ ] **D1 (P1, human: ~4h / CC: ~45min)** - Discover - Replace source-first modes with intent-first tabs and entry-context header.
- [ ] **D2 (P1, human: ~1d / CC: ~2h)** - Research - Build the compact objective and person-target form with explicit defaults and validation.
- [ ] **D3 (P1, human: ~1d / CC: ~2h)** - Review - Build the accessible current/proposed evidence sheet and mobile comparison.
- [ ] **D4 (P1, human: ~4h / CC: ~45min)** - Outcome - Add the save receipt with coverage change and next action.
- [ ] **D5 (P1, human: ~1d / CC: ~2h)** - States - Implement the canonical state matrix without losing filters or drafts.
- [ ] **D6 (P2, human: ~4h / CC: ~45min)** - Trust - Add first-use reassurance and source/retention disclosures.
- [ ] **D7 (P2, human: ~1d / CC: ~2h)** - Responsive - Verify desktop, tablet, mobile, keyboard, screen-reader, contrast, and reduced-motion behavior.

### Design completion summary

| Item | Result |
|---|---|
| DESIGN.md | Present and applied |
| UI scope | Discover, evidence editor, queue, diff, archive import, optional extension |
| Overall score | 6.3/10 -> 9.2/10 |
| Decisions added | 12 |
| Decisions deferred | Visual mockup approval pending OpenAI organization verification |
| Mockups | 0 of 3 generated; tool returned organization-verification error |
| Unresolved design decisions | 0 within the provisional web-first direction |

### Design dual voices

Both design voices independently found the same three blockers in the pre-review draft: extension-first and web-first journeys were both active, Discover mixed source-first and intent-first navigation, and Research lead versus Contact had no visible lifecycle. The revised design section resolves all three provisionally.

```text
DESIGN DUAL VOICES - LITMUS SCORECARD
====================================================================
Check                                      Claude   Codex   Consensus
1. Product clear in first screen?          NO       NO      CONFIRMED
2. One strong visual anchor?               YES      YES     CONFIRMED
3. Scannable by headings?                  PARTIAL  PARTIAL CONFIRMED
4. Each section has one job?               NO       NO      CONFIRMED
5. Cards actually necessary?               YES      YES     CONFIRMED
6. Motion improves hierarchy?              NOT SPEC NOT SPEC CONFIRMED
7. Premium without decorative shadows?     YES      YES     CONFIRMED
====================================================================
Hard rejections in the pre-review draft: incompatible launch definitions.
```

After fixes:

- The first screen is Guided Network Research tied to one opportunity or firm gap.
- Intent tabs are canonical; sources are metadata.
- The complete happy path works in the web app.
- Own-profile audit remains in Career Toolkit → LinkedIn Studio.
- Research lead and Contact have explicit visible lifecycle rules.
- Every surface has defined loading, first-use empty, filtered empty, error, partial, and success behavior.
- The outcome receipt is the visual anchor: coverage improvement plus the next relationship action.

No cross-model design tension remains. Both voices recommend the same provisional web-first direction, which remains part of the final user challenge because it defers the originally requested extension-first launch.

## Phase 3: Engineering Review

Mode: FULL REVIEW. Scope is staged rather than reduced: release zero repairs the unsafe shared-contact boundary; release one proves the complete web workflow; later releases add enrichment, archive import, and an optional companion behind independent flags.

### Scope and complexity challenge

The product change is justified, but the original extension-first implementation shape was not. The repository already has 137 unit and component test files, a mature Discover deck, extension tokens, contact enrichment, provenance, applications, and LinkedIn Studio. The new work should be a small source-neutral domain seam over those capabilities, not a parallel CRM or browser-orchestration platform.

Ship blockers verified in code:

1. `AlumniContact.linkedInUrl` is globally unique while `importedByUserId` is stored on the same mutable row. This cannot cleanly represent both a canonical person and independent user-owned relationship data.
2. `src/app/api/discover/run/route.ts` looks up a row by LinkedIn URL without owner scope and then updates the row with the current user's ownership and discovered fields. A service-role client bypasses RLS, so this is a cross-user overwrite path.
3. `src/app/api/extension/ingest/route.ts` scopes lookup by owner, but saves the contact before writing provenance. Provenance and mutual-edge writes are best-effort, so the stated evidence contract is not atomic.
4. Automated LinkedIn reads exist in four places: the injected `extension/content.js` parser and scrolling routine, `signal-detector.ts` metadata scraping, the URL branch of `/api/import/linkedin`, and the DuckDuckGo `site:linkedin.com/in` fallback in `contact-finder.ts`.
5. Extension tokens support expiry but token creation does not set one by default. The scopes are a space-delimited string and always grant both contact and profile writes.
6. The plan requires authenticated browser journeys, but `package.json` has no browser-test command or explicit browser-test dependency. Component tests are not a substitute for the cross-tab, auth, draft-recovery, and mobile journeys.

### What already exists

| Need | Existing code to reuse | Engineering decision |
|---|---|---|
| Discover ranking and deck | `/dashboard/discover`, `/api/discover`, ranking helpers | Keep Suggested people intact behind its current API |
| Network navigation | `NetworkNav`, sidebar route matching | Keep `/dashboard/discover`; add entry points and intent tabs |
| Own profile audit | LinkedIn Studio, profile revisions, deterministic audit | Keep isolated from other-person research |
| Contact access rules | `contact-access`, contact APIs, owner filters | Centralize in one repository/service used by every research write |
| Provenance | `ContactFieldProvenance` | Make mandatory inside the commit transaction |
| Pairing | `ExtensionToken`, `extensionIdentity` | Reuse later with least scopes, expiry, rotation, and audience/origin checks |
| Lead validation | `/me` discovery-lead schemas | Borrow validation only; do not couple UUID workspace to `/me` email-owned tables |
| Firm coverage and opportunities | existing coverage services and `Opportunity` | Recompute outcome from the committed contact/result |
| Official connection import | CSV parsing in `/api/import/linkedin` | Extract the non-scraping import path and retire the URL scraping branch |

### Canonical architecture

```text
Overview / Opportunity / Firm / Contact / Copilot
                    |
                    v
          Guided Research UI + API
                    |
          +---------+----------+
          |                    |
          v                    v
   source-policy module   local EvidenceDraft
   URL build only         manual/export/model-assisted
          |                    |
          +---------+----------+
                    v
        preview service (read only)
       owner scope + dedupe + diff
                    |
           explicit field approval
                    v
       transactional commit service
  person/contact + provenance + receipt + idempotency
                    |
          +---------+----------+
          v                    v
    Review queue        coverage + next action

Optional later adapter:
Chrome side panel -> same draft/preview contracts -> web commit
```

Dependencies point inward toward `src/lib/guided-research/*`. Routes, React surfaces, archive adapters, model extraction, and the optional extension may call the domain service. The domain service never imports React, Chrome, LinkedIn-specific parsing, or provider SDKs.

### Ownership and data migration

Choose one authority before new ingestion:

```text
Person                     UserContact
canonical public identity  userId + personId
normalized locators        notes, warmth, status, tags, last contact
source-neutral facts       user-visible provenance and overrides
```

This split is preferred over simply changing the unique key to `[userId, linkedInUrl]`, because the current shared-pool behavior intentionally lets users link to a common public row. The split preserves a canonical identity while moving every private relationship field and mutable user classification to `UserContact`. A temporary compatibility view/repository may keep existing UI routes stable for one release.

Migration requirements:

- Normalize LinkedIn URLs; convert blank URL defaults to `NULL` before uniqueness.
- Backfill canonical people by normalized stable locator, with an explicit duplicate report and deterministic winner.
- Backfill one user-contact link per owner and existing `UserDiscover` relationship without transferring ownership.
- Repoint pipeline, opportunity-contact, connection, provenance, and tag references through the compatibility repository.
- Dual-read and compare counts before switching writes; never dual-write without an idempotent reconciliation key.
- Retain legacy rows for one release and provide a reversible application flag, not a destructive down migration.

All service-role queries must include owner scope in application code. RLS remains defense in depth, not the only tenant boundary.

### Code quality decisions

- Create one `guided-research` package containing Zod contracts, source policy, locator normalization, preview, lifecycle, commit, and typed errors.
- Replace large route-owned orchestration with thin handlers. Do not copy the existing extension-ingest merge logic into a new route.
- Represent sources and lifecycle states with typed enums, not comments and free-form strings.
- Replace the extension scope string with normalized scope rows or a single parser shared by issue and verification paths.
- Return `{ error: { code, message, recovery, requestId } }` consistently; raw Supabase errors never cross an API boundary.
- Delete or quarantine unreachable scraping code and its host permissions. A runtime flag alone cannot neutralize an already-installed content script.
- Separate exact data evidence from model-generated summaries. A model confidence score cannot upgrade evidence to verified.

### Test review: full codepath map

The complete test artifact is written to:

`~/.gstack/projects/scrigot-KithNode/scrigot-fix-railway-backend-port-eng-review-test-plan-20260721-183000.md`

```text
POLICY
  manifest/content script/server fetch inventory -> static CI policy test

UX
  entry context -> intent form -> safe link -> four-field draft
  -> preview -> duplicate choice -> selected commit -> outcome receipt
  component tests + authenticated desktop/mobile browser tests

DATA
  legacy contact -> Person/UserContact migration -> compatibility reads
  migration fixtures + count/FK/orphan verification + tenant isolation

WRITE PATH
  draft -> versioned preview -> approved fields -> transaction
  -> provenance -> idempotency result -> coverage refresh
  API integration + concurrent race + failure-injection tests

DEGRADED PATHS
  no goal / no model / no PDL / DB outage / stale preview / popup blocked
  / token revoked / duplicate / coverage timeout
  every path preserves draft or returns an exact recovery action

OPTIONAL EXTENSION
  install -> pair -> handoff -> web review
  owner-only browser journey after web foundation; broader rollout after demand gate; no LinkedIn DOM access
```

Coverage decisions:

| Codepath | Test type | Current state | Decision |
|---|---|---|---|
| Forbidden LinkedIn reads | static repository + production-bundle test | Missing | Add before release zero |
| Ownership migration | migration reconstruction + adversarial fixtures | Missing | Add before schema cutover |
| Tenant-safe preview/commit | API integration with two users | Missing | Add before any new route |
| Transaction and provenance | database failure injection | Existing ingest is non-atomic | Add and make transactional |
| Commit retry/race | concurrency integration | Missing | Add idempotency result contract |
| Source/URL policy | table-driven unit and redirect test | Partial URL validation exists | Centralize and expand |
| Manual research journey | authenticated browser desktop/mobile | No runner configured | Add Playwright or equivalent and CI command |
| Extension handoff | browser extension fixture | Existing unit tests only | Defer with the extension |
| Extraction model | contract, refusal, malformed, injection evals | Partial parser tests | Add fixture eval suite |
| Accessibility | component, keyboard, screen reader smoke | Partial component coverage | Add to each intent/diff flow |

### Security analysis

Threats and required controls:

| Threat | Control |
|---|---|
| Cross-user overwrite through global identity | Person/UserContact split, owner-scoped repository, two-user tests |
| Existence leak through duplicate errors | tenant-safe 404/duplicate results and consistent timing |
| SSRF/open redirect | parse then resolve DNS; block private/link-local ranges before and after every redirect |
| Stored prompt injection | treat supplied text as data, schema-constrained extraction, no tool access |
| Token theft or over-broad scope | default expiry, least scope, rotation, revocation, token audience and rate limits |
| Partial evidence record | one database transaction; provenance failure aborts the commit |
| Sensitive logs | structured allowlist, no raw evidence, URLs, emails, tokens, or provider payloads |
| Reinstalled legacy extension | remove content script and LinkedIn host permission in the shipped manifest; show upgrade-required state |

### Performance analysis

- Existing `/api/discover/run` performs sequential candidates and multiple queries per candidate. Do not place this path on the interactive Guided Research request. Suggested people may remain asynchronous and separately rate limited.
- Dedupe preview must use normalized indexed locators and cap possible matches. `%/in/slug%` lookups cannot be the canonical path.
- Batch provenance inserts inside the same transaction instead of one request per field.
- Coverage refresh should return a bounded deterministic delta; if it exceeds the commit budget, save the result and mark refresh pending rather than holding the transaction open.
- Client-local drafts need a size and count limit. Persisted review queues must paginate and never hydrate raw evidence in list rows.
- Model extraction is optional and separately timed. Manual entry never waits for the model.

Targets: safe-link generation p99 under 100 ms; owner-scoped preview p99 under 800 ms without model work; transactional commit p99 under 1.5 s; model extraction hard timeout 15 s with progress and manual fallback.

### Failure Modes Registry

| # | Failure | Critical | Rescue and required proof |
|---:|---|---:|---|
| 1 | Discover updates another user's contact | Yes | Disable unsafe write, migrate ownership, two-user regression test |
| 2 | Contact saved without provenance | Yes | Transactional commit and injected provenance failure rollback |
| 3 | Legacy extension still reads LinkedIn | Yes | Remove manifest injection/host access and inspect production bundle |
| 4 | Server scraper remains reachable | Yes | Source-policy inventory test and route contract replacement |
| 5 | Retry creates duplicate contact/action | Yes | Idempotency key with stored response and race test |
| 6 | Migration merges the wrong people | Yes | Normalization fixtures, duplicate report, dual-read count comparison |
| 7 | Model invents a field | No | Schema/evidence check; invented field rejected, manual fallback |
| 8 | Coverage refresh fails after save | No | Commit succeeds; receipt says pending; safe retry |
| 9 | Token revoked during review | No | Commit rejects, local draft remains, re-pair action |
| 10 | External link/pop-up unavailable | No | Copyable URL and manual form stay usable |

### Deployment order and rollback

1. Add source-policy inventory tests and emergency-disable unsafe Discover/import write paths.
2. Remove extension DOM injection, scrolling parser, LinkedIn host permission, and server-side profile fetches from the supported product.
3. Land additive Person/UserContact schema, backfill in isolation, dual-read, compare, and switch owner-scoped reads.
4. Add source-neutral draft, preview, transactional commit, provenance, and idempotency APIs behind `ENABLE_GUIDED_RESEARCH`.
5. Ship the web-only intent UI and authenticated browser tests to a small cohort.
6. Add coverage delta and next-action receipt after commit reliability is proven.
7. Add own-profile archive import on its separate LinkedIn Studio track.
8. Ship the owner-only unpacked side-panel accelerator after the web foundation passes; keep `ENABLE_RESEARCH_COMPANION` independent and require the demand gate before broader use.

Rollback disables the UI/adapter flag and leaves committed source-neutral data readable. Ownership migration rollback uses the compatibility repository and retained legacy table; it never deletes new records.

### NOT in scope

- LinkedIn DOM capture, automated profile fetches, search-result crawling, messaging, applications, or session proxying.
- A public extension-store release before legal/privacy review and demand validation.
- Cross-device capture-session persistence in release one.
- Automatic PDL spending or implicit verification of provider/model data.
- Rebuilding Applications, LinkedIn Studio, or the existing Suggested people ranking.

### Engineering implementation tasks

- [ ] **E1 (P1, human: ~2d / CC: ~4h)** - Ownership - Introduce Person/UserContact authority, migration, compatibility repository, and tenant tests.
- [ ] **E2 (P1, human: ~4h / CC: ~1h)** - Policy - Remove every extension and server automated LinkedIn read; add CI inventory guard.
- [ ] **E3 (P1, human: ~2d / CC: ~4h)** - Domain - Build source-neutral draft, preview, lifecycle, diff, and transactional commit with provenance and idempotency.
- [ ] **E4 (P1, human: ~1d / CC: ~2h)** - API - Add thin typed research routes, request IDs, rate limits, safe URL handling, and tenant-safe errors.
- [ ] **E5 (P1, human: ~2d / CC: ~4h)** - QA - Add migration, concurrency, failure-injection, authenticated browser, mobile, and accessibility coverage.
- [ ] **E6 (P2, human: ~1d / CC: ~2h)** - Outcomes - Add bounded coverage refresh, receipt, next-action creation, and support-safe funnel events.
- [ ] **E7 (P2, human: ~1d / CC: ~2h)** - Tokens - Add least scopes, default expiry, device identity, rotation, and revocation tests before companion work.
- [ ] **E8 (P2, human: ~2d / CC: ~4h)** - Companion - Build owner-only no-DOM handoff against the same contracts after the web foundation passes; keep broader release demand-gated.

### Engineering completion summary

| Item | Result |
|---|---|
| Complexity | Broad but staged; one new domain seam, no parallel CRM |
| Existing leverage | 9 reusable capabilities mapped |
| Architecture | Source-neutral, web-complete, extension optional |
| Critical gaps | 6 release blockers identified and assigned |
| Security | 8 threats mapped; ownership and atomicity are P1 |
| Tests | 19-layer/branch matrix plus external test artifact |
| Performance | 5 bounded-path rules and 4 latency targets |
| Deployment | 8 ordered stages with independent rollback flags |
| Unresolved architecture decisions | 0 inside the provisional web-first recommendation |

### Engineering dual voices

The mandated engineering subagent was started but did not return a final report after repeated bounded waits and an explicit wrap-up request. The Codex engineering voice was attempted three times; it repeatedly began repository inspection but terminated without a final answer. This phase therefore degraded to primary-reviewer mode rather than fabricating outside-model conclusions.

```text
ENG DUAL VOICES - CONSENSUS TABLE
====================================================================
Dimension                           Claude   Codex   Consensus
1. Architecture sound?             N/A      N/A     NOT CONFIRMED
2. Test coverage sufficient?       N/A      N/A     NOT CONFIRMED
3. Performance risks addressed?    N/A      N/A     NOT CONFIRMED
4. Security threats covered?       N/A      N/A     NOT CONFIRMED
5. Error paths handled?            N/A      N/A     NOT CONFIRMED
6. Deployment risk manageable?     N/A      N/A     NOT CONFIRMED
====================================================================
```

The verified ownership flaw is ship-blocking regardless of outside-voice availability. The web-first-versus-extension-first challenge remains supported independently by both CEO voices and both design voices.

<!-- AUTONOMOUS DECISION LOG -->
## Decision Audit Trail

| # | Phase | Decision | Classification | Principle | Rationale | Rejected |
|---:|---|---|---|---|---|---|
| 1 | CEO | Treat Guided Network Research as the product and the extension as an optional accelerator | User challenge | User intent and simplest complete product | Recruiting progress is the outcome; browser plumbing is not | Extension-first launch |
| 2 | CEO | Inventory and disable every automated LinkedIn read before feature work | Auto-decided | Security and completeness | A hidden server scraper defeats a no-scraping UI promise | UI-only disable |
| 3 | CEO | Validate the four-field web path before persisted capture sessions | Auto-decided | Simpler over clever | It proves demand without cross-tab orchestration | Sessions in release one |
| 4 | CEO | Use source-neutral research and evidence concepts | Auto-decided | Reversibility | Future sources should not require another migration | LinkedIn-specific core model |
| 5 | Design | Organize Discover by intent | Auto-decided | User mental model | Users think in people and recruiting gaps, not providers | Source-first tabs |
| 6 | Design | Define Draft -> Lead -> Contact -> Pipeline lifecycle | Auto-decided | State clarity | Prevents leads from polluting contacts and coverage | Ambiguous save states |
| 7 | Design | Use one selective current/proposed evidence sheet | Auto-decided | Safety and accessibility | Conflicts remain explicit and keyboard operable | Replace-all merge |
| 8 | Design | End with coverage change and next action | Auto-decided | Outcome visibility | Saving data should visibly advance recruiting | Generic saved toast |
| 9 | Eng | Split canonical Person from private UserContact authority | Auto-decided | Tenant safety | Global identity and user-owned relationship data cannot share one mutable owner row | Composite URL key only |
| 10 | Eng | Make contact, provenance, receipt, and idempotency atomic | Auto-decided | Correctness | A reviewed save without evidence history violates the core trust contract | Best-effort provenance |
| 11 | Eng | Add a real authenticated browser suite | Auto-decided | Complete verification | Unit/component tests cannot prove auth, cross-tab recovery, mobile, and retry journeys | Component tests only |
| 12 | Eng | Remove legacy content scripts rather than relying on a flag | Auto-decided | Defense in depth | Installed extensions can keep permissions and code beyond a server UI flag | Runtime flag only |
| 13 | DX | Add one fixture-backed Guided Research verification command | Auto-decided | Zero friction | Maintainers need one visible success path rather than assembling migrations, auth, and tests manually | Multi-command quickstart |
| 14 | DX | Standardize all API errors on problem, cause, fix, request ID, and docs link | Auto-decided | Fight uncertainty | Generic Supabase or 500 errors are not actionable for a beta maintainer | Raw provider errors |
| 15 | DX | Make extension pairing optional, least-scoped, expiring, and self-diagnosing | Auto-decided | Progressive disclosure | A beta user should reach value before Chrome setup and know exactly how to repair pairing | Extension prerequisite |
| 16 | Final gate | Approve web-first plus a private owner-only companion | User-approved | User sovereignty and staged safety | The user wants the companion personally without making it the product dependency or a public scraper | Public or DOM-reading extension |

## Phase 3.5: Developer Experience Review

Mode: DX POLISH. Product type: private full-stack application with an internal typed API and an optional unpacked Chrome companion. Primary developer persona: the solo KithNode maintainer. Secondary operator persona: a private beta user who may install the companion after succeeding with the web flow.

### Developer persona card

| Attribute | Primary maintainer | Beta operator |
|---|---|---|
| Goal | Change research logic safely and verify one real workflow | Find and save one useful recruiting person |
| Environment | macOS, Node, Next.js, Supabase/Docker, GitHub | Chrome plus the hosted or local web app |
| Expertise | Full-stack, but should not memorize every migration or policy rule | Product user; should not need extension or database knowledge |
| Time budget | Five minutes to a meaningful fixture-backed result after prerequisites | Four minutes from firm gap to reviewed save |
| Biggest fear | Cross-tenant corruption or a migration that passes locally but fails live | Account risk, unclear data collection, or losing entered work |
| Escape hatch | Focused unit/API commands, local fixtures, debug request ID | Manual four-field form and copyable safe research link |

### Developer empathy narrative

> I cloned KithNode to work on Guided Research. I do not want to rediscover which port, database, auth identity, feature flags, migration sequence, or extension token makes the feature real. I want one golden command that checks prerequisites, starts or finds the correct local services, seeds two isolated users, runs one firm-gap-to-save journey, and tells me exactly what passed. If it fails, I need the failing layer, likely cause, safe fix, and request ID before a stack trace. When I change the data model, I need a dry-run duplicate report and a reversible compatibility phase. When I hand the beta to a user, they should reach value in the web app before seeing Chrome extension instructions.

### Competitive DX benchmark

| Reference | Useful standard | Current KithNode | Planned target |
|---|---|---|---|
| Stripe-style APIs | one useful call, idempotent mutations, structured errors | route-specific shapes and best-effort writes | typed preview/commit, idempotency, one error envelope |
| Supabase local workflow | reproducible migrations and seed, explicit local/linked target | verifier exists, but research fixtures and ownership migration dry run do not | clean reconstruction plus two-tenant research fixture command |
| Chrome side-panel guidance | declared permission, user-triggered opening, narrow access | broad LinkedIn host permission and injected content script | optional no-DOM panel, KithNode-only bridge, pairing diagnostics |
| Playwright-style browser fixtures | real auth and browser journey in CI | no browser command in `package.json` | one authenticated desktop/mobile research suite |

Official references: [Chrome side panel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel), [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), and [Supabase local migrations](https://supabase.com/docs/guides/local-development/overview).

Competitive tier after fixes: Competitive for a private product. Public platform-grade SDKs, extension-store onboarding, and community investment are intentionally deferred.

### Magical moment specification

Maintainer delivery vehicle:

```text
npm run verify:guided-research

✓ source policy: no automated LinkedIn read path in production bundle
✓ database: migrations reconstructed; Person/UserContact isolation valid
✓ API: preview + commit + provenance + idempotency passed
✓ browser: firm gap -> reviewed contact -> next action passed
Open fixture: http://localhost:3000/dashboard/discover?fixture=guided-research
```

The command may call existing scripts internally, but it must be non-interactive, safe against production, and fail before mutation if the target is not a local or explicitly isolated test database. The visible result is a fixture contact, provenance trail, coverage delta, and next action.

Beta-user delivery vehicle: open Network -> Discover, choose Research a target, and complete the four-field manual path. The optional companion is introduced only after this moment.

### Nine-stage developer journey

| Stage | Current friction | Planned resolution | Budget |
|---|---|---|---:|
| 1. Discover | Feature and extension docs disagree | One `docs/guided-research/README.md` linked from root README and Settings | 20s |
| 2. Prerequisites | Node, Docker, env, DB origin, and ports are implicit | `doctor:guided-research` prints pass/fail and exact recovery | 30s |
| 3. Install | General dependency setup only | Existing install command plus pinned browser/Supabase dev dependencies | 60s warm |
| 4. Configure | Many secrets appear equally required | `.env.example` groups required local, optional provider, and production-only variables | 30s |
| 5. First run | Must combine dev, migrations, seed, auth, and flags | `verify:guided-research` orchestrates a safe fixture run | 120s |
| 6. First success | No single acceptance receipt | Printed URL plus visible saved person, evidence, coverage, next action | 30s |
| 7. Debug | Raw or generic route errors | typed code, cause, fix, docs URL, and request ID | 30s |
| 8. Extend | Logic lives in routes and provider-specific code | typed `guided-research` domain and adapter contract | 60s to locate |
| 9. Upgrade | Ownership migration and extension changes lack a user guide | dry-run report, compatibility window, deprecation warning, rollback checklist | before deploy |

Current estimated TTHW: 15-25 minutes on a correctly provisioned machine, longer when Docker/auth/ports drift. Target: under five minutes after prerequisites are installed; under four minutes for the beta user's web research loop.

### First-time developer confusion report

1. `npm run dev` does not tell the maintainer whether the correct Supabase project, migration version, and canonical app origin are active. Add a readiness summary with secret-free project fingerprints.
2. Extension documentation describes cookie authentication while the code supports bearer pairing tokens. Replace it and version docs with the manifest.
3. `ExtensionToken.expiresAt` is optional and issuance grants two scopes. Provide task-specific least-scope tokens with a default expiry and an identity check.
4. There is no single noun contract for draft, preview, research lead, contact, and commit result. Publish the state machine and generate TypeScript types from the same schemas used by routes.
5. Browser journey coverage is promised but not runnable from package scripts. Add the runner, fixture identity, and CI command before claiming end-to-end readiness.
6. The migration safety story is distributed across comments and the plan. Add an operator runbook with preflight counts, dry run, cutover, comparison, and rollback.

### Pass 1: Getting started, 4/10 -> 9/10

Current setup exceeds five minutes and has multiple golden paths. The fix is one safe fixture verification command, one doctor command, and one canonical guide. The web journey is the default; extension setup cannot appear before first value.

### Pass 2: API and contract design, 6/10 -> 9/10

Use nouns and two explicit mutations: preview and commit. Required fields have useful defaults, IDs are typed by destination, every mutation accepts an idempotency key, and advanced extraction/provider choices are optional. Do not expose the internal Person/UserContact split as extra work in the UI API.

### Pass 3: errors and debugging, 5/10 -> 9/10

Trace examples:

| Current | Required |
|---|---|
| `{error: error.message}` from persistence | `persistence_failed`: selected changes were not saved because the transaction rolled back; retry with the same idempotency key; include request ID and docs URL |
| Generic unauthorized from extension | `pairing_required`: token is expired/revoked or lacks `contacts:write`; open the exact Settings pairing route; keep local draft |
| LinkedIn/profile fetch silently returns no result | `source_not_allowed`: automated page reads are disabled; use manual fields or official export; link to source policy |

Debug mode exposes lifecycle state, adapter, timing, and request ID. It never exposes tokens, raw evidence, provider bodies, or another user's record existence.

### Pass 4: documentation and learning, 4/10 -> 9/10

Ship one guide with: five-minute quickstart, architecture, source-policy table, API examples, error catalog, migration runbook, extension setup, data retention, and troubleshooting. Examples must be fixture-complete and CI-tested. Keep the root README concise and link to the guide within two clicks.

### Pass 5: upgrade and migration, 3/10 -> 9/10

The Person/UserContact cutover is the highest DX risk. Provide dry-run and apply modes, duplicate/orphan reports, compatibility repository, dual-read comparison, deprecation warnings for legacy write paths, and a one-release rollback window. The extension manifest update must show an “upgrade required” state for legacy DOM-reading builds.

### Pass 6: environment and tooling, 6/10 -> 9/10

Reuse existing TypeScript, Vitest, ESLint, build, and migration scripts. Add the browser runner, policy inventory test, two-tenant fixture seed, local-only destructive guard, and focused watch commands. Pin relevant CLIs in the project so CI and maintainer machines use the same version.

### Pass 7: community and ecosystem, 5/10 -> 8/10

This is a private product, so a public community is not a launch requirement. Still add an issue template that captures request ID, feature flag, browser/manifest version, and reproduction without private evidence; a supported-source table; and one sample adapter. Public plugin APIs and a Chrome Web Store ecosystem remain out of scope.

### Pass 8: measurement and feedback, 5/10 -> 9/10

Measure verification-command duration and failure stage in CI, documentation success through fixture checks, beta setup completion, manual-versus-model fallback, pairing failure rate, and time from gap to committed next action. Run `/devex-review` after implementation and compare actual TTHW with the targets.

### DX scorecard

```text
+====================================================================+
|              DX PLAN REVIEW - SCORECARD                            |
+====================================================================+
| Dimension            | Before | After |
|----------------------|--------|-------|
| Getting Started      | 4/10   | 9/10  |
| API/CLI/SDK          | 6/10   | 9/10  |
| Error Messages       | 5/10   | 9/10  |
| Documentation        | 4/10   | 9/10  |
| Upgrade Path         | 3/10   | 9/10  |
| Dev Environment      | 6/10   | 9/10  |
| Community            | 5/10   | 8/10  |
| DX Measurement       | 5/10   | 9/10  |
+--------------------------------------------------------------------+
| TTHW                 | 15-25m | <5m   |
| Competitive Rank     | Competitive after fixes                     |
| Magical Moment       | designed via fixture verification command   |
| Product Type         | private app + optional browser companion    |
| Mode                 | POLISH                                       |
| Overall DX           | 4.8/10 -> 8.9/10                            |
+====================================================================+
```

### DX implementation checklist

- [ ] Time to hello world under five minutes after prerequisites.
- [ ] `verify:guided-research` produces meaningful fixture output.
- [ ] `doctor:guided-research` identifies DB, origin, auth, flag, browser, and token problems.
- [ ] Every error has problem, cause, fix, request ID, and docs URL.
- [ ] Preview and commit names, defaults, and idempotency are guessable from one example.
- [ ] Quickstart and examples run in CI.
- [ ] Migration has dry-run, apply, comparison, deprecation, and rollback guidance.
- [ ] Browser E2E command works locally and in CI.
- [ ] Extension remains optional and pairing defaults to least scope plus expiry.
- [ ] Debug output is support-safe and excludes sensitive evidence.
- [ ] A sample source adapter and contract tests document the extension point.
- [ ] Actual TTHW and setup failures are measured after ship.

### What already exists

- Central npm scripts for development, tests, lint, type checking, build, and migration verification.
- A local development launcher and test-user helper.
- Typed TypeScript application code and a large Vitest suite.
- Revocable hashed extension tokens and a side-panel shell.
- A readiness endpoint, feature flags, typed assistant errors, and migration reconstruction work from prior phases.

### NOT in scope

- Public SDKs in additional languages, public API keys, or third-party adapter marketplace.
- Chrome Web Store publishing and public extension support before demand and legal review.
- A hosted interactive API playground beyond fixture pages.
- Full Windows/Linux first-class extension development in release one; CI must still stay portable.
- Automated production migration rollback that could destroy newly written user data.

### DX implementation tasks

- [ ] **X1 (P1, human: ~4h / CC: ~1h)** - Onboarding - Add `doctor:guided-research` and `verify:guided-research` with safe fixture orchestration.
- [ ] **X2 (P1, human: ~1d / CC: ~2h)** - Browser QA - Add authenticated desktop/mobile browser commands and two-tenant fixtures.
- [ ] **X3 (P1, human: ~4h / CC: ~1h)** - Errors - Standardize research and extension errors with code, cause, recovery, request ID, and docs URL.
- [ ] **X4 (P1, human: ~1d / CC: ~2h)** - Migration - Add ownership dry run, duplicate report, cutover comparison, deprecation, and rollback runbook.
- [ ] **X5 (P2, human: ~4h / CC: ~1h)** - Docs - Replace stale extension docs and add one CI-tested Guided Research guide.
- [ ] **X6 (P2, human: ~4h / CC: ~1h)** - Pairing - Add least-scope expiring tokens, manifest-version diagnostics, and exact recovery links.
- [ ] **X7 (P2, human: ~2h / CC: ~30min)** - Measurement - Record non-sensitive TTHW, failure stage, pairing, and fixture verification metrics.

### DX dual voices

The DX subagent was started and prompted to wrap after a bounded wait, but it did not return a final response. The Codex DX voice was run in an isolated no-tool session and also terminated without a final answer. DX therefore degraded to primary-reviewer mode.

```text
DX DUAL VOICES - CONSENSUS TABLE
====================================================================
Dimension                           Claude   Codex   Consensus
1. Getting started < 5 min?        N/A      N/A     NOT CONFIRMED
2. API/CLI naming guessable?       N/A      N/A     NOT CONFIRMED
3. Error messages actionable?      N/A      N/A     NOT CONFIRMED
4. Docs findable and complete?     N/A      N/A     NOT CONFIRMED
5. Upgrade path safe?              N/A      N/A     NOT CONFIRMED
6. Dev environment friction-free? N/A      N/A     NOT CONFIRMED
====================================================================
```

The web-first conclusion remains the stronger DX choice: a beta user can reach the product's value without developer-mode extension installation, pairing, permissions, or browser-version troubleshooting.

## Cross-Phase Themes

1. **The extension is infrastructure, not the product.** CEO and design voices independently moved the value proposition to opportunity/firm gap -> relevant person -> reviewed evidence -> next action. Engineering and DX then made the web-complete path the safest dependency boundary and fastest first success.
2. **Source policy must be enforced in code.** CEO and engineering found that removing a visible capture action is insufficient while the manifest, server metadata fetcher, URL import branch, and search fallback still automate LinkedIn reads.
3. **Trust depends on ownership plus atomic provenance.** CEO, design, and engineering all require user-visible evidence and selective approval. The current global contact identity and best-effort provenance cannot uphold that promise.
4. **Discover should be organized by recruiting intent.** CEO and design agreed that source-first navigation is an implementation model. Suggested people, Research a target, and Review queue are the user model.
5. **The happy path must survive missing integrations.** Design states, engineering failure injection, and DX onboarding all require manual completion without the extension, model, PDL, popup, or LinkedIn availability.
6. **A measurable demand gate prevents extension overinvestment.** The approved personal unpacked companion may follow the web foundation, while CEO activation and repeat-use thresholds still gate broader beta or public distribution.

## Implementation Tasks (Aggregated Across Phases)

- [ ] **C2 (P1, human: 2d / CC: 4h) - Data** - Resolve canonical person and user-contact ownership.
  - Surfaced by: CEO - global LinkedIn URL identity and mutable ownership can corrupt tenant data.
  - Files: `prisma/schema.prisma`, Discover run, extension ingest.
- [ ] **C3 (P1, human: 1d / CC: 2h) - Domain** - Build transactional evidence preview and commit.
  - Surfaced by: CEO - current ingest overwrites before provenance and lacks selective approval.
- [ ] **C1 (P1, human: 4h / CC: 30min) - Policy** - Inventory and disable automated LinkedIn reads.
  - Files: extension manifest/content script, Discover signal/contact finders, LinkedIn import.
- [ ] **C4 (P1, human: 2d / CC: 4h) - Product** - Ship the web-only Guided Network Research experiment.
- [ ] **D1 (P1, human: 4h / CC: 45min) - Discover** - Use intent-first Discover navigation.
- [ ] **D2 (P1, human: 1d / CC: 2h) - Research** - Build the compact target-research form.
- [ ] **D3 (P1, human: 1d / CC: 2h) - Review** - Build the accessible evidence diff.
- [ ] **D4 (P1, human: 4h / CC: 45min) - Outcome** - Show the recruiting outcome receipt.
- [ ] **D5 (P1, human: 1d / CC: 2h) - States** - Implement the complete surface-state matrix.
- [ ] **E4 (P1, human: ~1d / CC: ~2h) - API** - Add typed owner-scoped research routes and safe URL policy.
- [ ] **E3 (P1, human: ~2d / CC: ~4h) - Domain** - Add provenance and idempotency to the transaction.
- [ ] **E1 (P1, human: ~2d / CC: ~4h) - Ownership** - Add Person/UserContact migration and compatibility repository.
- [ ] **E2 (P1, human: ~4h / CC: ~1h) - Policy** - Add the production-bundle source-policy CI guard.
- [ ] **E5 (P1, human: ~2d / CC: ~4h) - QA** - Add migration, race, failure, browser, mobile, and accessibility tests.
- [ ] **X1 (P1, human: ~4h / CC: ~1h) - Onboarding** - Add Guided Research doctor and verification commands.
- [ ] **X2 (P1, human: ~1d / CC: ~2h) - Browser QA** - Add authenticated desktop and mobile browser commands.
- [ ] **X3 (P1, human: ~4h / CC: ~1h) - Errors** - Standardize problem, cause, fix, request ID, and docs link.
- [ ] **X4 (P1, human: ~1d / CC: ~2h) - Migration** - Automate the ownership dry run and rollback runbook.
- [ ] **C5 (P2, human: 1d / CC: 2h) - Metrics** - Measure the research-to-action funnel.
- [ ] **C6 (P2, human: 1d / CC: 2h) - Privacy** - Add evidence retention, export, deletion, and sensitive-field rules.
- [ ] **C7 (P2, human: 2d / CC: 4h) - Extension** - Add the private owner-only side-panel accelerator after the web foundation; keep broader distribution demand-gated.
- [ ] **D6 (P2, human: 4h / CC: 45min) - Trust** - Add source and privacy reassurance.
- [ ] **D7 (P2, human: 1d / CC: 2h) - Accessibility** - Verify responsive and accessible research workflows.
- [ ] **E6 (P2, human: ~1d / CC: ~2h) - Outcomes** - Add bounded coverage refresh and next-action receipt.
- [ ] **E7 (P2, human: ~1d / CC: ~2h) - Tokens** - Issue least-scoped expiring extension tokens.
- [ ] **E8 (P2, human: ~2d / CC: ~4h) - Companion** - Build owner-only no-DOM handoff after web validation; require demand validation before broader release.
- [ ] **X5 (P2, human: ~4h / CC: ~1h) - Docs** - Replace stale extension docs with one CI-tested guide.
- [ ] **X6 (P2, human: ~4h / CC: ~1h) - Pairing** - Add manifest-version, identity, origin, and token diagnostics.
- [ ] **X7 (P2, human: ~2h / CC: ~30min) - Measurement** - Measure TTHW and non-sensitive failure stages.

## Final Approval Resolution

Approved choice: **A, web-first Guided Network Research, plus a private owner-only unpacked companion after the web foundation passes.**

Delivery order:

```text
Release 0: safety foundation
  Person/UserContact ownership + source-policy quarantine + atomic provenance

Release 1: complete web workflow
  intent -> safe external link -> manual evidence -> preview -> commit -> outcome

Release 2: private owner-only companion
  unpacked extension -> task context -> manual evidence form -> Review in KithNode

Later: broader beta or public distribution
  only after demand, privacy/legal, permissions, and support-readiness gates
```

Owner-only companion capabilities:

- Load as an unpacked local extension and remain absent from the Chrome Web Store.
- Open an approved LinkedIn search or profile URL only after the owner clicks.
- Display the active KithNode firm, opportunity, contact, requested fields, and reason for research.
- Accept facts or selected text manually provided by the owner; it does not inspect the page.
- Keep unsaved raw material locally with size and expiry limits.
- Send a draft to the same KithNode preview contract and require final field-level approval in the web app.
- Use an owner-allowlisted, short-lived, revocable, least-scope token; contact and own-profile scopes are paired separately.
- Show manifest version, KithNode identity, origin, token expiry, last use, and exact pairing recovery.

Hard boundaries:

- No LinkedIn content script, DOM selectors, scrolling, page-text reads, network interception, cookies, credentials, search-result parsing, or background visits.
- No automatic save, enrichment spend, messaging, connection request, profile publication, or application submission.
- Personal or unpacked distribution does not change the source-policy boundary.
- The web workflow remains fully usable when the companion is missing, disabled, outdated, or revoked.

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|---|---|---|---:|---|---|
| CEO Review | `/plan-ceo-review` | Scope and strategy | 1 | CLEAR | Web-first outcome loop approved; private companion staged after the foundation |
| Codex Review | Autoplan dual voices | Independent second opinion | 2 complete | ISSUES INCORPORATED | CEO and design voices supported web-first; Eng/DX attempts returned no final answer |
| Eng Review | `/plan-eng-review` | Architecture and tests | 1 | CLEAR | 10 failure modes, 6 release blockers assigned before feature work, full external test artifact |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | CLEAR | 6.3/10 -> 9.2/10, 12 decisions |
| DX Review | `/plan-devex-review` | Developer experience | 1 | CLEAR | 4.8/10 -> 8.9/10, TTHW 15-25m -> under 5m |

**CROSS-MODEL:** Completed CEO and design voices agree on a web-complete Guided Network Research product. The user's approved owner-only companion preserves that architecture because it comes after the same web contracts and has no LinkedIn page-reading capability.

**VERDICT:** CEO + DESIGN + ENG + DX CLEARED. Build release zero first; the owner-only companion is approved for release two and broader distribution remains gated.

NO UNRESOLVED DECISIONS
