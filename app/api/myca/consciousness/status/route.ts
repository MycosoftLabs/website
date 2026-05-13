/**
 * MYCA Consciousness Status API
 * Returns current consciousness state (awake, dormant, etc.)
 *
 * Created: Feb 10, 2026
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
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      return NextResponse.json(
        {
          is_conscious: false,
          state: "unreachable",
          error: `MAS API returned ${response.status}`,
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("MYCA consciousness status error:", error)
    return NextResponse.json(
      {
        is_conscious: false,
        state: "unreachable",
        error: error instanceof Error ? error.message : "Failed to connect",
      },
      { status: 200 }
    )
  }
}
