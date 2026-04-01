/**
 * Voice v9 REST proxy - forwards to MAS /api/voice/v9/*
 * Supports GET, POST, PUT, DELETE. Path is forwarded as-is.
 */

import { NextRequest, NextResponse } from "next/server"

const MAS_BASE =
  process.env.MAS_API_URL ||
  process.env.NEXT_PUBLIC_MAS_API_URL ||
  "http://localhost:8001"

function getMasUrl(pathSegments: string[] | undefined, search: string): string {
  const base = MAS_BASE.replace(/\/$/, "")
  const path = pathSegments?.length ? pathSegments.join("/") : ""
  const query = search ? `?${search}` : ""
  return `${base}/api/voice/v9/${path}${query}`
}

async function proxyRequest(
  req: NextRequest,
  pathSegments: string[] | undefined
): Promise<NextResponse> {
  const url = getMasUrl(pathSegments, req.nextUrl.searchParams.toString())
  const init: RequestInit = {
    method: req.method,
    headers: {
      "Content-Type": req.headers.get("content-type") || "application/json",
      Accept: req.headers.get("accept") || "application/json",
      "Cache-Control": "no-store",
    },
    signal: AbortSignal.timeout(15000),
  }
  if (req.method !== "GET" && req.method !== "HEAD") {
    try {
      const body = await req.text()
      if (body) init.body = body
    } catch {
      // no body
    }
  }
  try {
    const res = await fetch(url, init)
    const text = await res.text()
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "Content-Type": res.headers.get("content-type") || "application/json",
        "Cache-Control": "no-store",
      },
    })
  } catch (e) {
    return NextResponse.json(
      { error: String(e) },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params
  return proxyRequest(req, path)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params
  return proxyRequest(req, path)
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params
  return proxyRequest(req, path)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await params
  return proxyRequest(req, path)
}
