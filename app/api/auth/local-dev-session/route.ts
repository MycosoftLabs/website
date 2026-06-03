import { NextRequest, NextResponse } from "next/server"
import {
  LOCAL_DEV_ADMIN_COOKIE,
  createLocalDevAdminSession,
  isLocalDevAuthEnabled,
  isLocalDevRequestUrl,
} from "@/lib/auth/local-dev-session"

export const dynamic = "force-dynamic"

function sanitizeRedirect(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return "/dashboard"
  const trimmed = value.trim()
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("://")) {
    return "/dashboard"
  }
  return trimmed
}

export async function POST(request: NextRequest) {
  if (!isLocalDevAuthEnabled() || !isLocalDevRequestUrl(request.url)) {
    return NextResponse.json({ error: "Local dev auth is unavailable" }, { status: 404 })
  }

  const body = await request.json().catch(() => ({}))
  const redirectTo = sanitizeRedirect(body.redirectTo)
  const response = NextResponse.json({ success: true, redirectTo })
  response.cookies.set(LOCAL_DEV_ADMIN_COOKIE, createLocalDevAdminSession(), {
    httpOnly: true,
    sameSite: "lax",
    secure: false,
    path: "/",
    maxAge: 12 * 60 * 60,
  })
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
