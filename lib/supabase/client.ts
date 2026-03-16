/**
 * Supabase Browser Client
 * Use this client for client-side operations
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { createBrowserClient } from '@supabase/ssr'

// Check for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** True when Supabase env vars are present and the client can function. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

if (!isSupabaseConfigured) {
  console.warn('[Supabase] Missing environment variables. Auth features will not work.')
  console.warn('[Supabase] Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

/**
 * Create a Supabase browser client.
 * Returns null when env vars are missing instead of throwing,
 * so pages can render gracefully without auth.
 */
export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
    },
  })
}

// Singleton pattern for client-side use
let client: ReturnType<typeof createBrowserClient> | null = null

export function getClient() {
  if (!client) {
    client = createClient()
  }
  return client
}
