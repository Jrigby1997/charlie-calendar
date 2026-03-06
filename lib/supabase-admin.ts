import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Server-side only — uses the service role key to bypass RLS.
// Never import this in client components.
// Lazily initialized so the build doesn't crash when env vars aren't present.
let _supabaseAdmin: SupabaseClient | null = null

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables')
    }
    _supabaseAdmin = createClient(url, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return _supabaseAdmin
}

// Proxy that defers client creation until first use at runtime.
// Uses Reflect.get with the real client as receiver to preserve `this` binding
// inside Supabase's internal methods.
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop, _receiver) {
    const client = getSupabaseAdmin()
    const value = Reflect.get(client, prop, client)
    return typeof value === 'function' ? (value as Function).bind(client) : value
  },
})
