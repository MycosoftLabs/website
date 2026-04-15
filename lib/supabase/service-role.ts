/**
 * Supabase client with the service role key (server-side only).
 *
 * After CMMC/anon hardening, `anon` has SELECT on only a small set of catalog tables
 * and cannot INSERT/UPDATE most application tables. API routes that serve public forms
 * or server jobs must use this client — never import from client components.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export function createServiceRoleClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
