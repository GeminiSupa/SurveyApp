# Survey Lab Full V1

Mobile-first research platform for UX researchers, designers, and psychologists.

## Main Experiences

- `/(marketing)` landing and positioning
- `/auth/*` admin sign-in (magic link + GitHub + Google)
- `/admin/*` creator suite (dashboard, lab, audience, publish, analytics)
- `/participant/[studyId]` clean-room participant runtime with magic-link support

## Setup

1. Install dependencies

```bash
npm install
```

2. Configure env

```bash
cp .env.example .env.local
```

Fill:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (required for hardened server-side participant token validation)

3. Run SQL scripts in Supabase SQL Editor (in this order)

- `supabase/schema.sql`
- `supabase/rls.sql`
- `supabase/seed.sql`

4. Start app

```bash
npm run dev
```

## Included V1 Capabilities

- Auth/org baseline:
  - login routes
  - callback route storing session cookies
  - admin route guard middleware
  - organization/project/membership schema
- Builder flow:
  - toolbox + center canvas + logic panel
  - save draft study with blocks
- Audience flow:
  - participant group import
  - magic-link generation
- Publish flow:
  - publish study + URL + QR endpoint
- Participant flow:
  - consent gating
  - block renderer for survey/ux/reaction-time/iat
  - session start, event logging, completion submission
- Analytics:
  - UX and psych summary widgets
  - heatmap preview grid
  - export endpoint (JSON/CSV)
- Global polish:
  - high contrast toggle
  - explicit logout
  - lightweight API timing instrumentation

## Deployment Hardening Notes

- Participant APIs are now token-bound:
  - session start returns `participantToken`
  - event/complete endpoints require matching `sessionId + participantToken`
- Admin APIs require authenticated Supabase user context.
- RLS has been tightened for participant data tables; re-run:
  - `supabase/rls.sql`
- Replay protection is enabled on critical POST endpoints using `x-request-id`.
- Origin checks are enforced for mutating endpoints against `NEXT_PUBLIC_SITE_URL`.
- Rate limiting is enabled in-process per IP for admin and participant mutation routes.
- Structured audit logs are written to:
  - `security_audit_logs` table
  - JSON `console.info` events with `type: "audit"`

## Demo

Seed creates a study with `public_id='demo'`, so you can test:

- `/participant/demo`
- `/admin/dashboard`
