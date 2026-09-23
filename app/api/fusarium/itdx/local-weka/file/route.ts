import { existsSync, readFileSync } from "fs"
import { NextRequest, NextResponse } from "next/server"
import path from "path"
import { LOCAL_SCORE_DIR } from "@/lib/fusarium/itdx/runtime-paths"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALLOWED = new Set(["scores.json", "scores.csv", "normalize_fixture_numeric_nominal.arff"])

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") || ""
  if (!ALLOWED.has(name)) {
    return NextResponse.json({ error: "not an allowed local WEKA artifact", forecast_p: null }, { status: 400 })
  }
  const file = path.join(LOCAL_SCORE_DIR, name)
  if (!existsSync(file)) {
    return NextResponse.json({ error: "artifact not yet written", forecast_p: null, name }, { status: 404 })
  }
  const body = readFileSync(file)
  const type = name.endsWith(".json") ? "application/json" : "text/plain; charset=utf-8"
  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  })
}
