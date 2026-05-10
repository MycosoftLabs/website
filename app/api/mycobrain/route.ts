import { NextRequest, NextResponse } from "next/server"
import { resolveMasServerBaseUrl } from "@/lib/mas-server-url"
import { resolveMycoBrainServiceUrl } from "@/lib/mycobrain-service-url"

// MycoBrain service URL - runs on port 8003 (local) or via network
const MYCOBRAIN_SERVICE_URL = resolveMycoBrainServiceUrl()
const MAS_API_URL = resolveMasServerBaseUrl()
const OPERATOR_DEVICE_URLS = (
  process.env.MYCOBRAIN_OPERATOR_URLS || "http://192.168.0.228:8787,http://192.168.0.123:8787"
)
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean)

export const dynamic = "force-dynamic"

interface MASDevice {
  device_id: string
  device_name?: string
  device_role?: string
  device_display_name?: string
  status?: string
  host?: string
  port?: number | string
  sensors?: string | string[]
  capabilities?: string | string[]
  firmware_version?: string
  board_type?: string
  extra?: Record<string, unknown>
}

interface NormalizedDevice {
  port: string
  device_id: string
  connected: boolean
  status?: string
  is_mycobrain: boolean
  verified: boolean
  source?: string
  network_host?: string
  network_port?: number | string
  device_info: Record<string, unknown>
  info?: Record<string, unknown>
  sensor_data: Record<string, unknown>
  capabilities: Record<string, unknown>
  device_name?: string
  device_role?: string
  device_display_name?: string
  display_name: string
}

// Helpers: MAS may return sensors/capabilities as string ("a b c") or array
function parseList(v: unknown): string[] {
  if (Array.isArray(v)) return v as string[]
  if (typeof v === "string") return v.trim() ? v.split(/\s+/) : []
  return []
}
function hasCapability(caps: unknown, name: string): boolean {
  const list = parseList(caps)
  return list.some((c) => c.toLowerCase().includes(name.toLowerCase()))
}

function toNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeOperatorDevice(baseUrl: string, status: any, sensor: any): NormalizedDevice | null {
  const reading = sensor?.reading || status?.lastSensorReading
  if (!reading) return null

  const host = new URL(baseUrl).hostname
  const slot = String(reading.sensor_slot || reading.address || "sensor")
  const deviceId = `${reading.device_id || reading.node_id || `mycobrain-${host.replace(/\./g, "-")}`}-${slot}-${host.replace(/\./g, "-")}`
  const label = slot.toUpperCase()

  return {
    port: status?.serialPort || baseUrl,
    device_id: deviceId,
    connected: status?.serialConnected === true,
    status: status?.serialConnected ? "online" : "offline",
    is_mycobrain: true,
    verified: true,
    source: "operator-http",
    network_host: host,
    network_port: new URL(baseUrl).port || 8787,
    device_info: {
      side: reading.role,
      firmware_version: reading.fw_version,
      board_type: "MycoBrain Operator",
      bme688_count: 1,
      status: status?.serialConnected ? "online" : "offline",
      last_heartbeat: status?.lastHeartbeat,
      last_error: status?.lastError,
      sensor_slot: slot,
      address: reading.address,
    },
    sensor_data: {
      [`bme688_${slot}`]: {
        temperature: toNumber(reading.temperature_c_comp ?? reading.ambient_temperature_c),
        humidity: toNumber(reading.humidity_pct_comp ?? reading.ambient_humidity_pct),
        pressure: toNumber(reading.pressure_hpa),
        iaq: toNumber(reading.iaq),
        eco2: toNumber(reading.eco2_ppm),
        bvoc: toNumber(reading.bvoc_ppm),
        gas_resistance: toNumber(reading.gas_resistance_ohm_comp ?? reading.gas_resistance_ohm),
        valid: reading.valid === true,
      },
    },
    capabilities: {
      bme688_count: 1,
      has_lora: false,
      has_neopixel: true,
      has_buzzer: true,
      i2c_bus: true,
      analog_inputs: 4,
      digital_io: 3,
    },
    device_name: `MycoBrain ${label}`,
    device_role: reading.role,
    device_display_name: `MycoBrain ${label} (${host})`,
    display_name: `MycoBrain ${label} (${host})`,
  }
}

