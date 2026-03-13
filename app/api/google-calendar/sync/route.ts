import { google, calendar_v3 } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getGoogleOAuthClient, getValidAccessToken } from '@/lib/googleAuth'

// Google Calendar event colorId → hex. These are the official palette values shown in the UI.
// https://developers.google.com/calendar/api/v3/reference/colors/get
const GOOGLE_EVENT_COLORS: Record<string, string> = {
  '1':  '#7986cb', // Lavender
  '2':  '#33b679', // Sage
  '3':  '#8e24aa', // Grape
  '4':  '#e67c73', // Flamingo
  '5':  '#f6bf26', // Banana
  '6':  '#f5511d', // Tangerine
  '7':  '#039be5', // Peacock
  '8':  '#616161', // Graphite
  '9':  '#3f51b5', // Blueberry
  '10': '#0b8043', // Basil
  '11': '#d50000', // Tomato
}

// Converts a Google Calendar event datetime to { date, time } in app format.
// Google sends either a date (all-day: "2026-03-06") or dateTime (RFC 3339: "2026-03-06T14:00:00-07:00").
function parseGoogleDateTime(dt: { date?: string | null; dateTime?: string | null }): {
  date: string
  time: string | null
} {
  if (dt.date) {
    // All-day event: date only, no time
    return { date: dt.date, time: null }
  }
  if (dt.dateTime) {
    // Parse the RFC 3339 string directly — do NOT use new Date() as it converts to UTC
    // and loses the local date/time when the server runs in a different timezone.
    const [datePart, timePart] = dt.dateTime.split('T')
    const time = timePart ? timePart.substring(0, 5) : null // "HH:MM"
    return { date: datePart, time }
  }
  return { date: new Date().toISOString().split('T')[0], time: null }
}

// POST /api/google-calendar/sync
// Syncs events from all enabled Google calendars across ALL connected Google accounts.
// Expects Authorization: Bearer <supabase-access-token> header.
// Optionally accepts { integrationId: number } in body to sync only one account.
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  const userId = user.id

  let targetIntegrationId: number | null = null
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.integrationId) targetIntegrationId = Number(body.integrationId)
  } catch { /* empty body is fine */ }

  try {
    // Load all Google integrations for this user (one per connected account)
    let integrationsQuery = supabaseAdmin
      .from('user_integrations')
      .select('id, google_email')
      .eq('user_id', userId)
      .eq('provider', 'google')

    if (targetIntegrationId) {
      integrationsQuery = integrationsQuery.eq('id', targetIntegrationId)
    }

    const { data: integrations } = await integrationsQuery
    if (!integrations?.length) {
      return NextResponse.json({ error: 'No Google accounts connected.' }, { status: 401 })
    }

    // Sync window: 6 months ago → 1 year ahead (matches expandRecurringEvents range)
    const timeMin = new Date()
    timeMin.setMonth(timeMin.getMonth() - 6)
    const timeMax = new Date()
    timeMax.setFullYear(timeMax.getFullYear() + 1)

    let totalSynced = 0
    const syncedCalendars: string[] = []

    for (const integration of integrations) {
      const accessToken = await getValidAccessToken(integration.id)
      if (!accessToken) {
        console.warn(`Skipping integration ${integration.id} (${integration.google_email}): could not get valid token`)
        continue
      }

      // Fetch all enabled calendars for this specific account.
      // Also matches calendars with NULL integration_id (created before v2 migration backfill).
      const { data: calendars } = await supabaseAdmin
        .from('external_calendars')
        .select('id, external_calendar_id, calendar_name')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('is_enabled', true)
        .or(`integration_id.eq.${integration.id},integration_id.is.null`)

      if (!calendars?.length) continue

      const oauth2Client = getGoogleOAuthClient()
      oauth2Client.setCredentials({ access_token: accessToken })
      const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client })

      for (const cal of calendars) {
        try {
          // Fetch this calendar's background color (used as fallback when individual
          // events have no per-event colorId override)
          let calendarColor: string | null = null
          try {
            const calListEntry = await calendarApi.calendarList.get({ calendarId: cal.external_calendar_id })
            calendarColor = calListEntry.data.backgroundColor ?? null
          } catch {
            // Non-fatal — color defaults to null
          }
          const allEvents: calendar_v3.Schema$Event[] = []
          let pageToken: string | undefined = undefined

          do {
            const eventsRes: { data: calendar_v3.Schema$Events } = await calendarApi.events.list({
              calendarId: cal.external_calendar_id,
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              singleEvents: true,
              orderBy: 'startTime',
              maxResults: 2500,
              pageToken,
            })

            const items = eventsRes.data.items ?? []
            allEvents.push(...items)
            pageToken = eventsRes.data.nextPageToken ?? undefined
          } while (pageToken)

          const rows = allEvents
            .filter((ev: calendar_v3.Schema$Event) => ev.start && ev.status !== 'cancelled')
            .map((ev: calendar_v3.Schema$Event) => {
              const start = parseGoogleDateTime(ev.start as { date?: string; dateTime?: string })
              const end = ev.end
                ? parseGoogleDateTime(ev.end as { date?: string; dateTime?: string })
                : { date: start.date, time: null }

              let endDate: string | null = null
              if (start.time === null && end.date !== start.date) {
                const d = new Date(end.date)
                d.setDate(d.getDate() - 1)
                const adjusted = d.toISOString().split('T')[0]
                endDate = adjusted !== start.date ? adjusted : null
              } else if (start.time !== null && end.date !== start.date) {
                endDate = end.date
              }

              return {
                user_id: userId,
                external_calendar_id: cal.external_calendar_id,
                external_event_id: ev.id!,
                title: ev.summary ?? '(No title)',
                date: start.date,
                end_date: endDate,
                start_time: start.time,
                end_time: end.time,
                description: ev.description ?? '',
                is_all_day: start.time === null,
                provider: 'google',
                // Resolve color: event override → calendar color → null
                color_hex: ev.colorId
                  ? (GOOGLE_EVENT_COLORS[ev.colorId] ?? calendarColor)
                  : calendarColor,
              }
            })

          await supabaseAdmin
            .from('external_events')
            .delete()
            .eq('user_id', userId)
            .eq('external_calendar_id', cal.external_calendar_id)

          if (rows.length > 0) {
            const { error: insertError } = await supabaseAdmin
              .from('external_events')
              .insert(rows)

            if (insertError) {
              console.error(`Failed to insert events for ${cal.calendar_name}:`, insertError)
            } else {
              totalSynced += rows.length
            }
          }

          await supabaseAdmin
            .from('external_calendars')
            .update({ last_synced_at: new Date().toISOString() })
            .eq('id', cal.id)

          syncedCalendars.push(cal.calendar_name)
        } catch (calErr) {
          console.error(`Error syncing calendar ${cal.calendar_name}:`, calErr)
        }
      }
    }

    return NextResponse.json({ synced: totalSynced, calendars: syncedCalendars })
  } catch (err) {
    console.error('Sync error:', err)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}
