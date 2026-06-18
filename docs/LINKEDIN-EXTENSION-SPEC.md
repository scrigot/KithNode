# Spec: KithNode LinkedIn Contact Clipper (browser extension)

Status: research spec, not yet built. Owner of implementation decisions (especially auth
and any new endpoint or table): the KithNode features session. This document is scoped to
research and design only and proposes zero changes to `src/` on its own.

## 1. Goal and UX

A personal browser extension that turns a LinkedIn profile the user is already viewing
into a KithNode contact, without retyping anything.

Flow:
1. User is on a `linkedin.com/in/<handle>` profile in their normal browser session.
2. User clicks the KithNode extension icon (explicit, one profile at a time).
3. A side panel opens with fields already filled from the visible page: name, title,
   firm, education, location, profile URL.
4. User reviews and edits any field, then clicks "Add to KithNode".
5. The contact lands in KithNode with warmth score and tier already computed, deduped
   against anyone already imported.

Design intent: this is a clipper, not a crawler. It reads the page the user chose to
open, at human speed, on demand. No background collection, no auto-navigation, no bulk
mode. This matches KithNode's authenticity principle (`CLAUDE.md`): the product never
does the robotic, mass-action thing.

## 2. Architecture (Chrome MV3)

```
extension/
  manifest.json            # MV3, host_permissions, side_panel
  content.js               # parses the profile DOM the user is viewing
  panel.html / panel.js    # review-and-edit UI, fires the import
  background.js            # service worker, owns the fetch to KithNode
```

- **Content script** runs only on `https://www.linkedin.com/in/*`. It reads the rendered
  DOM (the profile already loaded for the user): the top card (name, headline), the
  Experience section (current role and company), and the Education section (school).
  Selectors are read-only and best-effort; LinkedIn markup changes, so parsing must
  degrade to blank fields rather than throw, and the panel always lets the user fix.
- **Side panel** (MV3 `chrome.sidePanel`) renders the parsed fields as an editable form.
  Native extension UI, not an injected iframe (KithNode sets
  `Content-Security-Policy: frame-ancestors 'none'`, so it cannot be embedded in a frame
  on third-party pages anyway).
- **Background service worker** performs the network call to the KithNode API and returns
  the result to the panel.

### Field mapping (to the EXISTING import route)

The endpoint already exists and needs no change for the cookie-auth version:
`POST /api/import/linkedin` (`src/app/api/import/linkedin/route.ts`). It accepts a
`contacts` array and upserts directly (the "CSV contacts, no scraping" path), deduping by
`linkedInUrl` then `email`, and computing warmth and tier via `detectAffiliations` and
`computeWarmthScore` in `src/lib/linkedin-import.ts`.

Payload shape the extension must send (field names verbatim from the route's `CsvContact`
interface):

```json
{
  "contacts": [{
    "name": "Priya Raghunathan",
    "title": "Vice President",
    "firmName": "Evercore",
    "email": "",
    "education": "UNC Kenan-Flagler",
    "location": "New York, NY",
    "linkedInUrl": "https://www.linkedin.com/in/priya-raghunathan"
  }]
}
```

| Extension panel field | LinkedIn DOM source | Payload key | Notes |
|-----------------------|---------------------|-------------|-------|
| Name | top-card h1 | `name` | required |
| Title | top-card headline or current Experience role | `title` | role only, not "Role at Firm" |
| Firm | current Experience company | `firmName` | parsed from the first experience entry |
| Education | first Education school | `education` | maps to both `university` and `education` server-side |
| Location | top-card location line | `location` | |
| Profile URL | `window.location.href` (canonical /in/ URL) | `linkedInUrl` | dedupe key; strip query params |
| Email | not on the page | `email` | leave blank; enrichment or manual fills it |

Server-side, the route also sets `graduationYear: 0`, `source: "linkedin_csv"`, and
`importedByUserId` from the session. The extension does not send those.

Response: `{ imported, failed, contacts: [...] }`. The panel shows imported-versus-failed
and the computed tier for the contact.

