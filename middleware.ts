/**
 * Middleware - Supabase session refresh + case-sensitive redirects
 * 1. Refreshes Supabase auth session and syncs cookies (required for server to see session)
 * 2. /MYCA (uppercase) -> /myca to support legacy links
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const response =
    pathname === "/MYCA"
      ? NextResponse.redirect(new URL("/myca", request.url), 302)
      : NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })
    await supabase.auth.getUser()
  }

  return response
}
