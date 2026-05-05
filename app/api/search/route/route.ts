/**
 * POST /api/search/route — blended intent (heuristic + MYCA session + Exa hint)
 * May 03 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { searchLimiter, getClientIP, rateLimitResponse } from "@/lib/rate-limiter"
import { computeBlendedIntent } from "@/lib/search/compute-blended-intent"

export const dynamic = "force-dynamic"
export const maxDuration = 30

export async function POST(request: NextRequest) {
  const ip = getClientIP(request)
  const rl = searchLimiter.check(ip)
  if (!rl.allowed) return rateLimitResponse(rl.retryAfterMs!, rl.reason)

  let body: {
    query?: string
    partialWord?: boolean
    userContext?: Parameters<typeof computeBlendedIntent>[0]["userContext"]
    sessionId?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  const query = body.query?.trim()
  if (!query) return NextResponse.json({ error: "query required" }, { status: 400 })

  const origin = request.nextUrl.origin

  const plan = await computeBlendedIntent({
    query,
    partialWord: body.partialWord,
    userContext: body.userContext,
    sessionId: body.sessionId,
    requestOrigin: origin,
  })

  return NextResponse.json(plan)
}
