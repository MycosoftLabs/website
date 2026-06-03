import { NextRequest, NextResponse } from "next/server"

const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"

export const dynamic = "force-dynamic"

// Keep a small in-memory cache to prevent UI flicker and serial overload.
// This works well in our Dockerized "always-on" Next.js server.
type SensorsPayload = {
  port: string
  device_id: string
  board_id?: string
  sensor_instances?: SensorInstance[]
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

type SensorInstance = {
  sensor_id?: string
  board_id?: string
  portal_device_id?: string
  sensor_slot?: string
  peripheral_uid?: string
  sensor_type?: string
  i2c_address?: number | string
  chip_id?: string | null
  bus?: string
  status?: string
  metadata?: Record<string, unknown>
}

type ParsedBmeSensor = {
  label?: string
  bus?: string
  role?: string
  expected?: boolean
  sensor_id?: string
  board_id?: string
  sensor_slot?: string
  peripheral_uid?: string
  i2c_address?: number | string
  status?: string
  temperature?: number
  humidity?: number
  pressure?: number
  gas_resistance?: number
  iaq?: number
  iaq_accuracy?: number
  co2_equivalent?: number
  voc_equivalent?: number
  present?: boolean
  address?: string
  begin_ok?: boolean
  subscribed?: boolean
}

const EXPECTED_BME688_A = {
  label: "BME688 A - I2C-1 AMB",
  bus: "I2C-1",
  role: "ambient",
  expected: true,
  address: "0x77",
} satisfies Partial<ParsedBmeSensor>

const EXPECTED_BME688_B = {
  label: "BME688 B - I2C-2 ENV",
  bus: "I2C-2",
  role: "environment",
  expected: true,
  address: "0x76",
} satisfies Partial<ParsedBmeSensor>

function finiteNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function localSerialServiceDeviceId(port: string) {
  const value = port.trim()
  const bareCom = value.match(/^COM\d+$/i)?.[0]
  if (bareCom) return `mycobrain-${bareCom.toUpperCase()}`
  const mycobrainCom = value.match(/^mycobrain-(COM\d+)$/i)?.[1]
  if (mycobrainCom) return `mycobrain-${mycobrainCom.toUpperCase()}`
  return null
}

function parseJsonObjectsFromMixedSerial(response: string): unknown[] {
  const found: unknown[] = []
  let depth = 0
  let start = -1
  let inString = false
  let escaped = false

  for (let i = 0; i < response.length; i += 1) {
    const ch = response[i]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (ch === "\\") {
        escaped = true
      } else if (ch === "\"") {
        inString = false
      }
      continue
    }
    if (ch === "\"") {
      inString = true
      continue
    }
    if (ch === "{") {
      if (depth === 0) start = i
      depth += 1
      continue
    }
    if (ch === "}" && depth > 0) {
      depth -= 1
      if (depth === 0 && start >= 0) {
        const candidate = response.slice(start, i + 1)
        try {
          found.push(JSON.parse(candidate))
        } catch {
          // Ignore non-JSON text fragments.
        }
        start = -1
      }
    }
  }
  return found
}

function normalizeBmeReading(data: any): ParsedBmeSensor {
  return {
    temperature: finiteNumber(data.temp_c ?? data.temperature_c ?? data.temperature ?? data.tC),
    humidity: finiteNumber(data.humidity_pct ?? data.humidity ?? data.rh),
    pressure: finiteNumber(data.pressure_hpa ?? data.pressure ?? data.p_hPa),
    gas_resistance: finiteNumber(data.gas_ohm ?? data.gas_resistance_ohm ?? data.gas_resistance ?? data.gas),
    iaq: finiteNumber(data.iaq),
    iaq_accuracy: finiteNumber(data.iaq_accuracy ?? data.accuracy),
    co2_equivalent: finiteNumber(data.co2_equivalent ?? data.co2eq),
    voc_equivalent: finiteNumber(data.voc_equivalent ?? data.voc),
    present: data.present !== false,
    address: typeof data.address === "string"
      ? data.address
      : typeof data.address === "number"
        ? `0x${data.address.toString(16).toUpperCase().padStart(2, "0")}`
        : undefined,
  }
}

