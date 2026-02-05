import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8765"

export async function GET() {
  try {
    const res = await fetch(`${MYCOBRAIN_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null)

    if (!res?.ok) {
      return NextResponse.json(
        {
          status: "unhealthy",
          serviceUrl: MYCOBRAIN_SERVICE_URL,
          error: "MycoBrain service not reachable",
          timestamp: new Date().toISOString(),
        },
        { status: 503 }
      )
    }

    const data = await res.json().catch(() => ({}))
    return NextResponse.json({ ...data, serviceUrl: MYCOBRAIN_SERVICE_URL })
  } catch (error) {
    return NextResponse.json(
      {
        status: "error",
        serviceUrl: MYCOBRAIN_SERVICE_URL,
        error: "MycoBrain health check failed",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}
