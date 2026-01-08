import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

/**
 * Parse I2C scan results from firmware response
 */
function parseI2CScan(response: string): Array<{
  address: string
  device: string
  type?: string
}> {
  const devices: Array<{ address: string; device: string; type?: string }> = []
  const lines = response.split(/[\r\n]+/)
  
  for (const line of lines) {
    // Parse lines like: "0x76: BME688" or "0x3C: OLED"
    const match = line.match(/0x([0-9a-fA-F]{2}):\s*(.+)/i)
    if (match) {
      const address = `0x${match[1].toUpperCase()}`
      const device = match[2].trim()
      
      // Map known devices
      let type = "unknown"
      if (device.toLowerCase().includes("bme") || device.toLowerCase().includes("688")) {
        type = "bme688"
      } else if (device.toLowerCase().includes("oled") || device.toLowerCase().includes("ssd1306")) {
        type = "oled"
      } else if (device.toLowerCase().includes("lidar") || device.toLowerCase().includes("vl53")) {
        type = "lidar"
      }
      
      devices.push({ address, device, type })
    }
  }
  
  return devices
}

/**
 * Parse NDJSON periph_list format
 */
function parsePeriphList(response: string): Array<{
  uid: string
  address: string
  type: string
  vendor?: string
  product?: string
  present: boolean
}> {
  const peripherals: Array<{
    uid: string
    address: string
    type: string
    vendor?: string
    product?: string
    present: boolean
  }> = []
  
  const lines = response.split(/[\r\n]+/)
  for (const line of lines) {
    if (!line.trim() || !line.startsWith("{")) continue
    try {
      const msg = JSON.parse(line)
      if (msg.type === "periph_list" && msg.peripherals) {
        for (const p of msg.peripherals) {
          peripherals.push({
            uid: p.uid || p.address || "unknown",
            address: p.address || "0x00",
            type: p.type || "unknown",
            vendor: p.vendor,
            product: p.product,
            present: p.present !== false,
          })
        }
      }
    } catch {
      // Not JSON, try legacy format
      continue
    }
  }
  
  return peripherals
}

/**
 * GET /api/mycobrain/{port}/peripherals
 * Get discovered peripherals
 */
export async function GET(
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
    
    // Send scan command
    const scanRes = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd: "scan" } }),
        signal: AbortSignal.timeout(8000),
      }
    )
    
    if (!scanRes.ok) {
      throw new Error(`Scan failed: ${scanRes.status}`)
    }
    
    const scanData = await scanRes.json()
    const scanResponse = scanData.response || ""
    
    // Try NDJSON format first, fallback to legacy
    let peripherals = parsePeriphList(scanResponse)
    if (peripherals.length === 0) {
      // Legacy format
      const legacyPeriphs = parseI2CScan(scanResponse)
      peripherals = legacyPeriphs.map(p => ({
        uid: p.address,
        address: p.address,
        type: p.type || "unknown",
        present: true,
      }))
    }
    
    // Store peripheral data in MINDEX (best effort)
    if (peripherals.length > 0) {
      fetch(`${MINDEX_API_URL}/api/mindex/telemetry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: "mycobrain",
          device_id: deviceId,
          timestamp: new Date().toISOString(),
          data: {
            event: "peripheral_scan",
            peripherals,
            count: peripherals.length,
            port,
          },
        }),
        signal: AbortSignal.timeout(2000),
      }).catch(() => { /* best effort */ })
    }
    
    return NextResponse.json({
      port,
      device_id: deviceId,
      peripherals,
      count: peripherals.length,
      raw_response: scanResponse,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        port,
        peripherals: [],
        error: "Failed to scan peripherals",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

/**
 * POST /api/mycobrain/{port}/peripherals
 * Trigger peripheral scan
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  // Same as GET but explicitly triggers a new scan
  return GET(request, { params })
}
























