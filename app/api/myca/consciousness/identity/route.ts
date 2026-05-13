/**
 * MYCA Consciousness Identity API
 * Returns MYCA's identity (name, creator, purpose, beliefs)
 *
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { buildConsciousnessMasGetUrl } from "@/lib/myca/scoped-mas-user"

export async function GET(request: NextRequest) {
  try {
    const built = await buildConsciousnessMasGetUrl(request, "/api/myca/identity")
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
          name: "MYCA",
          error: `MAS API returned ${response.status}`,
          available: false,
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ ...data, available: true })
  } catch (error) {
    console.error("MYCA identity error:", error)
    return NextResponse.json(
      {
        name: "MYCA",
        error: error instanceof Error ? error.message : "Failed to connect",
        available: false,
      },
      { status: 200 }
    )
  }
}
