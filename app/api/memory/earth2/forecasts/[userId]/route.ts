/**
 * Earth2 Memory - Forecasts API Route
 * February 5, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { assertScopedMasUserId, masHttpBaseUrl, masJsonHeaders } from "@/lib/myca/scoped-mas-user"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: pathUserId } = await params
  const scope = await assertScopedMasUserId(pathUserId)
  if ("denied" in scope) return scope.denied

  const { searchParams } = new URL(request.url)
  const limit = searchParams.get("limit") || "10"
  const model = searchParams.get("model")

  try {
    let url = `${masHttpBaseUrl()}/api/earth2-memory/forecasts/${encodeURIComponent(scope.scopedUserId)}?limit=${encodeURIComponent(limit)}`
    if (model) url += `&model=${encodeURIComponent(model)}`

    const response = await fetch(url, {
      headers: masJsonHeaders(),
    })

    if (!response.ok) {
      return NextResponse.json({ error: `MAS API error: ${response.status}` }, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error("Earth2 forecasts API error:", error)
    return NextResponse.json({ error: "Failed to fetch forecasts" }, { status: 503 })
  }
}
