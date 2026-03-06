import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google-auth/callback`
  )
}

// POST /api/google-calendar/disconnect
// Revokes Google access and deletes all integration data for the user.
// Expects Authorization: Bearer <supabase-access-token> header.
// Accepts optional JSON body: { integrationId: number } to disconnect a specific account.
// If integrationId is omitted, disconnects ALL Google accounts for the user.
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

  let integrationId: number | null = null
  try {
    const body = await request.json().catch(() => ({}))
    if (body?.integrationId) integrationId = Number(body.integrationId)
  } catch { /* no body is fine */ }

  try {
    // Build the query to find integration(s) to revoke
    let integrationsQuery = supabaseAdmin
      .from('user_integrations')
      .select('id, access_token')
      .eq('user_id', userId)
      .eq('provider', 'google')

    if (integrationId) {
      integrationsQuery = integrationsQuery.eq('id', integrationId)
    }

    const { data: integrations } = await integrationsQuery

    for (const integration of integrations ?? []) {
      // Revoke the token with Google (best-effort, non-fatal)
      try {
        const oauth2Client = getOAuthClient()
        oauth2Client.setCredentials({ access_token: integration.access_token })
        await oauth2Client.revokeCredentials()
      } catch (revokeErr) {
        console.warn(`Failed to revoke token for integration ${integration.id} (non-fatal):`, revokeErr)
      }

      // Delete events for all calendars in this integration
      // Also catches calendars with NULL integration_id (created before v2 migration)
      const { data: cals } = await supabaseAdmin
        .from('external_calendars')
        .select('external_calendar_id')
        .eq('provider', 'google')
        .or(`integration_id.eq.${integration.id},integration_id.is.null`)

      if (cals?.length) {
        await supabaseAdmin
          .from('external_events')
          .delete()
          .eq('user_id', userId)
          .in('external_calendar_id', cals.map(c => c.external_calendar_id))
      }

      // Delete calendars (also catches NULL integration_id rows from before v2 migration)
      await supabaseAdmin
        .from('external_calendars')
        .delete()
        .eq('provider', 'google')
        .or(`integration_id.eq.${integration.id},integration_id.is.null`)

      await supabaseAdmin
        .from('user_integrations')
        .delete()
        .eq('id', integration.id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Disconnect error:', err)
    return NextResponse.json({ error: 'Failed to disconnect' }, { status: 500 })
  }
}
