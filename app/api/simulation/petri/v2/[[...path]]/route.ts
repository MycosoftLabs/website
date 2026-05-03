/**
 * Petri Dish v2 — proxy to MAS `/api/simulation/petri/v2/*` (forwards to Rust engine when configured).
 * Date: May 02, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

const BASE = `${resolveMasServerBaseUrl()}/api/simulation/petri/v2`

async function proxy(request: NextRequest, method: string, segments: string[]) {
  const pathStr = segments.filter(Boolean).join("/")
  const url = new URL(request.url)
  const search = url.searchParams.toString()
  const target = `${BASE}/${pathStr}${search ? `?${search}` : ""}`.replace(/([^:]\/)\/+/g, "$1")

  const headers: Record<string, string> = { Accept: "application/json" }
  const opts: RequestInit = { method, headers, signal: AbortSignal.timeout(120_000) }

  if (method !== "GET" && method !== "HEAD") {
    const bodyText = await request.text()
    if (bodyText) {
      headers["Content-Type"] = request.headers.get("Content-Type") || "application/json"
      opts.body = bodyText
    }
  }

  try {
    const res = await fetch(target, opts)
    const data = await res.arrayBuffer()
    const ct = res.headers.get("Content-Type") || "application/json"
    return new NextResponse(data, { status: res.status, headers: { "Content-Type": ct } })
  } catch (e) {
    return NextResponse.json(
      { error: "petri_v2_proxy", detail: String(e) },
      { status: 502 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : path ? [path] : []
  return proxy(request, "GET", segments)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : path ? [path] : []
  return proxy(request, "POST", segments)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : path ? [path] : []
  return proxy(request, "PUT", segments)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : path ? [path] : []
  return proxy(request, "DELETE", segments)
}