async function fetchOperatorDevices(): Promise<NormalizedDevice[]> {
  const results = await Promise.all(
    OPERATOR_DEVICE_URLS.map(async (baseUrl) => {
      try {
        const statusRes = await fetch(`${baseUrl}/api/status`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(7000),
        })
        if (!statusRes.ok) return []

        const status = await statusRes.json()
        const readings = new Map<string, any>()
        for (const entry of status?.lastLines || []) {
          const line = String(entry?.line || "").trim()
          if (!line.startsWith("{")) continue
          try {
            const parsed = JSON.parse(line)
            if (parsed?.type !== "telemetry") continue
            readings.set(String(parsed.sensor_slot || parsed.address || readings.size), parsed)
          } catch {
            // Partial serial JSON is reported by the operator as lastError.
          }
        }
        if (status?.lastSensorReading) {
          const reading = status.lastSensorReading
          readings.set(String(reading.sensor_slot || reading.address || readings.size), reading)
        }

        const sensorRes = await fetch(`${baseUrl}/api/sensor`, {
          cache: "no-store",
          headers: { Accept: "application/json" },
          signal: AbortSignal.timeout(2000),
        }).catch(() => null)
        const sensor = sensorRes?.ok ? await sensorRes.json().catch(() => null) : null
        if (sensor?.reading) {
          const reading = sensor.reading
          readings.set(String(reading.sensor_slot || reading.address || readings.size), reading)
        }

        return [...readings.values()]
          .map((reading) => normalizeOperatorDevice(baseUrl, status, { reading }))
          .filter((device): device is NormalizedDevice => Boolean(device))
      } catch (error) {
        console.error("Failed to fetch MycoBrain operator device:", error)
        return []
      }
    })
  )

  return results.flat()
}

// Fetch devices from MAS network registry (for when no local service)
async function fetchNetworkDevices(): Promise<NormalizedDevice[]> {
  try {
    const url = `${MAS_API_URL}/api/devices`
    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: { Accept: "application/json" },
      cache: "no-store",
    })
    if (!response.ok) return []
    const data = await response.json()
    const devices = data.devices || []
    if (!devices.length) return []

    return devices.map((d: MASDevice) => {
      const sensors = parseList(d.sensors)
      const bmeCount = sensors.length || 2
      return {
        port: (d.extra && (d.extra.port_name ?? d.extra.port)) || d.device_id,
        device_id: d.device_id,
        connected: d.status === "online",
        status: d.status,
        is_mycobrain: true,
        verified: true,
        source: "network",
        network_host: d.host,
        network_port: d.port,
        device_info: {
          side: d.extra?.side,
          firmware_version: d.firmware_version,
          board_type: d.board_type,
          bme688_count: bmeCount,
          status: d.status,
        },
        sensor_data: {},
        capabilities: {
          bme688_count: bmeCount,
          has_lora: hasCapability(d.capabilities, "lora"),
          has_neopixel: hasCapability(d.capabilities, "led"),
          has_buzzer: hasCapability(d.capabilities, "buzzer"),
          i2c_bus: hasCapability(d.capabilities, "i2c"),
          analog_inputs: 4,
          digital_io: 3,
        },
        device_name: d.device_name,
        device_role: d.device_role,
        device_display_name: d.device_display_name,
        display_name: d.device_display_name || d.device_name || d.device_id,
      }
    })
  } catch (error) {
    console.error("Failed to fetch network devices:", error)
    return []
  }
}

