import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getGoogleOAuthClient } from '@/lib/googleAuth'

// GET /api/google-auth?token=<supabase-access-token>
// Validates the user's Supabase session, embeds their user_id in the OAuth state,
// then redirects to Google's consent screen.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 401 })
  }

  // Validate the Supabase session token and resolve user_id
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 })
  }

  const oauth2Client = getGoogleOAuthClient()

  // Encode user_id in state so we can identify them on callback
  const state = Buffer.from(JSON.stringify({ userId: user.id })).toString('base64url')

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',   // Required to receive a refresh_token
    scope: [
      'https://www.googleapis.com/auth/calendar', // Full read+write access
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    prompt: 'consent',        // Always show consent so we get refresh_token on reconnect
    state,
  })

  return NextResponse.redirect(authUrl)
}
