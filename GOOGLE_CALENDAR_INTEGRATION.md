# Google Calendar Integration Plan

**Status:** In Progress — Google Cloud setup complete, `googleapis` installed
**Started:** March 5, 2026
**Sync Direction:** Read-only first → bidirectional in future
**Package:** `googleapis` npm package (chosen to support future two-way sync, webhooks, and batch writes)

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
