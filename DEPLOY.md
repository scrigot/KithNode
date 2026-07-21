# KithNode Deployment Guide

## Frontend (Vercel)

```bash
# From project root
vercel --prod
```

**Environment variables to set in Vercel:**
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `OAUTH_TOKEN_ENCRYPTION_KEY` — generate with `openssl rand -hex 32`; never expose to the browser
- `GOOGLE_OAUTH_CLIENT_ID` / `GOOGLE_OAUTH_CLIENT_SECRET` — optional dedicated Gmail/Calendar client; sign-in credentials are the fallback
- `MICROSOFT_CLIENT_ID` / `MICROSOFT_CLIENT_SECRET` / `MICROSOFT_TENANT_ID` — Microsoft Graph delegated client (`common` supports work and personal accounts)
- `AI_GATEWAY_API_KEY` — Career Copilot structured chat
- `NEXT_PUBLIC_POSTHOG_KEY` — from PostHog project settings
- `NEXT_PUBLIC_POSTHOG_HOST` — `https://us.i.posthog.com`

Use `.env.example` as the complete contract. Vercel Development, Preview, and
Production are separate environments; review each one rather than assuming a
Production variable exists in Preview.

Run `npm run db:history:check` and `npm run db:verify` before deployment. The
checked-in production history markers align the remote migration ledger; the
schema snapshot in `supabase/baseline/` proves a clean database can reproduce
the current application schema. Apply forward files in `supabase/migrations/**`
through the reviewed Supabase migration workflow. Never use `prisma db push`
against production.

## Connected account provider setup

Google sign-in and connected-account access use separate callback paths. Register
all enabled callbacks exactly, including scheme, host, port, path, and trailing
slash behavior:

- Google sign-in: `${NEXT_PUBLIC_APP_URL}/api/auth/callback/google`
- Google: `${NEXT_PUBLIC_APP_URL}/api/integrations/google/callback`
- Microsoft: `${NEXT_PUBLIC_APP_URL}/api/integrations/microsoft/callback`

Register the exact local and deployed URLs in the Google Cloud and Microsoft
Entra consoles. Google needs Gmail read-only and Calendar read-only scopes.
Microsoft needs delegated `User.Read`, `Mail.Read`, `Calendars.Read`, and
`offline_access`. The app reads bounded message metadata and upcoming calendar
events; it does not request send or calendar-write permissions. Provider access
and refresh tokens are AES-256-GCM encrypted in `IntegrationConnection`, a
server-only table with browser roles revoked.

## Archived backend

`backend/` is retained for a short shadow/rollback window only. Vercel does not
build or route to it, and no application code calls it. Do not provision a new
Railway service from this repository.

## Smoke Test

1. `https://kithnode.vercel.app` — sign-in page renders
2. Sign in with @unc.edu Google account
3. Dashboard loads with contacts
4. Click a contact → detail page shows
5. Click "DRAFT" → outreach sheet opens
6. Navigate to Discover → swipe cards appear
7. Generate an outreach draft, confirm “Mark sent” appears, and mark it sent
8. Open coverage/reminders and confirm both load from tenant-scoped Next.js routes
9. Open Career Copilot, create a proposed goal, approve it once, and confirm a second approval returns `409`
10. Open Integrations, confirm server credential readiness, connect Google or Microsoft, validate the connection, and preview bounded mail/calendar metadata
11. Return to Career Copilot, ask about this week's availability, then reload and reopen the saved conversation from Recent chats
12. Open LinkedIn Studio, create or import a profile, edit multiple sections, save twice, run the audit, and restore the first revision
