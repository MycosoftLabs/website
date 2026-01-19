/**
 * Supabase Browser Client
 * Use this client for client-side operations
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { createBrowserClient } from '@supabase/ssr'

// Check for environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Missing environment variables. Auth features will not work.')
  console.warn('[Supabase] Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

export function createClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase credentials not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local'
    )
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // Use implicit flow for OAuth to avoid PKCE code verifier issues with localhost
      flowType: 'implicit',
      detectSessionInUrl: true,
      persistSession: true,
    }
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
