/**
 * Petri / MyceliumSeg ONNX service proxy (Sandbox 8051 or PETRI_SEG_SERVICE_URL).
 * Date: May 02, 2026
 */

import { NextRequest, NextResponse } from "next/server"

function segBase(): string {
  const u =
    process.env.PETRI_SEG_SERVICE_URL?.trim() ||
    process.env.NEXT_PUBLIC_PETRI_SEG_SERVICE_URL?.trim() ||
    "http://192.168.0.187:8051"
  return u.replace(/\/$/, "")
}

async function proxy(request: NextRequest, method: string, segments: string[]) {
  const pathStr = segments.filter(Boolean).join("/")
  const url = new URL(request.url)
  const search = url.searchParams.toString()
  const target = `${segBase()}/${pathStr}${search ? `?${search}` : ""}`.replace(/([^:]\/)\/+/g, "$1")

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
    return NextResponse.json({ error: "petri_seg_proxy", detail: String(e) }, { status: 502 })
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
