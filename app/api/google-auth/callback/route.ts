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

// GET /api/google-auth/callback?code=...&state=...
// Google redirects here after user grants permission.
// Exchanges the code for tokens, saves them, and fetches the user's calendar list.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const errorParam = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  // User denied access
  if (errorParam) {
    return NextResponse.redirect(`${appUrl}/?google_error=${errorParam}`)
  }

  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}/?google_error=missing_params`)
  }

  // Decode state to get userId
  let userId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    userId = decoded.userId
    if (!userId) throw new Error('No userId in state')
  } catch {
    return NextResponse.redirect(`${appUrl}/?google_error=invalid_state`)
  }

  try {
    // Exchange authorization code for tokens
    const oauth2Client = getOAuthClient()
    const { tokens } = await oauth2Client.getToken(code)

    if (!tokens.access_token) {
      return NextResponse.redirect(`${appUrl}/?google_error=no_access_token`)
    }

    // Fetch the Google account email so we can support multiple accounts
    oauth2Client.setCredentials(tokens)
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client })
    const userInfo = await oauth2.userinfo.get()
    const googleEmail = userInfo.data.email ?? null

    // Upsert integration — conflict on (user_id, provider, google_email) allows multiple accounts
    const expiresAt = tokens.expiry_date
      ? new Date(tokens.expiry_date).toISOString()
      : null

    const { data: savedIntegration, error: integrationError } = await supabaseAdmin
      .from('user_integrations')
      .upsert(
        {
          user_id: userId,
          provider: 'google',
          google_email: googleEmail,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token ?? null,
          token_expires_at: expiresAt,
        },
        { onConflict: 'user_id,provider,google_email' }
      )
      .select('id')
      .single()

    if (integrationError || !savedIntegration) {
      console.error('Failed to save integration:', integrationError)
      return NextResponse.redirect(`${appUrl}/?google_error=db_error`)
    }

    const integrationId = savedIntegration.id

    // Fetch the user's calendar list and upsert into external_calendars
    const calendarApi = google.calendar({ version: 'v3', auth: oauth2Client })

    const calendarList = await calendarApi.calendarList.list({
      minAccessRole: 'reader',
    })

    const calendars = calendarList.data.items ?? []

    if (calendars.length > 0) {
      const rows = calendars.map((cal) => ({
        user_id: userId,
        provider: 'google',
        integration_id: integrationId,
        external_calendar_id: cal.id!,
        calendar_name: cal.summary ?? cal.id!,
        calendar_color: cal.backgroundColor ?? null,
        is_enabled: true,
        family_member_ids: '[]',
        last_synced_at: null,
      }))

      const { error: calError } = await supabaseAdmin
        .from('external_calendars')
        .upsert(rows, { onConflict: 'user_id,provider,external_calendar_id' })

      if (calError) {
        console.error('Failed to save calendars:', calError)
      }
    }

    // Redirect back to the app; page.tsx will detect this param and trigger initial sync
    return NextResponse.redirect(`${appUrl}/?connected=google`)
  } catch (err) {
    console.error('OAuth callback error:', err)
    return NextResponse.redirect(`${appUrl}/?google_error=callback_failed`)
  }
}
