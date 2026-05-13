/**
 * Brain Context API Route - February 5, 2026
 *
 * Proxy endpoint for user-specific brain context retrieval.
 */

import { NextRequest, NextResponse } from "next/server"
import { assertScopedMasUserId, masJsonHeaders, masOrchestratorBaseUrl } from "@/lib/myca/scoped-mas-user"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: pathUserId } = await params
  const scope = await assertScopedMasUserId(pathUserId)
  if ("denied" in scope) return scope.denied

  const { searchParams } = new URL(request.url)
  const query = searchParams.get("query") || ""
  const limit = searchParams.get("limit") || "10"

  try {
    const url = new URL(`${masOrchestratorBaseUrl()}/voice/brain/context/${encodeURIComponent(scope.scopedUserId)}`)
    if (query) url.searchParams.set("query", query)
    url.searchParams.set("limit", limit)

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: masJsonHeaders(),
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: `Brain context API returned ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Brain context API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Brain context service unreachable",
      },
      { status: 502 }
    )
  }
}
