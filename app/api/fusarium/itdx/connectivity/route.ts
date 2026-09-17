import { NextRequest, NextResponse } from "next/server"
import { probeItdxConnectivity } from "@/lib/fusarium/itdx/connectivity"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: NextRequest) {
  const forceOffline = request.nextUrl.searchParams.get("force") === "offline"
  const connectivity = await probeItdxConnectivity(forceOffline)
  return NextResponse.json(connectivity)
}
