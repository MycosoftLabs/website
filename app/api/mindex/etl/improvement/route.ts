import { NextResponse } from "next/server"
import { recordMindexEtlImprovement } from "@/lib/mindex/etl-improvement"

export const dynamic = "force-dynamic"

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || !Array.isArray(body.missing)) {
    return NextResponse.json({ error: "missing must be an array" }, { status: 400 })
  }

  const result = await recordMindexEtlImprovement({
    source: String(body.source || "website"),
    query: typeof body.query === "string" ? body.query : undefined,
    app: typeof body.app === "string" ? body.app : undefined,
    route: typeof body.route === "string" ? body.route : undefined,
    missing: body.missing.map(String),
    context: body.context && typeof body.context === "object" ? body.context : undefined,
  })

  return NextResponse.json(result, { status: result.recorded ? 201 : 202 })
}
