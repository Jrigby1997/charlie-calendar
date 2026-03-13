// POST /api/google-calendar/events
// Creates a new event directly on a connected Google Calendar (single-source approach).
// The event is NOT stored locally — it arrives via the next sync as an external_event.
//
// Request body:
//   integrationId : number  — which connected Google account
//   calendarId    : string  — target Google calendar ID (e.g. "primary" or full address)
//   event         : {
//     title       : string
//     date        : string  — YYYY-MM-DD start date
//     endDate     : string  — YYYY-MM-DD end date (can equal date for single-day)
//     startTime   : string  — HH:MM, or "" for all-day
//     endTime     : string  — HH:MM, or "" for all-day
//     description : string
//   }
//
// Response: { googleEventId: string, googleCalendarId: string }

import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getGoogleOAuthClient, getValidAccessToken } from '@/lib/googleAuth'
import { toGoogleEventBody, appFieldsToProviderInput } from '@/lib/calendarProviders'

export async function POST(request: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })

  // ── Parse body ──────────────────────────────────────────────────────────────
  let body: { integrationId?: number; calendarId?: string; event?: Record<string, string>; timezone?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { integrationId, calendarId, event: eventFields, timezone } = body

  if (!integrationId || !calendarId || !eventFields?.title || !eventFields?.date) {
    return NextResponse.json(
      { error: 'Missing required fields: integrationId, calendarId, event.title, event.date' },
      { status: 400 }
    )
  }

  // ── Verify integration belongs to this user ─────────────────────────────────
  const { data: integration } = await supabaseAdmin
    .from('user_integrations')
    .select('id')
    .eq('id', integrationId)
    .eq('user_id', user.id)
    .single()

  if (!integration) {
    return NextResponse.json({ error: 'Integration not found or does not belong to this user' }, { status: 404 })
  }

  // ── Get valid access token ──────────────────────────────────────────────────
  const accessToken = await getValidAccessToken(integrationId)
  if (!accessToken) {
    return NextResponse.json(
      { error: 'Could not obtain a valid access token — please reconnect Google Calendar in Settings' },
      { status: 401 }
    )
  }

  // ── Create on Google ────────────────────────────────────────────────────────
  try {
    const oauth2Client = getGoogleOAuthClient()
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client })

    const providerInput = appFieldsToProviderInput({
      title: eventFields.title,
      date: eventFields.date,
      endDate: eventFields.endDate || eventFields.date,
      startTime: eventFields.startTime || '',
      endTime: eventFields.endTime || '',
      description: eventFields.description || '',
      timeZone: timezone,
      rrule: eventFields.rrule || undefined,
    })

    const googleEventBody = toGoogleEventBody(providerInput)
    console.log('[POST /api/google-calendar/events] recurrence:', JSON.stringify(googleEventBody.recurrence))

    const { data: created } = await calendarApi.events.insert({
      calendarId,
      requestBody: googleEventBody,
    })

    if (!created?.id) {
      return NextResponse.json({ error: 'Google Calendar returned no event ID' }, { status: 502 })
    }

    return NextResponse.json({ googleEventId: created.id, googleCalendarId: calendarId })
  } catch (err: any) {
    console.error('Google Calendar create event error:', err)
    const status = err?.code === 403 ? 403 : 502
    return NextResponse.json(
      { error: err?.message || 'Failed to create event on Google Calendar' },
      { status }
    )
  }
}
