import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export async function GET() {
  try {
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}/ports`, {
      signal: AbortSignal.timeout(10000),
    })
    
    if (response.ok) {
      const data = await response.json()
      return NextResponse.json(data)
    }
    
    return NextResponse.json(
      { ports: [], error: "Service unavailable", message: "MycoBrain service is not running" },
      { status: 503 }
    )
  } catch (error) {
    return NextResponse.json(
      { ports: [], error: "Failed to fetch ports", details: String(error) },
      { status: 500 }
    )
  }
}



























