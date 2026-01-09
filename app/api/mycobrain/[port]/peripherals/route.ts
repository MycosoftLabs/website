import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

/**
 * Known I2C device addresses
 */
const KNOWN_I2C_DEVICES: Record<number, { type: string; name: string; vendor: string }> = {
  0x76: { type: "bme688", name: "BME688", vendor: "Bosch" },
  0x77: { type: "bme688", name: "BME688", vendor: "Bosch" },
  0x44: { type: "sht40", name: "SHT40", vendor: "Sensirion" },
  0x45: { type: "sht40", name: "SHT40", vendor: "Sensirion" },
  0x23: { type: "bh1750", name: "BH1750", vendor: "ROHM" },
  0x59: { type: "sgp40", name: "SGP40", vendor: "Sensirion" },
  0x3C: { type: "ssd1306", name: "SSD1306 OLED", vendor: "Generic" },
  0x3D: { type: "ssd1306", name: "SSD1306 OLED", vendor: "Generic" },
  0x48: { type: "ads1115", name: "ADS1115", vendor: "TI" },
  0x29: { type: "vl53l0x", name: "VL53L0X LiDAR", vendor: "ST" },
}

/**
 * Widget mapping for peripheral types
 */
const WIDGET_MAP: Record<string, { widget: string; icon: string; controls: string[]; telemetryFields: string[]; charts: string[] }> = {
  bme688: {
    widget: "environmental_sensor",
    icon: "thermometer",
    controls: [],
    telemetryFields: ["temperature", "humidity", "pressure", "gas_resistance", "iaq"],
    charts: ["temperature", "humidity", "pressure"],
  },
  ssd1306: {
    widget: "display",
    icon: "monitor",
    controls: ["text", "clear"],
    telemetryFields: [],
    charts: [],
  },
  vl53l0x: {
    widget: "lidar",
    icon: "radar",
    controls: [],
    telemetryFields: ["distance_mm", "signal_strength"],
    charts: ["distance"],
  },
}

/**
 * Parse I2C scan results from firmware response (supports both JSON and text format)
 */
function parseI2CScan(response: string): Array<{
  address: string
  device: string
  type: string
  vendor?: string
  widget?: { widget: string; icon: string; controls: string[]; telemetryFields: string[]; charts: string[] }
}> {
  const devices: Array<{ 
    address: string
    device: string
    type: string
    vendor?: string
    widget?: { widget: string; icon: string; controls: string[]; telemetryFields: string[]; charts: string[] }
  }> = []
  const lines = response.split(/[\r\n]+/)
  
  for (const line of lines) {
    if (!line.trim()) continue
    
    // Try JSON format first: {"ok":true,"count":2,"i2c":[118,119]}
    if (line.startsWith("{")) {
      try {
        const data = JSON.parse(line)
        if (data.i2c && Array.isArray(data.i2c)) {
          for (const addr of data.i2c) {
            const addrNum = typeof addr === "number" ? addr : parseInt(addr)
            const addrHex = `0x${addrNum.toString(16).toUpperCase().padStart(2, "0")}`
            const known = KNOWN_I2C_DEVICES[addrNum]
            
            devices.push({
              address: addrHex,
              device: known?.name || `Device at ${addrHex}`,
              type: known?.type || "unknown",
              vendor: known?.vendor,
              widget: WIDGET_MAP[known?.type || ""] || undefined,
            })
          }
          continue
        }
        
        // Also check for devices array format
        if (data.devices && Array.isArray(data.devices)) {
          for (const dev of data.devices) {
            const addrNum = typeof dev.address === "number" ? dev.address : parseInt(dev.address)
            const addrHex = dev.address_hex || `0x${addrNum.toString(16).toUpperCase().padStart(2, "0")}`
            const known = KNOWN_I2C_DEVICES[addrNum]
            
            devices.push({
              address: addrHex,
              device: dev.device || known?.name || `Device at ${addrHex}`,
              type: known?.type || dev.type || "unknown",
              vendor: known?.vendor || dev.vendor,
              widget: WIDGET_MAP[known?.type || ""] || undefined,
            })
          }
        }
      } catch {
        // Not valid JSON, try text format
      }
    }
    
    // Legacy text format: "0x76: BME688" or "  found: 0x76"
    const match = line.match(/0x([0-9a-fA-F]{2})(?::\s*(.+))?/i)
    if (match) {
      const addrNum = parseInt(match[1], 16)
      const addrHex = `0x${match[1].toUpperCase()}`
      const deviceName = match[2]?.trim()
      const known = KNOWN_I2C_DEVICES[addrNum]
      
      // Check if we already have this device
      if (!devices.some(d => d.address === addrHex)) {
        let type = known?.type || "unknown"
        if (deviceName) {
          if (deviceName.toLowerCase().includes("bme") || deviceName.toLowerCase().includes("688")) {
            type = "bme688"
          } else if (deviceName.toLowerCase().includes("oled") || deviceName.toLowerCase().includes("ssd1306")) {
            type = "ssd1306"
          } else if (deviceName.toLowerCase().includes("lidar") || deviceName.toLowerCase().includes("vl53")) {
            type = "vl53l0x"
          }
        }
        
        devices.push({
          address: addrHex,
          device: deviceName || known?.name || `Device at ${addrHex}`,
          type,
          vendor: known?.vendor,
          widget: WIDGET_MAP[type] || undefined,
        })
      }
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
    
    // Send scan command using CLI endpoint for longer wait time
    const scanRes = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/cli`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "scan" }),
        signal: AbortSignal.timeout(10000),
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
      // Legacy/JSON format from firmware
      const parsedDevices = parseI2CScan(scanResponse)
      // Deduplicate by address
      const uniqueDevices = new Map<string, typeof parsedDevices[0]>()
      for (const p of parsedDevices) {
        if (!uniqueDevices.has(p.address)) {
          uniqueDevices.set(p.address, p)
        }
      }
      peripherals = Array.from(uniqueDevices.values()).map(p => ({
        uid: p.address,
        address: p.address,
        type: p.type || "unknown",
        vendor: p.vendor,
        product: p.device,
        present: true,
        widget: p.widget || WIDGET_MAP[p.type] || {
          widget: "generic",
          icon: "help-circle",
          controls: [],
          telemetryFields: [],
          charts: [],
        },
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
























