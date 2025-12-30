import { NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
const MINDEX_API_URL = process.env.MINDEX_API_URL || "http://localhost:8000"

// In-memory telemetry cache
type TelemetryEntry = {
  timestamp: string
  sensor: string
  data: Record<string, number | string>
}

const telemetryCache = new Map<string, TelemetryEntry[]>()
const MAX_ENTRIES = 500

function addToCache(deviceId: string, entry: TelemetryEntry) {
  if (!telemetryCache.has(deviceId)) {
    telemetryCache.set(deviceId, [])
  }
  const cache = telemetryCache.get(deviceId)!
  cache.push(entry)
  if (cache.length > MAX_ENTRIES) {
    cache.shift()
  }
}

function parseSensorData(response: string): TelemetryEntry[] {
  const entries: TelemetryEntry[] = []
  const lines = response.split(/[\r\n]+/)
  
  for (const line of lines) {
    if (!line.trim() || !line.startsWith("{")) {
      // Try legacy format parsing
      if (line.includes("addr=0x") && (line.includes("T=") || line.includes("Gas="))) {
        const sensor = line.startsWith("AMB") ? "amb" : line.startsWith("ENV") ? "env" : "unknown"
        const data: Record<string, number | string> = {}
        
        const patterns: Record<string, RegExp> = {
          address: /addr=(0x[0-9a-fA-F]+)/,
          temperature: /T=([\d.]+)C/,
          humidity: /RH=([\d.]+)%/,
          pressure: /P=([\d.]+)hPa/,
          gas_resistance: /Gas=(\d+)Ohm/,
          iaq: /IAQ=([\d.]+)/,
          iaq_accuracy: /acc=(\d+)/,
          co2eq: /CO2eq=([\d.]+)/,
          voc: /VOC=([\d.]+)/,
          age_ms: /age=(\d+)ms/,
        }
        
        for (const [field, pattern] of Object.entries(patterns)) {
          const match = line.match(pattern)
          if (match) {
            const value = match[1]
            if (value.includes(".")) {
              data[field] = parseFloat(value)
            } else if (value.startsWith("0x")) {
              data[field] = value
            } else {
              data[field] = parseInt(value)
            }
          }
        }
        
        if (Object.keys(data).length > 0) {
          entries.push({
            timestamp: new Date().toISOString(),
            sensor,
            data,
          })
        }
      }
      continue
    }
    
    // Parse NDJSON format (firmware machine mode)
    try {
      const msg = JSON.parse(line)
      
      if (msg.type === "telemetry") {
        // Extract sensor data from NDJSON telemetry
        const data: Record<string, number | string> = {}
        
        // Map firmware fields to sensor data
        if (msg.temperature !== undefined) data.temperature = msg.temperature
        if (msg.humidity !== undefined) data.humidity = msg.humidity
        if (msg.pressure !== undefined) data.pressure = msg.pressure
        if (msg.gas_resistance !== undefined) data.gas_resistance = msg.gas_resistance
        if (msg.ai1_voltage !== undefined) data.ai1_voltage = msg.ai1_voltage
        if (msg.ai2_voltage !== undefined) data.ai2_voltage = msg.ai2_voltage
        if (msg.ai3_voltage !== undefined) data.ai3_voltage = msg.ai3_voltage
        if (msg.ai4_voltage !== undefined) data.ai4_voltage = msg.ai4_voltage
        if (msg.board_id) data.board_id = msg.board_id
        if (msg.firmware_version) data.firmware_version = msg.firmware_version
        if (msg.uptime_seconds !== undefined) data.uptime_seconds = msg.uptime_seconds
        
        // Determine sensor type based on data
        const sensor = msg.temperature !== undefined ? "bme688" : "analog"
        
        entries.push({
          timestamp: msg.ts ? new Date(msg.ts).toISOString() : new Date().toISOString(),
          sensor,
          data,
        })
      }
    } catch {
      // Not valid JSON, skip
      continue
    }
  }
  
  return entries
}

/**
 * GET /api/mycobrain/{port}/telemetry
 * Get telemetry data with optional streaming
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  const searchParams = request.nextUrl.searchParams
  const count = parseInt(searchParams.get("count") || "100")
  const sensor = searchParams.get("sensor") || null
  
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
    
    // Get current status to parse sensor data
    const statusRes = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd: "status" } }),
        signal: AbortSignal.timeout(8000),
      }
    )
    
    let currentData: TelemetryEntry[] = []
    if (statusRes.ok) {
      const statusData = await statusRes.json()
      const response = statusData.response || ""
      currentData = parseSensorData(response)
      
      // Add to cache
      for (const entry of currentData) {
        addToCache(deviceId, entry)
      }
      
      // Auto-ingest to MINDEX (best effort, non-blocking)
      if (currentData.length > 0) {
        fetch(`${MINDEX_API_URL}/api/mindex/telemetry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "mycobrain",
            device_id: deviceId,
            timestamp: new Date().toISOString(),
            data: {
              telemetry: currentData,
              sensor_count: currentData.length,
              port,
            },
          }),
          signal: AbortSignal.timeout(2000),
        }).catch(() => { /* best effort */ })
      }
    }
    
    // Get cached history
    let history = telemetryCache.get(deviceId) || []
    if (sensor) {
      history = history.filter(e => e.sensor === sensor)
    }
    history = history.slice(-count)
    
    return NextResponse.json({
      port,
      device_id: deviceId,
      current: currentData,
      history,
      count: history.length,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        port,
        error: "Failed to get telemetry",
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

/**
 * POST /api/mycobrain/{port}/telemetry
 * Control telemetry streaming (start/stop)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params
  
  try {
    const body = await request.json()
    const action = body.action as "start" | "stop"
    
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
    
    const cmd = action === "start" ? "live on" : "live off"
    
    const res = await fetch(
      `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: { cmd } }),
        signal: AbortSignal.timeout(5000),
      }
    )
    
    const data = await res.json()
    
    // Optionally log to MINDEX
    if (body.persist_to_mindex) {
      try {
        await fetch(`${MINDEX_API_URL}/api/mindex/telemetry`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "mycobrain",
            device_id: deviceId,
            timestamp: new Date().toISOString(),
            data: {
              action,
              streaming: action === "start",
              port,
              device_id: deviceId,
            },
          }),
          signal: AbortSignal.timeout(3000),
        })
      } catch { /* best effort */ }
    }
    
    return NextResponse.json({
      success: true,
      port,
      device_id: deviceId,
      streaming: action === "start",
      response: data.response,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to control telemetry",
        details: String(error),
      },
      { status: 500 }
    )
  }
}