// Normalize device data from service to match frontend expectations
function normalizeDevice(d: Record<string, unknown>) {
  return {
    ...d,
    port: d.port || d.device,
    device_id: d.device_id || `mycobrain-${(d.port || d.device || "unknown").replace(/[\/\\]/g, "-")}`,
    connected: d.connected ?? (d.status === "connected"),
    // Mark as verified MycoBrain device if it has board info
    is_mycobrain: true,
    verified: true,
    // Normalize info -> device_info for frontend compatibility
    device_info: d.device_info || {
      side: d.info?.side,
      firmware_version: d.info?.firmware,
      board_type: d.info?.board,
      bme688_count: 2, // MycoBrain boards typically have 2 BME688 sensors
      status: d.status,
    },
    // Keep original info field as well
    info: d.info,
    // Preserve or initialize sensor_data
    sensor_data: d.sensor_data || {},
    // Set capabilities based on known MycoBrain hardware
    capabilities: d.capabilities || {
      bme688_count: 2,
      has_lora: false,
      has_neopixel: true,
      has_buzzer: true,
      i2c_bus: true,
      analog_inputs: 4,
      digital_io: 3,
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    // First check if local service is running
    const healthRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/health`, {
      signal: AbortSignal.timeout(5000),
    }).catch(() => null)
    
    if (!healthRes?.ok) {
      // No local service - try to fetch from MAS network registry instead
      const [networkDevices, operatorDevices] = await Promise.all([fetchNetworkDevices(), fetchOperatorDevices()])
      const allNetworkDevices = [...operatorDevices, ...networkDevices]
      
      if (allNetworkDevices.length > 0) {
        return NextResponse.json({
          devices: allNetworkDevices,
          source: "network-registry",
          message: "Devices loaded from MAS network registry (no local service)",
          timestamp: new Date().toISOString(),
          serviceUrl: MYCOBRAIN_SERVICE_URL,
          masUrl: MAS_API_URL,
          serviceHealthy: false,
          networkHealthy: true,
          operatorDevicesIncluded: operatorDevices.length,
        })
      }
      
      return NextResponse.json({
        devices: [],
        source: "api",
        error: "MycoBrain service not running and no network devices found",
        message: "Start the MycoBrain service or ensure devices are registered with MAS",
        timestamp: new Date().toISOString(),
        serviceUrl: MYCOBRAIN_SERVICE_URL,
        serviceHealthy: false,
      })
    }
    
    // Fetch devices, ports, and network registry in parallel to avoid timeouts
    const [devicesRes, portsRes, networkDevices, operatorDevices] = await Promise.all([
      fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${MYCOBRAIN_SERVICE_URL}/ports`, { signal: AbortSignal.timeout(2000) }).catch(() => null),
      fetchNetworkDevices(),
      fetchOperatorDevices(),
    ])

    const response = devicesRes
    
    if (response.ok) {
      const data = await response.json()
      
      // Normalize devices to match frontend expectations
      const normalizedDevices = (data.devices || []).map(normalizeDevice)
      
      const portsData = portsRes && portsRes.ok ? await portsRes.json().catch(() => ({})) : { ports: [], discovery_running: false }
      const rawPorts = portsData.ports || []
      // Filter to likely MycoBrain ports only; exclude COM5 (known phantom ACPI port)
      const availablePorts = rawPorts.filter(
        (p: { device?: string; likely_mycobrain?: boolean }) =>
          p.likely_mycobrain === true && (p.device || "").toUpperCase() !== "COM5"
      )
      
      const localDeviceIds = new Set(normalizedDevices.map((d: { device_id?: string }) => d.device_id))
      const additionalOperatorDevices = operatorDevices.filter(d => !localDeviceIds.has(d.device_id))
      const allKnownDeviceIds = new Set([...localDeviceIds, ...additionalOperatorDevices.map((d) => d.device_id)])
      const additionalNetworkDevices = networkDevices.filter(d => !allKnownDeviceIds.has(d.device_id))
      
      return NextResponse.json({
        ...data,
        devices: [...normalizedDevices, ...additionalOperatorDevices, ...additionalNetworkDevices],
        source: "mycobrain-service",
        availablePorts,
        discoveryRunning: portsData.discovery_running || false,
        serviceHealthy: true,
        networkDevicesIncluded: additionalNetworkDevices.length,
        operatorDevicesIncluded: additionalOperatorDevices.length,
      })
    }
    
    throw new Error("Service unavailable")
  } catch (error) {
    // Try network registry as last resort
    const [networkDevices, operatorDevices] = await Promise.all([fetchNetworkDevices(), fetchOperatorDevices()])
    const fallbackDevices = [...operatorDevices, ...networkDevices]
    
    if (fallbackDevices.length > 0) {
      return NextResponse.json({
        devices: fallbackDevices,
        source: "network-registry-fallback",
        message: "Devices loaded from MAS network registry",
        timestamp: new Date().toISOString(),
        serviceHealthy: false,
        networkHealthy: true,
        operatorDevicesIncluded: operatorDevices.length,
      })
    }
    
    return NextResponse.json({
      devices: [],
      source: "api",
      error: "MycoBrain service not available",
      message: "Start the MycoBrain service to connect devices",
      timestamp: new Date().toISOString(),
      serviceUrl: MYCOBRAIN_SERVICE_URL,
      serviceHealthy: false,
    })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, port = "COM7" } = body
  
  try {
    let endpoint = ""
    let method = "POST"
    let payload = {}
    
    switch (action) {
      case "connect":
        endpoint = `/devices/connect/${encodeURIComponent(port)}`
        break
      case "disconnect":
        endpoint = `/devices/disconnect/${encodeURIComponent(port)}`
        break
      case "neopixel":
        endpoint = `/devices/${encodeURIComponent(port)}/neopixel`
        payload = body.data || { r: 0, g: 255, b: 0, brightness: 128, mode: "solid" }
        break
      case "buzzer":
        endpoint = `/devices/${encodeURIComponent(port)}/buzzer`
        payload = body.data || { frequency: 1000, duration_ms: 100, pattern: "beep" }
        break
      case "command":
        endpoint = `/devices/${encodeURIComponent(port)}/command`
        payload = body.data || { cmd_id: 0, dst: 0xA1, data: [] }
        break
      case "diagnostics":
        endpoint = `/devices/${encodeURIComponent(port)}/diagnostics`
        method = "GET"
        break
      case "sensors":
        endpoint = `/devices/${encodeURIComponent(port)}/sensors`
        method = "GET"
        break
      case "serial":
        endpoint = `/devices/${encodeURIComponent(port)}/serial`
        method = "GET"
        break
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 })
    }
    
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}${endpoint}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(3000),
    })
    
    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to communicate with MycoBrain service", details: String(error) },
      { status: 503 }
    )
  }
}