function mergeSensorIdentity(
  sensor: ParsedBmeSensor | undefined,
  instance: SensorInstance | undefined
): ParsedBmeSensor | undefined {
  if (!sensor && !instance) return undefined
  const merged = {
    ...(sensor || {}),
    sensor_id: instance?.sensor_id ?? sensor?.sensor_id,
    board_id: instance?.board_id ?? sensor?.board_id,
    sensor_slot: instance?.sensor_slot ?? sensor?.sensor_slot,
    peripheral_uid: instance?.peripheral_uid ?? sensor?.peripheral_uid,
    i2c_address: instance?.i2c_address ?? sensor?.i2c_address,
    status: instance?.status ?? sensor?.status,
    bus: instance?.bus ?? sensor?.bus,
    present: instance?.status ? instance.status !== "not_detected" : sensor?.present,
  }
  if (merged.address === undefined && instance?.i2c_address !== undefined) {
    const n = Number(instance.i2c_address)
    if (Number.isFinite(n)) merged.address = `0x${n.toString(16).toUpperCase().padStart(2, "0")}`
  }
  return merged
}

// Parse sensor data from board response (supports both JSON and text formats)
function parseSensorData(response: string) {
  const sensors: {
    bme688_1?: ParsedBmeSensor
    bme688_2?: ParsedBmeSensor
    last_update?: string
  } = {}

  // Try JSON format first (from our firmware)
  const lines = response.split(/[\r\n]+/)
  const jsonMessages = parseJsonObjectsFromMixedSerial(response)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const jsonStart = trimmed.indexOf("{")
    if (jsonStart < 0) continue
    try {
      jsonMessages.push(JSON.parse(trimmed.slice(jsonStart)))
    } catch {
      // Not JSON, continue
    }
  }

  for (const data of jsonMessages) {
    if (!data || typeof data !== "object") continue
    try {
      const record = data as any
      
      // Handle sensors command response: {"ok":true,"bme688_count":2,"bme1":{...},"bme2":{...}}
      if (record.bme688_count !== undefined || record.bme1 || record.bme2) {
        if (record.bme1) {
          sensors.bme688_1 = { ...EXPECTED_BME688_A, ...normalizeBmeReading(record.bme1) }
        }
        if (record.bme2) {
          sensors.bme688_2 = { ...EXPECTED_BME688_B, ...normalizeBmeReading(record.bme2) }
        }
        sensors.last_update = new Date().toISOString()
      }

      // Handle current Side-A MDP telemetry: {"type":"telemetry","bme688":{"a":{...},"b":{...}}}
      if (record.bme688 && typeof record.bme688 === "object") {
        if (record.bme688.a) {
          sensors.bme688_1 = { ...EXPECTED_BME688_A, ...normalizeBmeReading({ ...record.bme688.a, address: "0x77" }) }
        }
        if (record.bme688.b) {
          sensors.bme688_2 = { ...EXPECTED_BME688_B, ...normalizeBmeReading({ ...record.bme688.b, address: "0x76" }) }
        }
        if (record.bme688.a || record.bme688.b) sensors.last_update = new Date().toISOString()
      }
    } catch {
      // Not JSON, continue
    }
  }
  
  // If no JSON data found, try legacy text format
  if (!sensors.bme688_1 && !sensors.bme688_2) {
    // Parse AMB sensor (BME688 #1 at 0x77)
    const ambMatch = response.match(/AMB addr=0x77.*?T=([\d.]+)C RH=([\d.]+)% P=([\d.]+)hPa.*?Gas=(\d+)Ohm IAQ=([\d.]+) acc=(\d+).*?CO2eq=([\d.]+) VOC=([\d.]+)/i)
    if (ambMatch) {
      sensors.bme688_1 = {
        ...EXPECTED_BME688_A,
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
        ...EXPECTED_BME688_B,
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
  }

  const statusSlot = (label: "AMB" | "ENV", fallbackAddress: string): ParsedBmeSensor | null => {
    const match = response.match(new RegExp(`${label}:\\s+present=(YES|NO)\\s+addr=([^\\s]+)\\s+begin=(OK|FAIL)\\s+sub=(OK|FAIL)`, "i"))
    if (!match) return null
    return {
      present: match[1].toUpperCase() === "YES",
      address: match[2] || fallbackAddress,
      begin_ok: match[3].toUpperCase() === "OK",
      subscribed: match[4].toUpperCase() === "OK",
    }
  }
  const ambStatus = statusSlot("AMB", "0x77")
  const envStatus = statusSlot("ENV", "0x76")
  if (ambStatus) sensors.bme688_1 = { ...ambStatus, ...(sensors.bme688_1 || {}) }
  if (envStatus) sensors.bme688_2 = { ...envStatus, ...(sensors.bme688_2 || {}) }

  if (sensors.bme688_1) sensors.bme688_1 = { ...EXPECTED_BME688_A, ...sensors.bme688_1 }
  if (sensors.bme688_2) sensors.bme688_2 = { ...EXPECTED_BME688_B, ...sensors.bme688_2 }

  return sensors
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ port: string }> }
) {
  const { port } = await params

  try {
    // Find device_id from port
    const directDeviceId = localSerialServiceDeviceId(port)
    let deviceId = directDeviceId || port
    if (!directDeviceId && (port.match(/^COM\d+$/i) || port.startsWith("/dev/"))) {
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
      let boardId: string | undefined
      let sensorInstances: SensorInstance[] | undefined
      try {
        const identityRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/sensors`, {
          signal: AbortSignal.timeout(2500),
        })
        if (identityRes.ok) {
          const identity = await identityRes.json()
          boardId = typeof identity.board_id === "string" ? identity.board_id : undefined
          if (Array.isArray(identity.sensor_instances)) {
            sensorInstances = identity.sensor_instances
          }
        }
      } catch {
        // Sensor identity is additive; keep live readings even if it is unavailable.
      }

      // Send the current firmware sensor command via /command endpoint.
      // COM4 firmware 2.1.1 returns live BME telemetry for read_sensors/get sensors;
      // plain "sensors" is legacy and can return "Unknown command".
      const response = await fetch(
        `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ command: { cmd: "read_sensors" } }),
          // Give serial a bit more time; cache keeps UI fast.
          signal: AbortSignal.timeout(12000),
        }
      )

      if (!response.ok) throw new Error(`Sensor fetch failed (${response.status})`)

      const data = await response.json()
      let boardResponse = data.response || ""
      let sensors = parseSensorData(boardResponse)
      const bmeA = sensorInstances?.find((s) =>
        s.sensor_slot === "bme688_a" || s.peripheral_uid === "amb-0x77" || Number(s.i2c_address) === 0x77
      )
      const bmeB = sensorInstances?.find((s) =>
        s.sensor_slot === "bme688_b" || s.peripheral_uid === "env-0x76" || Number(s.i2c_address) === 0x76
      )
      sensors.bme688_1 = mergeSensorIdentity(sensors.bme688_1, bmeA)
      sensors.bme688_2 = mergeSensorIdentity(sensors.bme688_2, bmeB)

      if (!sensors.bme688_1 && !sensors.bme688_2) {
        try {
          const statusRes = await fetch(
            `${MYCOBRAIN_SERVICE_URL}/devices/${encodeURIComponent(deviceId)}/command`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ command: { cmd: "status" } }),
              signal: AbortSignal.timeout(5000),
            }
          )
          if (statusRes.ok) {
            const statusData = await statusRes.json()
            const statusResponse = statusData.response || ""
            if (statusResponse) {
              boardResponse = `${boardResponse}\n${statusResponse}`.trim()
              sensors = parseSensorData(boardResponse)
              sensors.bme688_1 = mergeSensorIdentity(sensors.bme688_1, bmeA)
              sensors.bme688_2 = mergeSensorIdentity(sensors.bme688_2, bmeB)
            }
          }
        } catch {
          // Keep the primary sensor response.
        }
      }

      const payload: SensorsPayload = {
        port,
        device_id: deviceId,
        board_id: boardId,
        sensor_instances: sensorInstances,
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
    )
  }
}
