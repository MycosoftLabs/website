import { NextResponse } from "next/server"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

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
      return NextResponse.json(
        { error: "Failed to fetch devices from MycoBrain service" },
        { status: res.status }
      )
    }

    const data = await res.json()
    
    // The Python service returns { "devices": [...], "count": N }
    // Pass through the devices array directly
    const devices = data.devices || []

    return NextResponse.json({ devices, count: data.count || devices.length })
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json(
        { error: "MycoBrain service timeout", devices: [] },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { error: "MycoBrain service not running", devices: [] },
      { status: 503 }
    )
  }
}
