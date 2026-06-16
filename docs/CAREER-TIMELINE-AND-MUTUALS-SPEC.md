# Career Timeline + Mutual Connections — Spec

Ideas #2 + #3 from `100 Ideas to Make KithNode Better`. Both ride on the LinkedIn
capture extension: #2 renders the career history we already capture; #3 captures
and stores person-to-person edges that feed warm paths.

## #2 — Career timeline (no schema change)

`experiences` is already captured (JSON `{title,firm,start,end}[]`) and already
parsed everywhere; today it renders only as a cramped right-aligned line in the
DETAILS card. Replace that with a real vertical timeline.

- New `src/components/career-timeline.tsx` — presentational, props
  `{ experiences: ExperienceEntry[] }`, uses `formatExperiencePeriod` from
  `@/lib/educations`. Current role (no `end` or `end` ~ /present/i) is accented.
- Placement: a prominent CAREER card on the **Profile tab** of
  `src/app/contact/[id]/page.tsx`, replacing the experience rows inside the
  DETAILS `<dl>` (lines ~852-866). Fallback to `past_firms` only when empty.

## #3 — Mutual connections (person-to-person edge table)

When the user views contact C's LinkedIn profile, the page shows the mutuals
between the **viewer** and C. Each captured mutual M means "C knows M" and the
viewer knows M too — so M is a warm-intro route to C. We store these as edges.

### Table: `ContactConnection` (Supabase Postgres, RLS on, service-role only)

| column           | type        | notes                                            |
|------------------|-------------|--------------------------------------------------|
| id               | uuid pk     | `gen_random_uuid()`                              |
| ownerUserId      | text        | capturing user's email (scoping; = importer)     |
| contactId        | text        | AlumniContact.id — Person A (profile captured)   |
| mutualName       | text        | Person B display name                            |
| mutualSlug       | text ''     | Person B /in/ slug if visible (usually empty)    |
| mutualKey        | text        | dedupe key = slug || lower(trim(name))           |
| mutualContactId  | text null   | AlumniContact.id for B if in owner's network     |
| source           | text        | 'linkedin_extension'                             |
| createdAt        | timestamptz | now()                                            |

Unique `(ownerUserId, contactId, mutualKey)`; index `(ownerUserId, contactId)`
and `(ownerUserId, mutualContactId)`. RLS ENABLED, NO policies (matches
Feedback/PromoCode/UsageEvent — the service-role client bypasses RLS; route-layer
`ownerUserId` scoping is the access control). Mirrored in `prisma/schema.prisma`.

### `src/lib/mutuals.ts` (pure, unit-tested — the contract)

- `MAX_MUTUALS = 25`
- `mutualKey(name, slug?) -> string` — slug.lower() || name.trim().lower()
- `slugFromLinkedInUrl(url) -> string` — `/in/<slug>` lowercased, or ""
- `parseCapturedMutuals(raw) -> {name, slug?}[]` — tolerant (objects or strings),
  drop empties, dedupe by key, cap `MAX_MUTUALS`
- `resolveMutualContactId(m, byKey: Map, byName: Map) -> string | null`

### Ingest (`/api/extension/ingest`)

After upserting the contact (need its id on the insert path → `.select("id")`),
write edges: parse `body.mutuals`; load owner's contacts (id, name, linkedInUrl)
to build resolver maps; upsert each edge (onConflict ownerUserId,contactId,
mutualKey); **back-resolve**: set `mutualContactId = <this contact id>` on any of
the owner's dangling edges whose `mutualKey` matches this contact (slug or name).

### Contact API (`/api/contacts/[id]` GET)

After the contact loads, fetch its edges scoped to `ownerUserId = viewer`
(non-owner viewers see none — private graph). Return
`mutuals: { name, slug, contactId }[]`. Add `mutuals` to `ContactDetail` in
`src/lib/api.ts`.

### Contact page — MUTUAL CONNECTIONS card (Profile tab)

For each mutual: resolved (in network) → link to `/contact/<contactId>` + an
"ASK FOR INTRO" button that opens the existing `IntroModal`
(`contact = current contact`, `warmPath.intermediaryName = mutual.name`,
`intermediaryRelation = "mutual connection"`, `userName` via `useSession()`).
Unmatched → plain name. Keep the existing "Check Mutual Connections" LinkedIn
search link as a discovery fallback.

## Tests
- `mutuals.test.ts` (key/slug/parse/resolve)
- `linkedin-extract.test.ts` extended (mutuals in schema + prompt)
- `ingest/route.test.ts` extended (edges written, resolved, back-resolved)
- `career-timeline.test.tsx` (renders roles, marks current, null on empty)

## Non-goals (v1)
Global "who can intro me to whom" dashboard view; shortest-path graph traversal;
mutual capture beyond named people LinkedIn shows; editing mutuals in the UI.
