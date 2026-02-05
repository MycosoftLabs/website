import { NextResponse } from "next/server"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8765"

export async function GET() {
  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
    })

    clearTimeout(timeoutId)

    if (!res.ok) {
      // Return empty array with 200 to prevent dashboard crashes
      console.log("[MycoBrain] Service returned error, using graceful fallback");
      return NextResponse.json({ 
        devices: [], 
        count: 0, 
        available: false,
        message: "MycoBrain service unavailable" 
      })
    }

    const data = await res.json()
    
    // The Python service returns { "devices": [...], "count": N }
    // Pass through the devices array directly
    const devices = data.devices || []

    return NextResponse.json({ 
      devices, 
      count: data.count || devices.length,
      available: true 
    })
  } catch (error) {
    // Graceful fallback - return empty array with 200 status to prevent dashboard crashes
    console.log("[MycoBrain] Service not reachable, using graceful fallback");
    return NextResponse.json({
      devices: [],
      count: 0,
      available: false,
      message: error instanceof Error && error.name === "AbortError" 
        ? "MycoBrain service timeout" 
        : "MycoBrain service not running"
    })
  }
}
