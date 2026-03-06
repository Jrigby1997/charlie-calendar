# Google Calendar Integration

**Status:** Complete ✅ (Multi-account, multi-member, read-only with detail popups)
**Started:** March 5, 2026
**Last Updated:** March 6, 2026
**Sync Direction:** Read-only (bidirectional scaffolded for future)
**Package:** `googleapis` npm package (chosen to support future two-way sync, webhooks, and batch writes)

---

## Architecture Overview

- OAuth 2.0 flow: user connects Google account via Settings → Connected Calendars
- Multiple Google accounts supported — one `user_integrations` row per account, grouped by `google_email`
- Tokens stored server-side in Supabase (`user_integrations` table), never in localStorage
- Lazy-initialized `supabaseAdmin` client — defers key validation to runtime to avoid build failures
- Synced events cached in Supabase (`external_events` table) — not fetched live on every load
- Silent background sync on page load if last sync > 15 minutes ago
- Manual "Sync Now" button in Settings modal
- Google events blended into the calendar UI, assigned to one or more family members or shown as unassigned
- External events are non-editable — clicking opens a read-only detail popup (`ExternalEventDetailModal`)
- Google events show a gradient Google 'G' badge in all calendar views

---

## Database Schema

### `user_integrations`
One row per connected Google account per user.

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | auto-increment |
| user_id | uuid | → auth.users |
| provider | text | 'google' |
| google_email | text | Google account email (added in v2) |
| access_token | text | |
| refresh_token | text | |
| token_expires_at | timestamptz | auto-refresh when past |
| created_at | timestamptz | |

Unique constraint: `(user_id, provider, google_email)` — allows multiple Google accounts.

### `external_calendars`
One row per connected Google calendar.

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | auto-increment |
| user_id | uuid | → auth.users |
| provider | text | 'google' |
| integration_id | bigint | → user_integrations.id (added in v2) |
| external_calendar_id | text | Google's calendarId |
| calendar_name | text | |
| calendar_color | text | Google's hex color |
| is_enabled | boolean | default true |
| family_member_ids | text | JSON array of member IDs (replaces single family_member_id in v2) |
| last_synced_at | timestamptz | |
| created_at | timestamptz | |

### `external_events`
Cached synced events from Google.

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | auto-increment |
| user_id | uuid | → auth.users |
| external_calendar_id | text | Google's calendarId |
| external_event_id | text | Google's event ID |
| title | text | |
| date | date | start date (parsed directly from RFC 3339 — no UTC conversion) |
| end_date | date nullable | for multi-day events |
| start_time | text nullable | "HH:MM", null if all-day |
| end_time | text nullable | "HH:MM", null if all-day |
| description | text | |
| is_all_day | boolean | |
| provider | text | 'google' |
| created_at | timestamptz | |

---

## Migrations

| File | Purpose | Status |
|---|---|---|
| `supabase_migration_google_calendar.sql` | Creates the 3 tables with original schema | Run ✅ |
| `supabase_migration_google_calendar_v2.sql` | Adds `google_email`, `integration_id`, `family_member_ids`; backfills NULL rows | Run ✅ |

---

## API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/google-auth` | GET | Redirects to Google OAuth consent screen |
| `/api/google-auth/callback` | GET | Exchanges code for tokens, fetches `google_email`, saves integration + calendar list |
| `/api/google-calendar/sync` | POST | Syncs events for all enabled calendars (all accounts or specific `integrationId`) |
| `/api/google-calendar/disconnect` | POST | Deletes tokens, calendars, cached events — per-account or all accounts |

---

## Files

| File | Status | Notes |
|---|---|---|
| `supabase_migration_google_calendar.sql` | ✅ | Original v1 migration |
| `supabase_migration_google_calendar_v2.sql` | ✅ | Multi-account/multi-member schema upgrade + backfill |
| `lib/supabase-admin.ts` | ✅ | Lazy-init Proxy, preserves `this` binding |
| `app/api/google-auth/route.ts` | ✅ | OAuth initiation |
| `app/api/google-auth/callback/route.ts` | ✅ | Fetches `google_email`, upserts on email discriminator, links calendars |
| `app/api/google-calendar/sync/route.ts` | ✅ | Multi-account, timezone-safe RFC 3339 parsing, handles NULL integration_id |
| `app/api/google-calendar/disconnect/route.ts` | ✅ | Per-account or all-accounts, handles NULL integration_id |
| `app/components/ExternalEventDetailModal.tsx` | ✅ | Read-only popup with G badge, member pills, description |
| `app/components/SettingsModal.tsx` | ✅ | Grouped by account, multi-member avatar toggles, Add Another Account |
| `app/components/CalendarView.tsx` | ✅ | Google G gradient badge, external event click passthrough |
| `app/page.tsx` | ✅ | Multi-member mapping, ExternalEventDetailModal wired up |

