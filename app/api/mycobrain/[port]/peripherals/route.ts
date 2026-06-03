import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/lib/auth/api-auth"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
const MINDEX_API_URL = resolveMindexServerBaseUrl()

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

const EXPECTED_BME688_SLOTS: Record<string, { uid: string; product: string; bus: string; role: string }> = {
  AMB: {
    uid: "amb-0x77",
    product: "BME688 A - I2C-1 AMB",
    bus: "I2C-1",
    role: "ambient",
  },
  ENV: {
    uid: "env-0x76",
    product: "BME688 B - I2C-2 ENV",
    bus: "I2C-2",
    role: "environment",
  },
}

function localSerialServiceDeviceId(port: string) {
  const value = port.trim()
  const bareCom = value.match(/^COM\d+$/i)?.[0]
  if (bareCom) return `mycobrain-${bareCom.toUpperCase()}`
  const mycobrainCom = value.match(/^mycobrain-(COM\d+)$/i)?.[1]
  if (mycobrainCom) return `mycobrain-${mycobrainCom.toUpperCase()}`
  return null
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
        
        // Format 1: {"ok":true,"count":2,"i2c":[118,119]}
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
        
        // Format 2: {"ok":true,"bme688_count":2,"bme1":{...},"bme2":{...}}
        // This is the BSEC2 firmware format
        if (data.bme1 || data.bme2 || data.bme688_count !== undefined) {
          // Handle bme1 (typically at 0x77)
          if (data.bme1 && typeof data.bme1.address === "number") {
            const addrNum = data.bme1.address
            const addrHex = `0x${addrNum.toString(16).toUpperCase().padStart(2, "0")}`
            const known = KNOWN_I2C_DEVICES[addrNum]
            
            devices.push({
              address: addrHex,
              device: known?.name || `BME688 (${data.bme1.label || "AMB"})`,
              type: "bme688",
              vendor: "Bosch",
              widget: WIDGET_MAP.bme688,
            })
          }
          
          // Handle bme2 (typically at 0x76)
          if (data.bme2 && typeof data.bme2.address === "number") {
            const addrNum = data.bme2.address
            const addrHex = `0x${addrNum.toString(16).toUpperCase().padStart(2, "0")}`
            const known = KNOWN_I2C_DEVICES[addrNum]
            
            devices.push({
              address: addrHex,
              device: known?.name || `BME688 (${data.bme2.label || "ENV"})`,
              type: "bme688",
              vendor: "Bosch",
              widget: WIDGET_MAP.bme688,
            })
          }
          continue
        }
        
        // Format 3: {"devices": [...]} - array format
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
    
    // Legacy text format: "0x76: BME688" or "  found: 0x76".
    // Keep this intentionally anchored so crash logs/backtraces containing
    // random hex bytes cannot be promoted to fake peripherals.
    const match = line.match(/^\s*(?:found:\s*)?0x([0-9a-fA-F]{2})(?::\s*(.+))?\s*$/i)
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

function parseBmeStatusSlots(response: string): Array<{
  uid: string
  address: string
  type: string
  vendor?: string
  product?: string
  bus?: string
  role?: string
  expected?: boolean
  present: boolean
  status?: string
  widget?: { widget: string; icon: string; controls: string[]; telemetryFields: string[]; charts: string[] }
}> {
  const slots: Array<{
    uid: string
    address: string
    type: string
    vendor?: string
    product?: string
    bus?: string
    role?: string
    expected?: boolean
    present: boolean
    status?: string
    widget?: { widget: string; icon: string; controls: string[]; telemetryFields: string[]; charts: string[] }
  }> = []

  const rx = /\b(AMB|ENV):\s+present=(YES|NO)\s+addr=([^\s]+)\s+begin=(OK|FAIL)\s+sub=(OK|FAIL)/gi
  let match: RegExpExecArray | null
  while ((match = rx.exec(response)) !== null) {
    const label = match[1].toUpperCase()
    const present = match[2].toUpperCase() === "YES"
    const beginOk = match[4].toUpperCase() === "OK"
    const subOk = match[5].toUpperCase() === "OK"
    const slot = EXPECTED_BME688_SLOTS[label]
    slots.push({
      uid: slot?.uid || `${label.toLowerCase()}-${match[3]}`,
      address: match[3],
      type: "bme688",
      vendor: "Bosch",
      product: slot?.product || `BME688 ${label}`,
      bus: slot?.bus,
      role: slot?.role,
      expected: true,
      present,
      widget: WIDGET_MAP.bme688,
      status: present
        ? beginOk && subOk
          ? "online"
          : beginOk
            ? "subscription_failed"
            : "init_failed"
        : "not_detected",
    })
  }
  return slots
}

function peripheralsFromSensorInstances(instances: Array<Record<string, unknown>>) {
  return instances.map((sensor) => {
    const addressNumber = Number(sensor.i2c_address)
    const address = Number.isFinite(addressNumber)
      ? `0x${addressNumber.toString(16).toUpperCase().padStart(2, "0")}`
      : typeof sensor.i2c_address === "string"
        ? sensor.i2c_address
        : "0x00"
    const slot = String(sensor.sensor_slot || "")
    const slotMeta = slot === "bme688_b" ? EXPECTED_BME688_SLOTS.ENV : EXPECTED_BME688_SLOTS.AMB
    const sensorType = String(sensor.sensor_type || "unknown")
    return {
      uid: String(sensor.peripheral_uid || sensor.sensor_id || address),
      address,
      type: sensorType,
      vendor: sensorType === "bme688" ? "Bosch" : undefined,
      product: slotMeta?.product || sensorType,
      bus: typeof sensor.bus === "string" ? sensor.bus : slotMeta?.bus,
      role: slot === "bme688_b" ? "environment" : slot === "bme688_a" ? "ambient" : slotMeta?.role,
      expected: true,
      present: sensor.status !== "not_detected",
      status: typeof sensor.status === "string" ? sensor.status : undefined,
      widget: WIDGET_MAP[sensorType] || {
        widget: "generic",
        icon: "help-circle",
        controls: [],
        telemetryFields: [],
        charts: [],
      },
    }
  })
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
    const directDeviceId = localSerialServiceDeviceId(port)
    let deviceId = directDeviceId || port
    try {
      if (directDeviceId) throw new Error("direct local serial target")
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
    } catch { /* use direct id or port */ }

    try {
      const identityRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/sensors`, {
        signal: AbortSignal.timeout(2500),
      })
      if (identityRes.ok) {
        const identity = await identityRes.json()
        if (Array.isArray(identity.sensor_instances) && identity.sensor_instances.length > 0) {
          const peripherals = peripheralsFromSensorInstances(identity.sensor_instances)
          return NextResponse.json({
            port,
            device_id: deviceId,
            board_id: typeof identity.board_id === "string" ? identity.board_id : undefined,
            peripherals,
            count: peripherals.length,
            source: "sensor-identity",
            timestamp: new Date().toISOString(),
          })
        }
      }
    } catch {
      // Fall back to command/status based discovery below.
    }
    
    // Ask status first: current COM4 Side-A MDP firmware still exposes BME slot
    // truth here even when the old scan command is unavailable.
    const scanRes = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd: "status" } }),
        signal: AbortSignal.timeout(10000),
      }
    )
    
    if (!scanRes.ok) {
      throw new Error(`Scan failed: ${scanRes.status}`)
    }
    
    const scanData = await scanRes.json()
    const scanResponse = scanData.response || ""
    
    // Try slot status, NDJSON format, then legacy scan output.
    let peripherals = parseBmeStatusSlots(scanResponse)
    if (peripherals.length === 0) {
      peripherals = parsePeriphList(scanResponse)
    }
    if (peripherals.length === 0) {
      // Legacy/JSON format from firmware. Do not parse ESP crash output as
      // peripheral data; it can contain many incidental 0xNN fragments.
      const isCrashLog = /task watchdog|backtrace|abort\(\)|rebooting|rst:0x/i.test(scanResponse)
      const parsedDevices = isCrashLog ? [] : parseI2CScan(scanResponse)
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
  const auth = await requireAdmin()
  if (auth.error) return auth.error

  // Same as GET but explicitly triggers a new scan
  return GET(request, { params })
}

















