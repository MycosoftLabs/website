/**
 * Ethics Training API Proxy
 * Forwards requests to MAS ethics training API at /api/ethics/training
 * Uses NextAuth session (site auth) - not Supabase
 * Created: March 4, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { ETHICS_TRAINING_ALLOWED_EMAILS } from "@/lib/access/routes"

const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"
const BASE = `${MAS_API_URL}/api/ethics/training`

async function proxy(
  request: NextRequest,
  method: string,
  pathSegments: string[] = []
) {
  const session = await getServerSession(authOptions)
  const email = session?.user?.email?.toLowerCase() ?? ""
  const user = session?.user as { role?: string; isAdmin?: boolean } | undefined
  const allowedByEmail = ETHICS_TRAINING_ALLOWED_EMAILS.includes(email)
  const allowedByRole = user?.role === "owner" || user?.isAdmin === true
  if (!session?.user || (!allowedByEmail && !allowedByRole)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  const pathStr = pathSegments.filter(Boolean).join("/")
  const url = new URL(request.url)
  const search = url.searchParams.toString()
  const target = `${BASE}/${pathStr}${search ? `?${search}` : ""}`

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    const opts: RequestInit = { method, headers }
    if (method !== "GET" && method !== "DELETE") {
      const body = await request.text()
      if (body) opts.body = body
    }
    const res = await fetch(target, { ...opts, signal: AbortSignal.timeout(60000) })
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("Content-Type") || "application/json" },
    })
  } catch (e) {
    return NextResponse.json(
      { error: "Ethics training proxy error", detail: String(e) },
      { status: 502 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : [path].filter(Boolean)
  return proxy(request, "GET", segments)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : [path].filter(Boolean)
  return proxy(request, "POST", segments)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : [path].filter(Boolean)
  return proxy(request, "DELETE", segments)
}
