import { NextResponse } from "next/server"
import { requireFusariumOwner } from "@/lib/auth/api-auth"
import { loadWekaWalkthrough } from "@/lib/itdx/weka-v14-receipt"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const HEADERS = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
  "X-Content-Type-Options": "nosniff",
}

export async function GET() {
  const auth = await requireFusariumOwner()
  if (auth.error) return auth.error
  try {
    const walkthrough = loadWekaWalkthrough()
    return NextResponse.json(walkthrough, { headers: HEADERS })
  } catch (error) {
    return NextResponse.json(
      {
        schema: "itdx-weka-v14-walkthrough/v1",
        verify_status: "UNAVAILABLE",
        error: error instanceof Error ? error.message : "Weka receipt unavailable",
        formspace_is_not_mas: true,
      },
      { status: 503, headers: HEADERS },
    )
  }
}
