# KithNode Private Research Companion

Status: implemented for owner-only, unpacked use.

The companion supports Guided Network Research without automating LinkedIn. It may open
a search or profile after the owner clicks, show a small research form, keep a local
draft, and hand that draft to KithNode for field-level review.

It may not read or scroll LinkedIn's DOM, access cookies or credentials, intercept
traffic, crawl results, auto-save contacts, message, connect, publish, enrich, or apply.
The Chrome manifest therefore contains no LinkedIn host permission and no content script.

## Trust boundary

- A revocable `research:draft` token can create private research drafts only.
- Tokens expire after 90 days and are stored hashed by KithNode.
- Only the signed-in web app can commit a draft.
- Commit is transactional and records field provenance and an audit event.
- A shared canonical contact is never reassigned or overwritten. The researching user's
  changes are stored in their existing private `ContactOverride`.
- Up to eight concurrent current positions remain separate, including role,
  organization, employment type, start date, and `Present` status. Final approval
  stores them in the contact's structured experience history and derives coverage
  across every recorded organization.
- The primary headline role is merged into that structured history so older and
  new drafts cannot omit position one from the contact timeline.
- Up to 100 personally reviewed professional skills are stored as deduplicated
  tags and indexed by Network, Discover, and global contact search.

## Flow

1. Define a company and role in Network → Discover or the side panel.
2. Open a focused LinkedIn people search through an explicit click.
3. Navigate manually and enter only facts you personally reviewed.
4. Send the private draft to KithNode.
5. Select the exact fields to approve in the web preview.
6. Commit the approved fields to the user's network with provenance.

This is a personal workflow, not a crawler or distribution-ready browser product.
