import { NextRequest, NextResponse } from "next/server"
import {
  LOCAL_DEV_ADMIN_COOKIE,
  createLocalDevAdminSession,
  isLocalDevAuthEnabled,
  isLocalDevRequestUrl,
} from "@/lib/auth/local-dev-session"
import { attachLocalDevLaunchpadSupabaseSession } from "@/lib/auth/local-dev-launchpad-session"
import { LAUNCHPAD_WORKSPACE_PATH } from "@/lib/launchpad/paths"

export const dynamic = "force-dynamic"

function sanitizeRedirect(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return LAUNCHPAD_WORKSPACE_PATH
  const trimmed = value.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return LAUNCHPAD_WORKSPACE_PATH
  }
  return trimmed
}

export async function GET(request: NextRequest) {
  if (!isLocalDevAuthEnabled() || !isLocalDevRequestUrl(request.url)) {
    return NextResponse.json({ error: "Local dev auth is unavailable" }, { status: 404 })
  }
  const redirectTo = sanitizeRedirect(request.nextUrl.searchParams.get("redirectTo"))
  const cookieCarrier = NextResponse.redirect(new URL(redirectTo, request.url), 303)
  cookieCarrier.cookies.set(LOCAL_DEV_ADMIN_COOKIE, createLocalDevAdminSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 12 * 60 * 60,
  })
  const minted = await attachLocalDevLaunchpadSupabaseSession(request, cookieCarrier)
  if (!minted.attached) {
    const login = new URL("/login", request.url)
    login.searchParams.set("redirectTo", redirectTo)
    login.searchParams.set("error", "Local test session could not open Launchpad. Sign in as morgan@mycosoft.org.")
    return NextResponse.redirect(login, 303)
  }
  return cookieCarrier
}

export async function POST(request: NextRequest) {
  if (!isLocalDevAuthEnabled() || !isLocalDevRequestUrl(request.url)) {
    return NextResponse.json({ error: "Local dev auth is unavailable" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const redirectTo = sanitizeRedirect(body.redirectTo)
  const cookieCarrier = NextResponse.json({ ok: true })
  cookieCarrier.cookies.set(LOCAL_DEV_ADMIN_COOKIE, createLocalDevAdminSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 12 * 60 * 60,
  })
  const minted = await attachLocalDevLaunchpadSupabaseSession(request, cookieCarrier)
  const response = NextResponse.json({
    success: true,
    redirectTo,
    supabaseSession: minted.attached,
    ...(minted.attached ? {} : { warning: minted.reason }),
  })
  for (const cookie of cookieCarrier.cookies.getAll()) {
    response.cookies.set(cookie)
  }
  return response
}

export async function DELETE(request: NextRequest) {
  if (!isLocalDevRequestUrl(request.url)) {
    return NextResponse.json({ error: "Local dev auth is unavailable" }, { status: 404 })
  }
  const response = NextResponse.json({ success: true })
  response.cookies.set(LOCAL_DEV_ADMIN_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 0,
  })
  return response
}
