import { createHash } from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

// Lazy admin client (matches pattern from crypto/verify/route.ts)
let _admin: ReturnType<typeof createClient> | null = null
function getAdmin() {
  if (_admin) return _admin
  _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  return _admin
}

export interface AgentProfile {
  profile_id: string
  via: 'jwt' | 'api_key'
  api_key_id?: string
  balance_cents?: number
  rate_limit_per_minute?: number
  rate_limit_per_day?: number
  requests_this_minute?: number
  requests_today?: number
}

/**
 * Authenticate an agent request via API key (Bearer mk_...) or Supabase JWT cookie.
 * Returns profile info or null if not authenticated.
 */
export async function getAgentProfile(request: NextRequest): Promise<AgentProfile | null> {
  const authHeader = request.headers.get('authorization')

  // API key auth
  if (authHeader?.startsWith('Bearer mk_')) {
    const rawKey = authHeader.slice(7) // strip "Bearer "
    const keyHash = createHash('sha256').update(rawKey).digest('hex')
    const { data } = await getAdmin().rpc('validate_api_key', { p_key_hash: keyHash })

    if (data && data.length > 0 && data[0].is_active) {
      const row = data[0]
      return {
        profile_id: row.profile_id,
        via: 'api_key',
        api_key_id: row.api_key_id,
        balance_cents: row.balance_cents,
        rate_limit_per_minute: row.rate_limit_per_minute,
        rate_limit_per_day: row.rate_limit_per_day,
        requests_this_minute: row.requests_this_minute,
        requests_today: row.requests_today,
      }
    }
    return null
  }

  // JWT auth (Supabase cookies)
  try {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // Read-only in API routes
          },
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    // Look up profile balance
    const { data: profile } = await getAdmin()
      .from('profiles')
      .select('id, balance_cents')
      .eq('id', user.id)
      .single()

    if (!profile) return null

    return {
      profile_id: profile.id,
      via: 'jwt',
      balance_cents: profile.balance_cents,
    }
  } catch {
    return null
  }
}

/** Get the lazy admin Supabase client (service role) */
export { getAdmin }
