/**
 * MINDEX BFF — proxy to MINDEX API `/api/mindex/*` (no mock fallback).
 * Date: May 03, 2026
 *
 * Examples:
 *   GET /api/mindex/health/all
 *   GET /api/mindex/ledger/stream  (SSE)
 *   GET /api/mindex/integrity/stream
 */

import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { fetchMindexWithAuthRetry, mindexUpstreamHeaders } from "@/lib/mindex-bff-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function upstreamUrl(segments: string[], request: NextRequest): string {
  const base = resolveMindexServerBaseUrl().replace(/\/$/, "")
  const pathStr = segments.filter(Boolean).join("/")
  const url = new URL(request.url)
  const q = url.searchParams.toString()
  const suffix = pathStr ? `/${pathStr}` : ""
  const target = `${base}/api/mindex${suffix}${q ? `?${q}` : ""}`
  return target.replace(/([^:]\/)\/+/g, "$1")
}

function isLikelySse(segments: string[], request: NextRequest): boolean {
  const p = segments.join("/").toLowerCase()
  if (p.includes("/stream")) return true
  const accept = request.headers.get("accept") || ""
  return accept.includes("text/event-stream")
}

async function proxy(request: NextRequest, method: string, segments: string[]): Promise<Response> {
  const target = upstreamUrl(segments, request)
  const sse = isLikelySse(segments, request)
  const headers = mindexUpstreamHeaders({
    Accept: request.headers.get("Accept") || (sse ? "text/event-stream" : "application/json"),
  })

  const init: RequestInit = {
    method,
    headers,
  }

  if (sse) {
    init.cache = "no-store"
  } else {
    const path = segments.join("/").toLowerCase()
    const timeoutMs =
      path === "health/all" || path === "health" || path.endsWith("/health")
        ? 3_500
        : path.startsWith("library/") || path.startsWith("sine/")
          ? 45_000
        : 15_000
    init.signal = AbortSignal.timeout(timeoutMs)
  }

  if (method !== "GET" && method !== "HEAD") {
    const bodyText = await request.text()
    if (bodyText) {
      headers.set("Content-Type", request.headers.get("Content-Type") || "application/json")
      init.body = bodyText
      Object.assign(init, { duplex: "half" as const })
    }
  }

  let upstream: Response
  try {
    upstream = await fetchMindexWithAuthRetry(target, init)
  } catch (e) {
    return NextResponse.json({ error: "mindex_bff_upstream", detail: String(e) }, { status: 502 })
  }

  if (sse && upstream.body) {
    const outHeaders = new Headers()
    outHeaders.set("Content-Type", upstream.headers.get("Content-Type") || "text/event-stream")
    outHeaders.set("Cache-Control", "no-cache, no-transform")
    outHeaders.set("Connection", "keep-alive")
    return new NextResponse(upstream.body, { status: upstream.status, headers: outHeaders })
  }

  const buf = await upstream.arrayBuffer()
  const ct = upstream.headers.get("Content-Type") || "application/json"
  return new NextResponse(buf, { status: upstream.status, headers: { "Content-Type": ct } })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : path ? [path] : []
  return proxy(request, "GET", segments)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : path ? [path] : []
  return proxy(request, "POST", segments)
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : path ? [path] : []
  return proxy(request, "PUT", segments)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params
  const segments = Array.isArray(path) ? path : path ? [path] : []
  return proxy(request, "DELETE", segments)
}
