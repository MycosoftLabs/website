/**
 * Supabase Server Client
 * Use this client for server-side operations (Server Components, Route Handlers)
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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
