import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8765"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

/**
 * GET /api/natureos/devices/mycobrain
 * List all MycoBrain devices registered in NatureOS/MINDEX
 */
export async function GET(request: NextRequest) {
  try {
    // Get devices from MycoBrain service
    const mycobrainRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: AbortSignal.timeout(5000),
    })
    const mycobrainDevices = mycobrainRes.ok ? (await mycobrainRes.json()).devices || [] : []
    
    // Get devices from MINDEX
    const mindexRes = await fetch(`${MINDEX_API_URL}/api/mindex/devices?device_type=mycobrain`, {
      signal: AbortSignal.timeout(5000),
    })
    const mindexDevices = mindexRes.ok ? (await mindexRes.json()).devices || [] : []
    
    // Merge and deduplicate by device_id
    const deviceMap = new Map<string, any>()
    
    // Add MycoBrain service devices
    for (const device of mycobrainDevices) {
      const id = device.device_id || device.port
      deviceMap.set(id, {
        ...device,
        source: "mycobrain_service",
        connected: device.status === "connected",
      })
    }
    
    // Merge MINDEX data
    for (const device of mindexDevices) {
      const id = device.device_id
      const existing = deviceMap.get(id)
      if (existing) {
        deviceMap.set(id, {
          ...existing,
          ...device,
          registered: true,
          registered_at: device.registered_at,
        })
      } else {
        deviceMap.set(id, {
          ...device,
          source: "mindex",
          registered: true,
          connected: false,
        })
      }
    }
    
    const devices = Array.from(deviceMap.values())
    
    return NextResponse.json({
      devices,
      count: devices.length,
      sources: {
        mycobrain_service: mycobrainDevices.length,
        mindex: mindexDevices.length,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        devices: [],
        error: "Failed to fetch devices",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/natureos/devices/mycobrain
 * Register or update a MycoBrain device
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { device_id, port, serial_number, firmware_version, location, metadata } = body
    
    if (!device_id && !port) {
      return NextResponse.json(
        { error: "device_id or port required" },
        { status: 400 }
      )
    }
    
    const deviceId = device_id || port
    
    // Register with MINDEX
    const mindexRes = await fetch(`${MINDEX_API_URL}/api/mindex/devices/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        device_id: deviceId,
        device_type: "mycobrain",
        serial_number: serial_number || deviceId,
        firmware_version: firmware_version || "unknown",
        location,
        metadata: {
          port,
          ...metadata,
        },
      }),
      signal: AbortSignal.timeout(5000),
    })
    
    const mindexResult = mindexRes.ok ? await mindexRes.json() : { error: `Status ${mindexRes.status}` }
    
    return NextResponse.json({
      success: true,
      device_id: deviceId,
      mindex: mindexResult,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to register device",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}
























