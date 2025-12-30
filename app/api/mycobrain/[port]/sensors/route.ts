import { NextRequest, NextResponse } from "next/server"

// Port 8003 = MAS dual service (preferred), Port 8765 = legacy website service
const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export const dynamic = "force-dynamic"

// Keep a small in-memory cache to prevent UI flicker and serial overload.
// This works well in our Dockerized "always-on" Next.js server.
type SensorsPayload = {
  port: string
  device_id: string
  sensors: ReturnType<typeof parseSensorData>
  raw_response?: string
  timestamp: string
  cache?: {
    hit: boolean
    age_ms: number
    stale: boolean
  }
}

const SENSOR_CACHE_TTL_MS = 1500
const sensorCache = new Map<string, { at: number; payload: SensorsPayload }>()
const inFlight = new Map<string, Promise<SensorsPayload>>()

// Parse sensor data from board response
function parseSensorData(response: string) {
  const sensors: {
    bme688_1?: {
      temperature: number
      humidity: number
      pressure: number
      gas_resistance: number
      iaq?: number
      iaq_accuracy?: number
      co2_equivalent?: number
      voc_equivalent?: number
    }
    bme688_2?: {
      temperature: number
      humidity: number
      pressure: number
      gas_resistance: number
      iaq?: number
      iaq_accuracy?: number
      co2_equivalent?: number
      voc_equivalent?: number
    }
  } = {}

  // Parse AMB sensor (BME688 #1 at 0x77)
  const ambMatch = response.match(/AMB addr=0x77.*?T=([\d.]+)C RH=([\d.]+)% P=([\d.]+)hPa.*?Gas=(\d+)Ohm IAQ=([\d.]+) acc=(\d+).*?CO2eq=([\d.]+) VOC=([\d.]+)/i)
  if (ambMatch) {
    sensors.bme688_1 = {
      temperature: parseFloat(ambMatch[1]),
      humidity: parseFloat(ambMatch[2]),
      pressure: parseFloat(ambMatch[3]),
      gas_resistance: parseInt(ambMatch[4]),
      iaq: parseFloat(ambMatch[5]),
      iaq_accuracy: parseInt(ambMatch[6]),
      co2_equivalent: parseFloat(ambMatch[7]),
      voc_equivalent: parseFloat(ambMatch[8]),
    }
  }

  // Parse ENV sensor (BME688 #2 at 0x76)
  const envMatch = response.match(/ENV addr=0x76.*?T=([\d.]+)C RH=([\d.]+)% P=([\d.]+)hPa.*?Gas=(\d+)Ohm IAQ=([\d.]+) acc=(\d+).*?CO2eq=([\d.]+) VOC=([\d.]+)/i)
  if (envMatch) {
    sensors.bme688_2 = {
      temperature: parseFloat(envMatch[1]),
      humidity: parseFloat(envMatch[2]),
      pressure: parseFloat(envMatch[3]),
      gas_resistance: parseInt(envMatch[4]),
      iaq: parseFloat(envMatch[5]),
      iaq_accuracy: parseInt(envMatch[6]),
      co2_equivalent: parseFloat(envMatch[7]),
      voc_equivalent: parseFloat(envMatch[8]),
    }
  }

  return sensors
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params

  try {
    // Find device_id from port
    let deviceId = port
    if (port.match(/^COM\d+$/i)) {
      try {
        const devicesRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
          signal: AbortSignal.timeout(3000),
        })
        if (devicesRes.ok) {
          const devicesData = await devicesRes.json()
          const device = devicesData.devices?.find((d: any) => d.port === port)
          if (device?.device_id) {
            deviceId = device.device_id
          }
        }
      } catch {
        // Use port as fallback
      }
    }

    const cacheKey = deviceId
    const now = Date.now()
    const cached = sensorCache.get(cacheKey)
    if (cached && now - cached.at <= SENSOR_CACHE_TTL_MS) {
      return NextResponse.json({
        ...cached.payload,
        cache: { hit: true, age_ms: now - cached.at, stale: false },
      } satisfies SensorsPayload)
    }

    const existing = inFlight.get(cacheKey)
    if (existing) {
      const payload = await existing
      return NextResponse.json(payload)
    }

    const fetchPromise = (async () => {
      // Send "status" command to get sensor data (heavy)
      const response = await fetch(
        `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: { cmd: "status" } }),
          // Give serial a bit more time; cache keeps UI fast.
          signal: AbortSignal.timeout(12000),
        }
      )

      if (!response.ok) throw new Error(`Sensor fetch failed (${response.status})`)

      const data = await response.json()
      const boardResponse = data.response || ""
      const sensors = parseSensorData(boardResponse)

      const payload: SensorsPayload = {
        port,
        device_id: deviceId,
        sensors,
        raw_response: boardResponse,
        timestamp: new Date().toISOString(),
        cache: { hit: false, age_ms: 0, stale: false },
      }

      sensorCache.set(cacheKey, { at: Date.now(), payload })
      return payload
    })()

    inFlight.set(cacheKey, fetchPromise)
    try {
      const payload = await fetchPromise
      return NextResponse.json(payload)
    } finally {
      inFlight.delete(cacheKey)
    }
  } catch (error) {
    // Prefer stale cache over hard failure (prevents UI blinking)
    const cached = sensorCache.get(port)
    if (cached) {
      const now = Date.now()
      return NextResponse.json({
        ...cached.payload,
        cache: { hit: true, age_ms: now - cached.at, stale: true },
      } satisfies SensorsPayload)
    }

    return NextResponse.json(
      {
        port,
        error: "Failed to fetch sensor data",
        message: "MycoBrain service not available or device not connected",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    )
  }
}

