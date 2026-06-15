# KithNode LinkedIn Capture (Chrome extension)

Capture the LinkedIn profile you're viewing into your KithNode network — the
skills / experience / education / clubs that PDL can't get for students. Personal
tool, not for distribution. Reading profiles this way is against LinkedIn's ToS,
so use it on profiles you actually visit, at human pace.

## Install (load unpacked)
1. Chrome → `chrome://extensions`
2. Toggle **Developer mode** (top-right) ON.
3. **Load unpacked** → select this `extension/` folder.
4. Pin "KithNode LinkedIn Capture" to the toolbar.

## Use
1. Be signed in to KithNode in the same Chrome (cookie auth — no token needed).
2. Open someone's profile: `linkedin.com/in/…`
3. Click the extension. It parses the page and shows the fields.
4. Review/fix anything (LinkedIn's layout shifts, so the parse isn't perfect),
   then **Save to KithNode**.
5. Use the **Save to** dropdown to target Production (kithnode.ai) or Localhost
   (localhost:3000) while testing.

It upserts by LinkedIn URL, so capturing a profile already in your network just
fills in the missing skills/experience/clubs and re-scores them.

## If Save says "Not logged in" (401)
The browser didn't attach your kithnode.ai cookie to the extension request
(SameSite). Open kithnode.ai, sign in, and retry. If it persists, tell me and
I'll switch this to a paste-once token.

## How it extracts (no CSS scraping)
The popup injects a tiny `grabProfile()` (via `chrome.scripting.executeScript`)
that scrolls the page to load LinkedIn's lazy sections and returns the visible
TEXT. That text is POSTed to `POST /api/extension/extract`, where an AI model
(the same pattern as résumé upload, `src/lib/linkedin-extract.ts`) returns the
structured fields. The popup shows them for review; **Save** posts to
`POST /api/extension/ingest`, which upserts by slug + re-scores. Because the AI
reads text, this doesn't break when LinkedIn changes its markup.

## Notes
- No icons bundled (Chrome shows a default). Add `icons` to `manifest.json` later.
- No persistent content script → no hard-refresh needed after updating the
  extension; just reload the extension at `chrome://extensions`.
- Each capture makes one AI call (free for now; wire a credit charge in
  `extract/route.ts` when this ships in-product).
