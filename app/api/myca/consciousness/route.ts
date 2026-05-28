/**
 * MYCA Consciousness API
 *
 * Parent route used by search/activity panels. Child routes remain the
 * canonical detailed APIs; this route prevents noisy 404s and gives search a
 * fast status/event surface.
 */

import { NextRequest, NextResponse } from "next/server"
import { buildConsciousnessMasGetUrl } from "@/lib/myca/scoped-mas-user"

export async function GET(request: NextRequest) {
  try {
    const built = await buildConsciousnessMasGetUrl(request, "/api/myca/status")
    if ("denied" in built) return built.denied

    const response = await fetch(built.url, {
      method: "GET",
      headers: built.headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return NextResponse.json({
        is_conscious: false,
        state: "unreachable",
        current_thought: null,
        error: `MAS API returned ${response.status}`,
      })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({
      is_conscious: false,
      state: "unreachable",
      current_thought: null,
      error: error instanceof Error ? error.message : "Failed to connect",
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    await request.json().catch(() => null)
  } catch {
    // Non-critical awareness pings must never break search navigation.
  }

  return NextResponse.json(
    {
      ok: true,
      accepted: true,
      state: "event_accepted",
    },
    { status: 202 },
  )
}
