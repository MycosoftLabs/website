import { NextResponse } from "next/server"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"

// MAS API URL - configurable via environment variable
const MAS_API_URL = resolveMasServerBaseUrl()

export async function GET() {
  const started = Date.now()
  try {
    const response = await fetch(`${MAS_API_URL}/health`, {
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json().catch(() => ({}))
      return NextResponse.json({
        status: typeof data?.status === "string" ? data.status : "online",
        service: "myca-orchestrator",
        reachable: true,
        latency_ms: Date.now() - started,
        timestamp: new Date().toISOString(),
      })
    }

    // Return degraded status if orchestrator responds but with error
    return NextResponse.json({
      status: "degraded",
      service: "myca-orchestrator",
      message: "Orchestrator responded with non-OK status",
      reachable: true,
      latency_ms: Date.now() - started,
    })
  } catch (error) {
    console.error("MAS health check failed:", error)
    
    // Return offline status but don't fail the API
    return NextResponse.json({
      status: "offline",
      service: "myca-orchestrator",
      message: "Unable to connect to MAS orchestrator",
      reachable: false,
      fallback: true,
      latency_ms: Date.now() - started,
    }, { status: 503 })
  }
}
