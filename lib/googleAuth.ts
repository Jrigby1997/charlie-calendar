// Server-only: Google OAuth client factory + token refresh utility.
// Shared by all /api/google-* routes to avoid code duplication.
//
// Future providers: add getAppleAuthClient(), getOutlookAuthClient() etc. here
// following the same pattern.

import { google } from 'googleapis'
import { supabaseAdmin } from '@/lib/supabase-admin'

/** Creates a configured Google OAuth2 client using environment credentials. */
export function getGoogleOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXT_PUBLIC_APP_URL}/api/google-auth/callback`
  )
}

/**
 * Returns a valid access token for the given integration ID, refreshing if expired.
 * Returns null if the token cannot be obtained (user must reconnect Google Calendar).
 */
export async function getValidAccessToken(integrationId: number): Promise<string | null> {
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
    console.error(`Integration ${integrationId}: no refresh token — user must reconnect.`)
    return null
  }

  try {
    const oauth2Client = getGoogleOAuthClient()
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