---

## Environment Variables

```
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000          # production: https://your-app.vercel.app
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>       # server-side only, never exposed to client
```

---

## Google Cloud Setup

1. ✅ Created Google Cloud project
2. ✅ Enabled **Google Calendar API**
3. ✅ Created **OAuth 2.0 credentials** (Web application type)
4. ✅ Added authorized redirect URIs:
   - `http://localhost:3000/api/google-auth/callback` (dev)
   - `https://charlie-calendar.vercel.app/api/google-auth/callback` (production)
5. ✅ Credentials added to `.env.local` and Vercel environment variables

---

## Implementation Checklist

- [x] Google Cloud setup
- [x] Install `googleapis` npm package
- [x] v1 Supabase migration (3 tables)
- [x] v2 Supabase migration (multi-account, multi-member schema + backfill)
- [x] `lib/supabase-admin.ts` — lazy init, build-safe, `this`-binding safe
- [x] OAuth initiation route
- [x] OAuth callback route (fetches `google_email`, upserts on email discriminator)
- [x] Sync route (multi-account, timezone-safe date parsing, handles NULL integration_id)
- [x] Disconnect route (per-account or all-accounts, handles NULL integration_id)
- [x] `ExternalEventDetailModal` component
- [x] `SettingsModal` — grouped by account, multi-member avatar toggles, Add Another Account
- [x] `CalendarView` — Google G badge, external event click passthrough
- [x] `page.tsx` — multi-member mapping, detail modal integration
- [x] Production deployment (Vercel env vars, Google redirect URI)

---

## Bugs Resolved

| Issue | Fix |
|---|---|
| Build failure: `supabaseKey is required` | Lazy-init Proxy in `supabase-admin.ts` defers client creation to runtime |
| Timezone shift (events wrong time in production) | Parse date/time directly from RFC 3339 string instead of `new Date()` + `.toISOString()` |
| Sync not updating existing events | Sync queried `integration_id = X` but calendars had `NULL` — fixed with `.or('integration_id.eq.X,integration_id.is.null')` |
| Disconnect returning 500 | Proxy `this`-binding issue — fixed with `Reflect.get(..., client)` + `.bind(client)` |
| OAuth redirecting to localhost in production | Set `NEXT_PUBLIC_APP_URL` env var on Vercel |
| `ADD CONSTRAINT IF NOT EXISTS` SQL syntax error | PostgreSQL doesn't support this — fixed with `DROP … IF EXISTS` then `ADD CONSTRAINT` |
| Settings showing "No calendars found" | `integration_id` NULL on pre-v2 rows — backfill query links calendars to their integration |

---

## Future: Bidirectional Sync Notes

