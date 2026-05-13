/**
 * MYCA Consciousness Soul API
 * Returns MYCA's full soul (identity, beliefs, purpose, creativity)
 *
 * Created: Feb 10, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { buildConsciousnessMasGetUrl } from "@/lib/myca/scoped-mas-user"

export async function GET(request: NextRequest) {
  try {
    const built = await buildConsciousnessMasGetUrl(request, "/api/myca/soul")
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
          available: false,
          error: `MAS API returned ${response.status}`,
        },
        { status: 200 }
      )
    }

    const data = await response.json()
    return NextResponse.json({ ...data, available: true })
  } catch (error) {
    console.error("MYCA soul error:", error)
    return NextResponse.json(
      {
        available: false,
        error: error instanceof Error ? error.message : "Failed to connect",
      },
      { status: 200 }
    )
  }
}
