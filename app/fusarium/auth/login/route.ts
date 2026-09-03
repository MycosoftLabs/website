import { getAuthOrigin } from "@/lib/auth/get-auth-origin"
import {
  FUSARIUM_OWNER_LOGIN_PATH,
  fusariumOwnerDeniedResponse,
  isFusariumOwnerEmail,
} from "@/lib/auth/fusarium-owner-gate"
import { FUSARIUM_OPERATOR_APP_PATH } from "@/lib/fusarium-operator-login"
import { createClientForRedirect } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const url = new URL(request.url)
  const origin = getAuthOrigin(request)
  const redirectFromUrl = url.searchParams.get("redirect") || url.searchParams.get("redirectTo")
  const loginPath = FUSARIUM_OWNER_LOGIN_PATH

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const preserveRedirect = redirectFromUrl
      ? `&redirectTo=${encodeURIComponent(redirectFromUrl)}`
      : ""
    return NextResponse.redirect(
      `${origin}${loginPath}?error=${encodeURIComponent("Fusarium sign-in is not configured.")}${preserveRedirect}`,
      303
    )
  }

  const formData = await request.formData()
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const redirectTo =
    redirectFromUrl ||
    (formData.get("redirectTo") as string) ||
    (formData.get("redirect") as string) ||
    FUSARIUM_OPERATOR_APP_PATH

  if (!email || !password) {
    return NextResponse.redirect(
      `${origin}${loginPath}?error=${encodeURIComponent("Email and password are required")}&redirectTo=${encodeURIComponent(redirectTo)}`,
      303
    )
  }

  const path = redirectTo.includes("://")
    ? FUSARIUM_OPERATOR_APP_PATH
    : redirectTo.startsWith("/")
      ? redirectTo
      : `/${redirectTo}`
  const continueUrl = `${origin}/auth/continue?next=${encodeURIComponent(path)}`
  const redirectResponse = NextResponse.redirect(continueUrl, 303)

  const supabase = createClientForRedirect(request, redirectResponse)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return NextResponse.redirect(
      `${origin}${loginPath}?error=${encodeURIComponent(error.message)}&redirectTo=${encodeURIComponent(redirectTo)}`,
      303
    )
  }

  if (!isFusariumOwnerEmail(data.user?.email)) {
    return fusariumOwnerDeniedResponse()
  }

  return redirectResponse
}
