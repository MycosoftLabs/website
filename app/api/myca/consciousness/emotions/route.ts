/**
 * MYCA Consciousness Emotions API
 * Returns MYCA's current emotional state
 *
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { buildConsciousnessMasGetUrl } from "@/lib/myca/scoped-mas-user"

export async function GET(request: NextRequest) {
  try {
    const built = await buildConsciousnessMasGetUrl(request, "/api/myca/emotions")
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
          emotions: {},
          valence: 0,
          available: false,
          error: `MAS API returned ${response.status}`,
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ ...data, available: true })
  } catch (error) {
    console.error("MYCA emotions error:", error)
    return NextResponse.json(
      {
        emotions: {},
        valence: 0,
        available: false,
        error: error instanceof Error ? error.message : "Failed to connect",
      },
      { status: 200 }
    )
  }
}
