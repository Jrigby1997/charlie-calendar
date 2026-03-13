// PATCH /api/google-calendar/events/[eventId]  — update an event on Google
// DELETE /api/google-calendar/events/[eventId] — delete from Google + remove from external_events cache
//
// [eventId] is the Google event ID (URL-encoded if it contains special chars).
//
// PATCH body:  { integrationId, calendarId, event: { title, date, endDate, startTime, endTime, description } }
// DELETE params: ?integrationId=N&calendarId=CALENDAR_ID

import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getGoogleOAuthClient, getValidAccessToken } from '@/lib/googleAuth'
import { toGoogleEventBody, appFieldsToProviderInput } from '@/lib/calendarProviders'

// ── Shared helpers ─────────────────────────────────────────────────────────────

/** Verifies ownership of the integration and returns a fresh access token. */
async function resolveToken(integrationId: number, userId: string): Promise<string | null> {
  const { data: integration } = await supabaseAdmin
    .from('user_integrations')
    .select('id')
    .eq('id', integrationId)
    .eq('user_id', userId)
    .single()
  if (!integration) return null
  return getValidAccessToken(integrationId)
}

// ── PATCH — update ─────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const googleEventId = decodeURIComponent(eventId)

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })

  let body: { integrationId?: number; calendarId?: string; event?: Record<string, string>; timezone?: string }
  try { body = await request.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { integrationId, calendarId, event: eventFields, timezone } = body
  if (!integrationId || !calendarId || !eventFields) {
    return NextResponse.json({ error: 'Missing required fields: integrationId, calendarId, event' }, { status: 400 })
  }

  const accessToken = await resolveToken(integrationId, user.id)
  if (!accessToken) {
    return NextResponse.json({ error: 'Could not obtain valid access token — please reconnect Google Calendar in Settings' }, { status: 401 })
  }

  try {
    const oauth2Client = getGoogleOAuthClient()
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client })

    const providerInput = appFieldsToProviderInput({
      title: eventFields.title || '',
      date: eventFields.date || '',
      endDate: eventFields.endDate || eventFields.date || '',
      startTime: eventFields.startTime || '',
      endTime: eventFields.endTime || '',
      description: eventFields.description || '',
      timeZone: timezone,
      rrule: eventFields.rrule || undefined,
    })

    const googleEventBody = toGoogleEventBody(providerInput)

    await calendarApi.events.patch({
      calendarId,
      eventId: googleEventId,
      requestBody: googleEventBody,
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Google Calendar update event error:', err)
    return NextResponse.json({ error: err?.message || 'Failed to update event' }, { status: 502 })
  }
}

// ── DELETE ─────────────────────────────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params
  const googleEventId = decodeURIComponent(eventId)

  const token = request.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const integrationId = Number(searchParams.get('integrationId'))
  const calendarId = searchParams.get('calendarId')

  if (!integrationId || !calendarId) {
    return NextResponse.json({ error: 'Missing integrationId or calendarId query params' }, { status: 400 })
  }

  const accessToken = await resolveToken(integrationId, user.id)
  if (!accessToken) {
    return NextResponse.json({ error: 'Could not obtain valid access token — please reconnect Google Calendar in Settings' }, { status: 401 })
  }

  try {
    const oauth2Client = getGoogleOAuthClient()
    oauth2Client.setCredentials({ access_token: accessToken })
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client })

    await calendarApi.events.delete({ calendarId, eventId: googleEventId })

    // Remove cached copy from external_events so it disappears immediately
    await supabaseAdmin
      .from('external_events')
      .delete()
      .eq('external_event_id', googleEventId)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Google Calendar delete event error:', err)

    // 410 Gone = already deleted on Google's side; still clean up our cache
    if (err?.code === 410 || err?.status === 410) {
      await supabaseAdmin
        .from('external_events')
        .delete()
        .eq('external_event_id', googleEventId)
        .eq('user_id', user.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: err?.message || 'Failed to delete event' }, { status: 502 })
  }
}
