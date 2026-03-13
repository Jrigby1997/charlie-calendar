// Provider-agnostic types and translation utilities for external calendar integrations.
//
// When adding Apple or Outlook support, add toAppleEventBody() / toOutlookEventBody()
// below, accepting the same ProviderEventInput. The app always works in ProviderEventInput
// format; each provider module handles the final translation.
//
// Used by:
//   app/api/google-calendar/events/route.ts       — create
//   app/api/google-calendar/events/[eventId]/route.ts — update + delete

import type { calendar_v3 } from 'googleapis'

// ─── Shared types ─────────────────────────────────────────────────────────────

/** The universal event shape the app uses when writing to external calendars. */
export type ProviderEventInput = {
  title: string
  startDate: string        // YYYY-MM-DD
  startTime: string | null // HH:MM 24-hour; null = all-day event
  endDate: string          // YYYY-MM-DD (inclusive)
  endTime: string | null   // HH:MM 24-hour; null = all-day event
  description: string
  isAllDay: boolean
  /**
   * IANA timezone string (e.g. "America/New_York"). Required for timed events.
   * Populated from Intl.DateTimeFormat().resolvedOptions().timeZone on the client.
   * Omitted / ignored for all-day events.
   */
  timeZone?: string
  /**
   * Optional RFC 5545 RRULE string **without** the "RRULE:" prefix.
   * Example: "FREQ=WEEKLY;BYDAY=MO,WE;COUNT=10"
   * Phase 1 (simple events only) will never set this.
   * Populate it in a future phase when adding recurring write support.
   */
  rrule?: string
}

/** Minimal event fields returned/confirmed after a successful create or update. */
export type ProviderCreatedEvent = {
  providerEventId: string
  provider: 'google' | 'apple' | 'outlook'
}

// ─── App fields → ProviderEventInput ──────────────────────────────────────────

/**
 * Converts the raw form fields from AddEventModal (or EditGoogleEventModal) into
 * a ProviderEventInput. Call this before toGoogleEventBody() (or future translators).
 */
export function appFieldsToProviderInput(fields: {
  title: string
  date: string
  endDate: string
  startTime: string
  endTime: string
  description: string
  timeZone?: string
  rrule?: string
}): ProviderEventInput {
  const isAllDay = !fields.startTime
  return {
    title: fields.title,
    startDate: fields.date,
    startTime: isAllDay ? null : fields.startTime,
    endDate: fields.endDate || fields.date,
    endTime: isAllDay ? null : (fields.endTime || null),
    description: fields.description || '',
    isAllDay,
    timeZone: fields.timeZone,
    rrule: fields.rrule,
  }
}

// ─── Google ───────────────────────────────────────────────────────────────────

/**
 * Translates a ProviderEventInput to a Google Calendar API event body.
 *
 * Design notes:
 * - Timed events use dateTime WITHOUT a TZ offset so Google treats them as
 *   local-time (the calendar's configured timezone). This mirrors how Google
 *   sends events back during sync, keeping round-trips consistent.
 * - All-day events use { date } and the end date is exclusive (+1 day), per spec.
 * - RRULE is appended as-is under event.recurrence (phase 2+).
 */
export function toGoogleEventBody(input: ProviderEventInput): calendar_v3.Schema$Event {
  const ev: calendar_v3.Schema$Event = {
    summary: input.title,
    description: input.description,
  }

  if (input.isAllDay || !input.startTime) {
    // All-day: Google end date is exclusive, so add 1 day
    ev.start = { date: input.startDate }
    ev.end   = { date: addDays(input.endDate || input.startDate, 1) }
  } else {
    // Timed: timeZone is required by Google API
    const tz = input.timeZone || 'UTC'
    ev.start = { dateTime: `${input.startDate}T${input.startTime}:00`, timeZone: tz }
    ev.end   = {
      dateTime: input.endTime
        ? `${input.endDate}T${input.endTime}:00`
        : `${input.startDate}T${input.startTime}:00`,
      timeZone: tz,
    }
  }

  if (input.rrule) {
    ev.recurrence = [`RRULE:${input.rrule}`]
  }

  return ev
}

// ─── Apple (Phase 3 placeholder) ──────────────────────────────────────────────
// export function toAppleEventBody(input: ProviderEventInput): ICalEvent { ... }

// ─── Outlook (Phase 4 placeholder) ────────────────────────────────────────────
// export function toOutlookEventBody(input: ProviderEventInput): MicrosoftGraphEvent { ... }

// ─── Utilities ────────────────────────────────────────────────────────────────

/** Adds N calendar days to a YYYY-MM-DD string without UTC offset issues. */
function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + n)
  const yr = dt.getFullYear()
  const mo = String(dt.getMonth() + 1).padStart(2, '0')
  const dy = String(dt.getDate()).padStart(2, '0')
  return `${yr}-${mo}-${dy}`
}

/**
 * Builds an RFC 5545 RRULE string (without the "RRULE:" prefix) from the app's
 * recurrence form fields. Ready to pass into ProviderEventInput.rrule.
 *
 * @param pattern   - 'daily' | 'weekly' | 'monthly' | 'yearly'
 * @param interval  - repeat every N units
 * @param days      - weekday names for weekly pattern, e.g. ['monday','wednesday']
 * @param endDate   - optional YYYY-MM-DD until date (inclusive)
 */
export function buildRRule(
  pattern: 'daily' | 'weekly' | 'monthly' | 'yearly',
  interval: number,
  days: string[],
  endDate: string | null
): string {
  const freqMap = { daily: 'DAILY', weekly: 'WEEKLY', monthly: 'MONTHLY', yearly: 'YEARLY' }
  const dayMap: Record<string, string> = {
    sunday: 'SU', monday: 'MO', tuesday: 'TU', wednesday: 'WE',
    thursday: 'TH', friday: 'FR', saturday: 'SA',
  }

  let rrule = `FREQ=${freqMap[pattern]};INTERVAL=${Math.max(1, interval)}`

  if (pattern === 'weekly' && days.length > 0) {
    const byday = days.map(d => dayMap[d.toLowerCase()]).filter(Boolean).join(',')
    if (byday) rrule += `;BYDAY=${byday}`
  }

  if (endDate) {
    // UNTIL uses UTC end-of-day so the last occurrence is included in any timezone
    rrule += `;UNTIL=${endDate.replace(/-/g, '')}T235959Z`
  }

  return rrule
}
