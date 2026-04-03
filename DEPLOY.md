# KithNode Deployment Guide

## Frontend (Vercel)

```bash
# From project root
vercel --prod
```

**Environment variables to set in Vercel:**
- `FASTAPI_URL` — your Railway backend URL (e.g. `https://kithnode-api.up.railway.app`)
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` — from Google Cloud Console
- `GOOGLE_CLIENT_SECRET` — from Google Cloud Console
- `NEXT_PUBLIC_POSTHOG_KEY` — from PostHog project settings
- `NEXT_PUBLIC_POSTHOG_HOST` — `https://us.i.posthog.com`

## Backend (Railway)

```bash
cd backend
railway up
```

**Environment variables to set in Railway:**
- `DATABASE_URL` — Supabase Postgres connection string
- `ANTHROPIC_API_KEY` — for AI email drafting
- `HUNTER_API_KEY` — for email verification
- `APOLLO_API_KEY` — for contact enrichment
- `CORS_ORIGINS` — your Vercel domain (e.g. `https://kithnode.vercel.app`)

## Seed Production Database

```bash
# SSH into Railway or run locally with DATABASE_URL set
cd backend
DATABASE_URL=postgresql://... python scripts/seed_pipeline.py --seed-only
```

## Smoke Test

1. `https://kithnode.vercel.app` — sign-in page renders
2. Sign in with @unc.edu Google account
3. Dashboard loads with contacts
4. Click a contact → detail page shows
5. Click "DRAFT" → outreach sheet opens
6. Navigate to Discover → swipe cards appear
