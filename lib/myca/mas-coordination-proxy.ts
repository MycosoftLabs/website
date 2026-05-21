/**
 * MAS coordination / capabilities BFF proxy helpers.
 * Date: May 19, 2026
 */

import { type NextRequest, NextResponse } from "next/server"
import {
  masServiceHeaders,
  requireAuthenticatedIdentity,
  requireOwnerOrSuperuserIdentity,
  resolveVerifiedIdentity,
} from "@/lib/auth/verified-identity"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

export const dynamic = "force-dynamic"

function masUrl(path: string, request?: NextRequest): string {
  const base = resolveMasServerBaseUrl().replace(/\/$/, "")
  const normalized = path.startsWith("/") ? path : `/${path}`
  const url = new URL(`${base}${normalized}`)
  if (request) {
    request.nextUrl.searchParams.forEach((value, key) => {
      url.searchParams.set(key, value)
    })
  }
  return url.toString()
}

async function passthroughResponse(res: Response): Promise<NextResponse> {
  const text = await res.text()
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") || "application/json",
      "Cache-Control": "no-store",
    },
  })
}

export async function proxyMasGet(
  request: NextRequest,
  masPath: string,
  options?: { requireAuth?: boolean }
): Promise<NextResponse> {
  const identity = await resolveVerifiedIdentity()
  if (options?.requireAuth !== false) {
    const denied = requireAuthenticatedIdentity(identity)
    if (denied) return denied
  }

  try {
    const res = await fetch(masUrl(masPath, request), {
      method: "GET",
      headers: masServiceHeaders({ Accept: "application/json" }, identity),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    })
    return passthroughResponse(res)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "mas_unreachable",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}

export async function proxyMasPost(
  request: NextRequest,
  masPath: string,
  options?: { requireOwner?: boolean }
): Promise<NextResponse> {
  const identity = await resolveVerifiedIdentity()
  const authDenied = requireAuthenticatedIdentity(identity)
  if (authDenied) return authDenied

  if (options?.requireOwner !== false) {
    const ownerDenied = requireOwnerOrSuperuserIdentity(identity)
    if (ownerDenied) return ownerDenied
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    // empty body allowed for some MAS endpoints
  }

  try {
    const res = await fetch(masUrl(masPath, request), {
      method: "POST",
      headers: masServiceHeaders({ "Content-Type": "application/json", Accept: "application/json" }, identity),
      body: JSON.stringify(body ?? {}),
      cache: "no-store",
      signal: AbortSignal.timeout(30000),
    })
    return passthroughResponse(res)
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: "mas_unreachable",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}