- `googleapis` already installed — expand OAuth scope from `calendar.readonly` to `calendar`
- Use `syncToken` (Google's incremental sync API) to avoid re-fetching all events each sync
- Push notifications via Google Calendar webhooks (`watch` API) for real-time updates
- Add `google_event_id` column to local `events` table to map Skylight ↔ Google events
- Conflict resolution strategy TBD (last-write-wins vs. source-of-truth preference)


---

## Architecture Overview

- OAuth 2.0 flow: user connects Google account via a "Connect Google Calendar" button in Settings
- Tokens stored server-side in Supabase (`user_integrations` table), never in localStorage
- Synced events cached in Supabase (`external_events` table) — not fetched live on every load
- Silent background sync on page load if last sync > 15 minutes ago
- Manual "Sync Now" button with refresh icon in calendar header and Settings modal
- Google events blended into the calendar UI, assigned to family members (using their colors) or shown as "Unassigned"
- External events are non-editable (read-only detail popover on click)

---

## New Supabase Tables

### `user_integrations`
Stores OAuth tokens per user.

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | auto-increment |
| user_id | uuid | → auth.users |
| provider | text | 'google' |
| access_token | text | |
| refresh_token | text | |
| token_expires_at | timestamptz | auto-refresh when past |
| created_at | timestamptz | |

RLS: user can only access their own row.

### `external_calendars`
One row per connected Google calendar.

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | auto-increment |
| user_id | uuid | → auth.users |
| provider | text | 'google' |
| external_calendar_id | text | Google's calendarId |
| calendar_name | text | |
| calendar_color | text | Google's hex color |
| is_enabled | boolean | default true |
| family_member_id | bigint nullable | → family_members |
| last_synced_at | timestamptz | |
| created_at | timestamptz | |

RLS: user-scoped.

### `external_events`
Cached synced events from Google.

| Column | Type | Notes |
|---|---|---|
| id | bigint PK | auto-increment |
| user_id | uuid | → auth.users |
| external_calendar_id | text | Google's calendarId |
| external_event_id | text | Google's event ID (unique per calendar) |
| title | text | |
| date | date | start date |
| end_date | date nullable | for multi-day events |
| start_time | text nullable | "HH:MM", null if all-day |
| end_time | text nullable | "HH:MM", null if all-day |
| description | text | |
| is_all_day | boolean | |
| provider | text | 'google' |
| created_at | timestamptz | |

RLS: user-scoped.

---

## New API Routes

| Route | Method | Purpose |
|---|---|---|
| `/api/google-auth` | GET | Redirects user to Google OAuth consent screen |
| `/api/google-auth/callback` | GET | Exchanges code for tokens, saves to Supabase, fetches calendar list |
| `/api/google-calendar/sync` | POST | Syncs events from all enabled calendars into `external_events` |
| `/api/google-calendar/disconnect` | POST | Deletes all tokens, calendars, and cached events for the user |

---

## Files to Create

- `supabase_migration_google_calendar.sql`
- `app/api/google-auth/route.ts`
- `app/api/google-auth/callback/route.ts`
- `app/api/google-calendar/sync/route.ts`
- `app/api/google-calendar/disconnect/route.ts`

## Files to Modify

- `app/components/SettingsModal.tsx` — add "Connected Calendars" section
- `app/components/CalendarView.tsx` — render external events, sync button, read-only click handler
- `app/page.tsx` — load external events, background sync on mount, handle `?connected=google`

---

## Environment Variables

```
GOOGLE_CLIENT_ID=<your-client-id>
GOOGLE_CLIENT_SECRET=<your-client-secret>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Google Cloud Setup (Complete ✅)

1. ✅ Created Google Cloud project
2. ✅ Enabled **Google Calendar API**
3. ✅ Created **OAuth 2.0 credentials** (Web application type)
4. ✅ Added authorized redirect URIs:
   - `http://localhost:3000/api/google-auth/callback` (dev)
   - Production URL (when deploying)
5. ✅ Credentials added to `.env.local`

---

## Implementation Progress

- [x] Google Cloud setup
- [x] Install `googleapis` npm package
- [x] Supabase migration (3 tables) — `supabase_migration_google_calendar.sql`
- [x] Supabase admin helper — `lib/supabase-admin.ts`
- [x] OAuth initiation route (`/api/google-auth`)
- [x] OAuth callback route (`/api/google-auth/callback`)
- [x] Sync API route (`/api/google-calendar/sync`)
- [x] Disconnect route (`/api/google-calendar/disconnect`)
- [x] SettingsModal — "Connected Calendars" section
- [x] `page.tsx` — load external events, background sync, `?connected=google` param
- [x] `CalendarView.tsx` — render external events, sync button, read-only click handler

---

## Future: Bidirectional Sync Notes

- `googleapis` package already installed — expand OAuth scope from `calendar.readonly` to `calendar`
- Use `syncToken` (Google's incremental sync API) to avoid re-fetching all events on every sync
- Push notifications via Google Calendar webhooks (`watch` API) for real-time updates
- Need a `google_event_id` column added to the local `events` table to map Skylight ↔ Google events
- Conflict resolution strategy TBD (last-write-wins vs. source-of-truth preference)
- Write operations needed: create, update, delete events via `calendar.events.insert/update/delete`
