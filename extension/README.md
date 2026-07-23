# KithNode Research Companion (private unpacked extension)

This owner-only Chrome side panel is a focused notebook for Guided Network Research. It
opens user-requested LinkedIn searches, keeps an in-progress draft in extension-local
storage, and sends reviewed facts to KithNode's private review queue.

Concurrent jobs are recorded as separate structured positions with role,
organization, work type, and start date. One role may still be marked as the
primary firm/headline for compact lists; KithNode merges that primary role into
the full career timeline. Up to 100 personally reviewed LinkedIn skills are kept
as deduplicated tags and become searchable in Network, Discover, and global search.

It does **not** read or scroll page content, inject scripts, access LinkedIn cookies,
intercept traffic, crawl search results, enrich data, message people, connect, publish,
or add a contact without final approval in the KithNode web app.

## Install for personal use

1. Open `chrome://extensions`.
2. Turn on **Developer mode**.
3. Choose **Load unpacked** and select this `extension/` directory.
4. In KithNode, open **Settings → Integrations** and create a private companion token.
5. Paste that token into the side panel settings. Tokens expire after 90 days and can be
   revoked at any time.

The default local app address is `http://localhost:3000`. This build is deliberately
unpacked and private; broader distribution requires a separate privacy, policy, and
security review.

## Data flow

```text
You open a search → you type reviewed facts → private KithNode draft
→ field-by-field web preview → explicit approval → network contact + provenance
```

The manifest has no LinkedIn host permission and no content script.
