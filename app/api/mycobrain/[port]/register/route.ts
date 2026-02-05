import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8765"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"
const NATUREOS_API_URL = process.env.NATUREOS_API_URL || "http://localhost:3000/api/natureos"
const MAS_ORCHESTRATOR_URL = process.env.MAS_ORCHESTRATOR_URL || "http://localhost:8001"

/**
 * POST /api/mycobrain/{port}/register
 * Register MycoBrain device with MINDEX, NatureOS, and MAS
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    // Resolve device ID
    let deviceId = port
    try {
      const devicesRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
        signal: AbortSignal.timeout(3000),
      })
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json()
        const device = devicesData.devices?.find((d: { port?: string; device_id?: string }) =>
          d.port === port || d.device_id === port || d.port?.includes(port) || d.device_id?.includes(port)
        )
        if (device?.device_id) deviceId = device.device_id
      }
    } catch { /* use port */ }
    
    const body = await request.json().catch(() => ({}))
    const {
      serial_number,
      firmware_version,
      location,
      metadata = {},
    } = body
    
    const registrationResults: Record<string, any> = {}
    
    // 1. Register with MINDEX
    try {
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
      if (mindexRes.ok) {
        registrationResults.mindex = await mindexRes.json()
      } else {
        registrationResults.mindex = { error: `Status ${mindexRes.status}` }
      }
    } catch (error) {
      registrationResults.mindex = { error: String(error) }
    }
    
    // 2. Register with NatureOS
    try {
      const natureosRes = await fetch(`${NATUREOS_API_URL}/devices/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          name: `MycoBrain ${deviceId}`,
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
      if (natureosRes.ok) {
        registrationResults.natureos = await natureosRes.json()
      } else {
        registrationResults.natureos = { error: `Status ${natureosRes.status}` }
      }
    } catch (error) {
      registrationResults.natureos = { error: String(error) }
    }
    
    // 3. Notify MAS orchestrator
    try {
      const masRes = await fetch(`${MAS_ORCHESTRATOR_URL}/agents/mycobrain-device/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: deviceId,
          port,
          serial_number: serial_number || deviceId,
          firmware_version: firmware_version || "unknown",
          location,
          metadata: {
            ...metadata,
          },
        }),
        signal: AbortSignal.timeout(5000),
      })
      if (masRes.ok) {
        registrationResults.mas = await masRes.json()
      } else {
        registrationResults.mas = { error: `Status ${masRes.status}` }
      }
    } catch (error) {
      registrationResults.mas = { error: String(error) }
    }
    
    return NextResponse.json({
      success: true,
      port,
      device_id: deviceId,
      registrations: registrationResults,
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
























