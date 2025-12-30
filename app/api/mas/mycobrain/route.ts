import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MAS_ORCHESTRATOR_URL = process.env.MAS_ORCHESTRATOR_URL || "http://localhost:8001"

/**
 * POST /api/mas/mycobrain
 * Send command to MycoBrain device via MAS orchestrator
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_id, command, parameters } = body
    
    if (!device_id || !command) {
      return NextResponse.json(
        { error: "device_id and command required" },
        { status: 400 }
      )
    }
    
    const res = await fetch(`${MAS_ORCHESTRATOR_URL}/agents/mycobrain-device/command`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id,
        command,
        parameters: parameters || {},
      }),
      signal: AbortSignal.timeout(10000),
    })
    
    if (!res.ok) {
      throw new Error(`MAS command failed: ${res.status}`)
    }
    
    const data = await res.json()
    
    return NextResponse.json({
      success: true,
      device_id,
      command,
      response: data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to send command via MAS",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/mas/mycobrain
 * Get MycoBrain device status from MAS
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const device_id = searchParams.get("device_id")
  
  try {
    if (device_id) {
      // Get specific device status
      const res = await fetch(
        `${MAS_ORCHESTRATOR_URL}/agents/mycobrain-device/status/${encodeURIComponent(device_id)}`,
        { signal: AbortSignal.timeout(5000) }
      )
      
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({
          device_id,
          status: data,
          timestamp: new Date().toISOString(),
        })
      }
    } else {
      // List all devices
      const res = await fetch(
        `${MAS_ORCHESTRATOR_URL}/agents/mycobrain-device/devices`,
        { signal: AbortSignal.timeout(5000) }
      )
      
      if (res.ok) {
        const data = await res.json()
        return NextResponse.json({
          devices: data.devices || [],
          count: data.count || 0,
          timestamp: new Date().toISOString(),
        })
      }
    }
    
    return NextResponse.json({
      devices: [],
      count: 0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        devices: [],
        error: "Failed to get device status from MAS",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
