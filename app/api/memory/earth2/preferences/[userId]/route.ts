/**
 * Earth2 Memory - Preferences API Route
 * February 5, 2026
 */

import { NextRequest, NextResponse } from "next/server"
import { assertScopedMasUserId, masHttpBaseUrl, masJsonHeaders } from "@/lib/myca/scoped-mas-user"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: pathUserId } = await params
  const scope = await assertScopedMasUserId(pathUserId)
  if ("denied" in scope) return scope.denied

  try {
    const response = await fetch(
      `${masHttpBaseUrl()}/api/earth2-memory/preferences/${encodeURIComponent(scope.scopedUserId)}`,
      { headers: masJsonHeaders() }
    )

    if (!response.ok) {
      return NextResponse.json({ error: `MAS API error: ${response.status}` }, { status: response.status })
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error("Earth2 preferences API error:", error)
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 503 })
  }
}
