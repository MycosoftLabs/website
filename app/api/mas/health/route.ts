import { NextResponse } from "next/server"

// MAS API URL - configurable via environment variable
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export async function GET() {
  try {
    const response = await fetch(`${MAS_API_URL}/health`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }

    // Return degraded status if orchestrator responds but with error
    return NextResponse.json({
      status: "degraded",
      service: "myca-orchestrator",
      message: "Orchestrator responded with non-OK status",
    })
  } catch (error) {
    console.error("MAS health check failed:", error)
    
    // Return offline status but don't fail the API
    return NextResponse.json({
      status: "offline",
      service: "myca-orchestrator",
      message: "Unable to connect to MAS orchestrator",
      fallback: true,
    })
  }
}
