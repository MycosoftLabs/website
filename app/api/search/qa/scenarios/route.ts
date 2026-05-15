import { NextResponse } from "next/server"
import { buildSearchQaMonitorReport } from "@/lib/search/search-qa-scenarios"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(Math.max(Number(searchParams.get("limit") ?? 500), 1), 2500)
  return NextResponse.json(buildSearchQaMonitorReport(limit))
}
