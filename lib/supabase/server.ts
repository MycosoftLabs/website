/**
 * Supabase Server Client
 * Use this client for server-side operations (Server Components, Route Handlers)
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    // Return a minimal stub that always resolves to no-user so pages can render
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: { message: 'Supabase not configured', status: 500 } }),
        getSession: async () => ({ data: { session: null }, error: { message: 'Supabase not configured', status: 500 } }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: { message: 'Supabase not configured', status: 500 } }),
        signOut: async () => ({ error: null }),
        signInWithOtp: async () => ({ error: { message: 'Supabase not configured' } }),
        signInWithOAuth: async () => ({ error: { message: 'Supabase not configured' } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ eq: () => ({ single: async () => ({ data: null, error: { code: 'NOT_CONFIGURED' } }) }) }),
        insert: async () => ({ data: null, error: { code: 'NOT_CONFIGURED' } }),
        update: () => ({ eq: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: 'NOT_CONFIGURED' } }) }) }) }),
        delete: () => ({ eq: async () => ({ data: null, error: { code: 'NOT_CONFIGURED' } }) }),
      }),
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Ensure proper cookie options for production
              cookieStore.set(name, value, {
                ...options,
                path: options?.path || '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              })
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Create Supabase client for Route Handlers that redirect after auth.
 * Cookies set by signIn/signOut are written to the redirect response,
 * not cookieStore, so they are sent with the redirect.
 * @see https://github.com/supabase/ssr/blob/main/docs/design.md
 */
export function createClientForRedirect(
  request: Request,
  redirectResponse: { cookies: { set: (name: string, value: string, options?: Partial<ResponseCookie>) => void } }
) {
  const requestCookies = request.headers.get('cookie') ?? ''
  const parsed = parseCookieString(requestCookies)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase credentials not configured for redirect auth flow')
  }

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return parsed
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            redirectResponse.cookies.set(name, value, {
              ...options,
              path: options?.path ?? '/',
              sameSite: (options?.sameSite as 'lax' | 'strict' | 'none') ?? 'lax',
              secure: options?.secure ?? process.env.NODE_ENV === 'production',
            })
          })
        },
      },
    }
  )
}

function parseCookieString(cookieHeader: string): { name: string; value: string }[] {
  if (!cookieHeader) return []
  return cookieHeader.split(';').map((pair) => {
    const [name, ...valueParts] = pair.trim().split('=')
    return { name: name?.trim() ?? '', value: valueParts.join('=').trim() ?? '' }
  }).filter((c) => c.name)
}

/**
 * Create admin client with service role key
 * Use this ONLY for server-side operations that need elevated privileges
 */
export async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Supabase] Admin credentials not configured — falling back to anon client')
    return createClient()
  }

  const cookieStore = await cookies()

  return createServerClient(
    supabaseUrl,
    serviceRoleKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                path: options?.path || '/',
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              })
            })
          } catch {
            // Ignore in Server Component
          }
        },
      },
    }
  )
}
