import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

export const dynamic = "force-dynamic"

const MAS_BASE = resolveMasServerBaseUrl()

const FORWARD_HEADER = new Set([
  "content-type",
  "authorization",
  "accept",
  "accept-language",
  "x-api-key",
  "x-mas-internal-key",
])

function upstreamUrl(req: NextRequest, segments: string[] | undefined): URL | null {
  const tail = segments?.length ? `/${segments.join("/")}` : ""
  if (!tail.startsWith("/api/graph/")) return null
  return new URL(`${MAS_BASE}${tail}${req.nextUrl.search}`)
}

async function proxy(req: NextRequest, segments: string[] | undefined) {
  const target = upstreamUrl(req, segments)
  if (!target) {
    return NextResponse.json({ error: "path_not_allowed" }, { status: 403 })
  }

  const headers = new Headers()
  for (const name of FORWARD_HEADER) {
    const v = req.headers.get(name)
    if (v) headers.set(name, v)
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    redirect: "manual",
  }

  if (!["GET", "HEAD"].includes(req.method)) {
    init.body = await req.arrayBuffer()
  }

  const upstream = await fetch(target, init)
  const res = new NextResponse(upstream.body, { status: upstream.status })

  upstream.headers.forEach((value, key) => {
    const k = key.toLowerCase()
    if (k === "content-encoding" || k === "transfer-encoding") return
    res.headers.set(key, value)
  })

  return res
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params
  return proxy(req, path)
}

export async function HEAD(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params
  return proxy(req, path)
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params
  return proxy(req, path)
}

export async function PUT(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params
  return proxy(req, path)
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params
  return proxy(req, path)
}

export async function DELETE(
  req: NextRequest,
  ctx: { params: Promise<{ path?: string[] }> }
) {
  const { path } = await ctx.params
  return proxy(req, path)
}
