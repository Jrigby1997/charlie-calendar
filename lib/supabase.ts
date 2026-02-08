import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Keep session in localStorage (default)
    autoRefreshToken: true, // Automatically refresh expired tokens (default)
    detectSessionInUrl: true, // Detect session from URL params (for email links)
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
