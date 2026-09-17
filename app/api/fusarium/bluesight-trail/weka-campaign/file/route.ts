import { existsSync, readFileSync } from "fs"
import { NextRequest, NextResponse } from "next/server"
import path from "path"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const ALLOWED = new Set([
  "results.jsonl",
  "results.csv",
  "correlation.json",
  "arff_inventory.json",
  "status.json",
  "progress.json",
  "datasets.json",
  "worker_stdout.log",
  "coverage.json",
])
const TRAIL_ARFF = new Set(["trail-ar-session.arff", "trail-ar-predictions.arff"])

function resolveArtifact(name: string): string | null {
  if (TRAIL_ARFF.has(name)) {
    return path.join(process.cwd(), ".data", "trail-ar", "weka", name)
  }
  if (ALLOWED.has(name)) {
    return path.join(process.cwd(), ".data", "weka-campaign", "SEP14_2026", name)
  }
  return null
}

export async function GET(request: NextRequest) {
  const name = request.nextUrl.searchParams.get("name") || ""
  const file = resolveArtifact(name)
  if (!file) {
    return NextResponse.json({ error: "not an allowed campaign artifact", forecast_p: null }, { status: 400 })
  }
  if (!existsSync(file)) {
    return NextResponse.json({ error: "artifact not yet written", forecast_p: null, name }, { status: 404 })
  }
  const body = readFileSync(file)
  const type = name.endsWith(".json") || name.endsWith(".jsonl") ? "application/json" : "text/plain; charset=utf-8"
  return new NextResponse(body, {
    headers: {
      "Content-Type": type,
      "Content-Disposition": `attachment; filename="${name}"`,
    },
  })
}
