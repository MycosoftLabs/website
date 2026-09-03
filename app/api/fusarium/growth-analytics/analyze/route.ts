import { NextRequest, NextResponse } from "next/server"
import { requireOwner } from "@/lib/auth/api-auth"
import { analyzeGrowthSeries } from "@/lib/fusarium/twins/growth-analytics/analysis.mjs"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const auth = await requireOwner()
  if (auth.error) return auth.error

  let input: unknown
  try {
    input = await request.json()
  } catch {
    return NextResponse.json({ contract: "fusarium-growth-analysis/v1", state: "invalid", errors: ["Request body must be JSON."] }, { status: 400 })
  }
  const result = analyzeGrowthSeries(input)
  return NextResponse.json(result, { status: result.state === "invalid" ? 422 : 200 })
}