## 3. Auth analysis (the decision the features session owns)

KithNode uses NextAuth v5 with a JWT stored in the HTTP-only `authjs.session-token`
cookie, SameSite=Lax (`src/lib/auth.ts`, `src/lib/auth.config.ts`). The import route
authorizes via `await auth()` and reads `session.user.email`. Two viable paths:

### Option v1: cookie auth, zero app changes (recommended first)

The extension declares `host_permissions` for the KithNode origin and calls the API with
`credentials: "include"`. Chrome attaches the site's cookies to extension-initiated
requests when the extension holds host permission for that origin, and such requests are
not subject to the same SameSite=Lax blocking a random third-party site would hit. The
request originates from the service worker, not from linkedin.com.

Requirements and limits:
- The user must be signed in to KithNode in the same browser profile.
- Works against the existing endpoint with no server change.
- The route currently has no CORS allowance for cross-origin browser fetches; from an
  extension service worker with host permissions this is generally not gated the same way
  as a page fetch, but this must be verified against the deployed app early in P1. If the
  deployed app rejects it, fall back to v2.

### Option v2: personal access token (cleaner, needs app work)

Issue a revocable token the user pastes into the extension once.
- New endpoint `POST /api/extension-token` (authenticated by session) that mints a token.
- A new table to store token hashes (per `CLAUDE.md`: any new table requires RLS enabled
  in the Supabase dashboard plus at least one user-scoped policy, and the Prisma migration
  alone is insufficient).
- The import route gains a bearer-token check alongside the existing session check.
- Token scoped to the import action only; user can revoke from settings.

This is the better long-term answer (no dependence on an active web session, revocable),
but it is real app work and touches auth, so it belongs to the features session, not here.

### CSP note

`frame-ancestors 'none'` in `next.config.mjs` means the panel UI must be extension-native;
do not try to embed a KithNode page in an iframe inside the extension or on LinkedIn.

## 4. LinkedIn terms and risk (honest)

LinkedIn's User Agreement prohibits scraping, crawling, and automated data collection.
The lowest-risk pattern, and the only one this spec endorses, is a user-initiated clipper
that reads a single profile the user has personally opened, at human speed, with no
automated navigation and no background activity. That is materially different from a
scraper, but account-restriction risk is never zero.

Guardrails baked into the design:
- Manual trigger only; one profile per click.
- No bulk capture, no list/search-page harvesting, no Sales Navigator.
- No auto-connect, no messaging, no profile-visiting automation.
- Personal use by the account owner on their own browsing.

If any of those guardrails are relaxed later, re-evaluate the risk; do not add a bulk mode.

## 5. Phased build plan

- **P0 (no auth):** content script parses the profile, panel pre-fills and lets the user
  edit, "Copy as JSON" / "Copy CSV row" button. Proves the parsing and UX with zero
  backend dependency. Useful immediately with KithNode's existing CSV import.
- **P1 (cookie auth):** background worker POSTs to `/api/import/linkedin` with
  `credentials: "include"`. Verify the deployed app accepts the extension-origin request
  early. Show imported/failed plus the returned tier.
- **P2 (token auth + enrich):** add the v2 token path (features session), and after a
  successful import optionally call `POST /api/contacts/enrich`
  (`src/app/api/contacts/enrich/route.ts`) to fill industry and seniority via Claude.

## 6. Out of scope

Sales Navigator parsing, bulk or search-result import, auto-connect or auto-message,
background profile collection, and anything touching outreach automation (that is
AutoGuard territory, `src/lib/autoguard.ts`). This extension only captures and creates a
contact; it never sends anything to anyone.

## 7. Open questions for the features session

1. v1 cookie auth or go straight to v2 tokens?
2. If v2, confirm the new token table plus Supabase RLS policy before any migration.
3. Should a successful clip auto-trigger enrichment, or leave that to the dashboard?
4. Distribution: unpacked personal install, or a packaged internal build for Sam only?
