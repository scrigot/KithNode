# KithNode Contact Clipper (browser extension)

A personal Chrome extension that reads the LinkedIn profile you are viewing and pre-fills a
KithNode contact. One profile at a time, on demand. This is the P0/P1 build of the spec in
`docs/LINKEDIN-EXTENSION-SPEC.md`.

What it does:
- Parses the open `linkedin.com/in/<handle>` page (name, title, firm, education, location,
  profile URL) into an editable form in the side panel.
- **Copy JSON** / **Copy CSV row** for KithNode's existing import (no auth, works today).
- **Add to KithNode** posts to `/api/import/linkedin` using your signed-in session cookie.

It does not crawl, navigate, bulk-import, auto-connect, or message anyone. See the spec's
ToS / risk section.

## Install (unpacked, personal use)

1. Add a 128x128 `icon.png` in this folder (any placeholder works for local use).
2. Chrome → `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select
   this `extension/` folder.
3. Open a LinkedIn profile, click the KithNode icon to open the side panel, click **Read
   this profile**, review the fields, then either copy or **Add to KithNode**.

## Configure "Add to KithNode"

- Open the panel's **Settings** and set your KithNode URL (e.g. `https://kithnode.ai`, or
  `http://localhost:3000` for dev).
- You must be **signed in to KithNode in the same browser** for the cookie-authenticated
  send to work (this is the v1 auth path in the spec).
- If you only use the copy buttons, no URL is needed.

If your deployed app rejects the extension-origin request, fall back to the copy buttons +
KithNode's CSV import, and see the spec's v2 (personal access token) auth option, which is
app-side work owned by the features session.

## Files

| File | Role |
|---|---|
| `manifest.json` | MV3 manifest, host permissions, side panel |
| `content.js` | parses the profile DOM (best-effort, brittle selectors, always editable) |
| `background.js` | service worker; owns the import POST so cookie auth works |
| `panel.html` / `panel.js` / `panel.css` | the review-and-edit UI (dashboard design language) |

## Known limits

- LinkedIn markup changes; selectors in `content.js` are best-effort and degrade to empty
  fields rather than break. Always review before adding.
- Email is never on the page; leave it blank or let KithNode enrichment fill it.
- `host_permissions` lists `kithnode.ai` and `localhost:3000`. Add your real origin there
  if it differs, or cookie auth will not attach.
