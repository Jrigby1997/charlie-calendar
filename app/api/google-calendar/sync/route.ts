import { google, calendar_v3 } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google-auth/callback`
  )
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
    // Parse the RFC 3339 string directly (e.g. "2026-03-06T14:00:00-07:00").
    // Do NOT use new Date() here — that converts to UTC and loses the local date/time
    // when the server (Vercel) runs in a different timezone than the user.
    const [datePart, timePart] = dt.dateTime.split('T')
    const time = timePart ? timePart.substring(0, 5) : null // "HH:MM"
    return { date: datePart, time }
  }
  return { date: new Date().toISOString().split('T')[0], time: null }
}

// Ensures the access token is fresh for a specific integration row; refreshes if expired.
async function getValidAccessTokenForIntegration(integrationId: number): Promise<string | null> {
  const { data: integration, error } = await supabaseAdmin
    .from('user_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('id', integrationId)
    .single()

  if (error || !integration) return null

  const isExpired =
    integration.token_expires_at &&
    new Date(integration.token_expires_at).getTime() < Date.now() + 60_000

  if (!isExpired) return integration.access_token

  if (!integration.refresh_token) {
    console.error(`Integration ${integrationId}: no refresh token, user must reconnect.`)
    return null
  }

  try {
    const oauth2Client = getOAuthClient()
    oauth2Client.setCredentials({ refresh_token: integration.refresh_token })
    const { credentials } = await oauth2Client.refreshAccessToken()

    await supabaseAdmin
      .from('user_integrations')
      .update({
        access_token: credentials.access_token!,
        token_expires_at: credentials.expiry_date
          ? new Date(credentials.expiry_date).toISOString()
          : null,
      })
      .eq('id', integrationId)

    return credentials.access_token!
  } catch (err) {
    console.error(`Token refresh failed for integration ${integrationId}:`, err)
    return null
  }
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
      const accessToken = await getValidAccessTokenForIntegration(integration.id)
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

      const oauth2Client = getOAuthClient()
      oauth2Client.setCredentials({ access_token: accessToken })
      const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client })

      for (const cal of calendars) {
        try {
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
