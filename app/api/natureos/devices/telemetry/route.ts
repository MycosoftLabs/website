import { NextRequest, NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { resolveMycoBrainServiceUrl } from "@/lib/mycobrain-service-url"
import { deploymentByHost } from "@/lib/devices/field-deployments"

export const dynamic = "force-dynamic"

const OPERATOR_DEVICE_URLS = (
  process.env.MYCOBRAIN_OPERATOR_URLS || "http://192.168.0.228:8787,http://192.168.0.123:8787"
)
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean)
const DEBUG_DEVICE_TELEMETRY = process.env.CREP_DEBUG_DEVICE_TELEMETRY === "1"
const MYCOBRAIN_SERVICE_TIMEOUT_MS = Number(process.env.MYCOBRAIN_SERVICE_TIMEOUT_MS || 1200)
const OPERATOR_STATUS_TIMEOUT_MS = Number(process.env.MYCOBRAIN_OPERATOR_STATUS_TIMEOUT_MS || 4500)
const OPERATOR_SENSOR_TIMEOUT_MS = Number(process.env.MYCOBRAIN_OPERATOR_SENSOR_TIMEOUT_MS || 1800)
const MINDEX_DEVICE_TIMEOUT_MS = Number(process.env.MINDEX_DEVICE_TIMEOUT_MS || 1500)
const EARTH_DEVICE_FALLBACK_TIMEOUT_MS = Number(process.env.EARTH_DEVICE_FALLBACK_TIMEOUT_MS || 1200)

function toNumber(value: unknown): number | undefined {
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeLocation(value: any) {
  const lat = toNumber(value?.lat ?? value?.latitude)
  const lon = toNumber(value?.lon ?? value?.lng ?? value?.longitude)
  return {
    latitude: lat ?? 32.6401,
    longitude: lon ?? -117.0842,
    source: value?.source || (lat != null && lon != null ? "device" : "site-default"),
  }
}

function hasMeaningfulMetrics(value: unknown): boolean {
  if (!value || typeof value !== "object") return false
  return Object.values(value as Record<string, unknown>).some((entry) => {
    if (typeof entry === "number") return Number.isFinite(entry)
    if (typeof entry === "boolean") return entry === true
    if (entry && typeof entry === "object") return hasMeaningfulMetrics(entry)
    return false
  })
}

function normalizeEarthSimDevice(device: any) {
  const id = String(device?.id || device?.device_id || device?.registry_id || "")
  if (!id) return null
  const lat = toNumber(device?.location?.lat ?? device?.location?.latitude ?? device?.lat ?? device?.latitude)
  const lon = toNumber(device?.location?.lon ?? device?.location?.lng ?? device?.location?.longitude ?? device?.lng ?? device?.longitude)
  const status = String(device?.status || "").toLowerCase()
  const connected = status === "online" || status === "connected" || status === "active"
  const telemetry = device?.telemetry && typeof device.telemetry === "object" ? device.telemetry : {}
  const bme = telemetry?.bme688 && typeof telemetry.bme688 === "object" ? telemetry.bme688 : {}
  const bmeA = bme?.a || telemetry?.bme1 || telemetry?.bme688_1 || {}
  const bmeB = bme?.b || telemetry?.bme2 || telemetry?.bme688_2 || {}

  return {
    deviceId: id,
    deviceType: device?.type || device?.role || device?.device_type || "mycobrain",
    timestamp: device?.lastSeen || telemetry?.captured_at || telemetry?.timestamp || new Date().toISOString(),
    location: {
      latitude: lat ?? 32.6401,
      longitude: lon ?? -117.0842,
      source: lat != null && lon != null ? "earth-simulator-device-registry" : "site-default",
    },
    status: connected ? "active" : "inactive",
    metrics: {
      temperature: toNumber(telemetry?.temperature_c ?? telemetry?.temperature ?? bmeA?.temperature_c ?? bmeA?.temp_c ?? bmeA?.temperature),
      humidity: toNumber(telemetry?.humidity_pct ?? telemetry?.humidity ?? bmeA?.humidity_pct ?? bmeA?.humidity),
      pressure: toNumber(telemetry?.pressure_hpa ?? telemetry?.pressure ?? bmeA?.pressure_hpa ?? bmeA?.pressure),
      iaq: toNumber(telemetry?.iaq ?? bmeA?.iaq),
      eco2: toNumber(telemetry?.eco2_ppm ?? bmeA?.co2_equivalent ?? bmeA?.eco2_ppm),
      bvoc: toNumber(telemetry?.bvoc_ppm ?? bmeA?.voc_equivalent ?? bmeA?.bvoc_ppm),
      gasResistance: toNumber(telemetry?.gas_resistance_ohm ?? bmeA?.gas_ohm ?? bmeA?.gas_resistance_ohm),
      sensor2: bmeB && typeof bmeB === "object" ? {
        temperature: toNumber(telemetry?.bme_b_temperature_c ?? bmeB?.temperature_c ?? bmeB?.temp_c ?? bmeB?.temperature),
        humidity: toNumber(telemetry?.bme_b_humidity_pct ?? bmeB?.humidity_pct ?? bmeB?.humidity),
        pressure: toNumber(telemetry?.bme_b_pressure_hpa ?? bmeB?.pressure_hpa ?? bmeB?.pressure),
        iaq: toNumber(telemetry?.bme_b_iaq ?? bmeB?.iaq),
      } : null,
      uptime: toNumber(telemetry?.uptime_s ?? telemetry?.uptime_seconds),
    },
    port: device?.port || device?.registry_id,
    firmware: device?.firmware || device?.firmware_version,
    connected,
    lastSeen: device?.lastSeen || telemetry?.captured_at || telemetry?.timestamp || null,
    source: device?.source || "earth-simulator-device-registry",
    registryId: device?.registry_id,
    locationLabel: device?.location_label,
  }
}

async function fetchEarthSimulatorDeviceFallback(request: NextRequest) {
  try {
    const res = await fetch(new URL("/api/earth-simulator/devices", request.url), {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(EARTH_DEVICE_FALLBACK_TIMEOUT_MS),
    })
    if (!res.ok) return []
    const data = await res.json()
    return (Array.isArray(data?.devices) ? data.devices : [])
      .map(normalizeEarthSimDevice)
      .filter(Boolean)
  } catch (error) {
    if (DEBUG_DEVICE_TELEMETRY) {
      console.warn("Failed to fetch Earth Simulator device fallback:", error)
    }
    return []
  }
}

function normalizeOperatorReading(baseUrl: string, status: any, sensor: any) {
  const reading = sensor?.reading || status?.lastSensorReading
  if (!reading) return null

  const host = new URL(baseUrl).hostname
  const field = deploymentByHost(host)
  const sourceDeviceId = String(
    reading.device_id ||
      reading.node_id ||
      `mycobrain-${host.replace(/\./g, "-")}`
  )
  const slot = reading.sensor_slot ? `-${reading.sensor_slot}` : ""
  const normalizedId = field?.catalog_id || `${sourceDeviceId}${slot}-${host.replace(/\./g, "-")}`
  const metrics = {
    temperature: toNumber(reading.temperature_c_comp ?? reading.ambient_temperature_c ?? reading.temperature_c),
    temperatureF: toNumber(reading.temperature_f_comp ?? reading.ambient_temperature_f),
    humidity: toNumber(reading.humidity_pct_comp ?? reading.ambient_humidity_pct ?? reading.humidity_pct),
    pressure: toNumber(reading.pressure_hpa ?? reading.pressure_hPa ?? reading.p_hPa),
    iaq: toNumber(reading.iaq),
    staticIaq: toNumber(reading.iaq_static),
    iaqAccuracy: toNumber(reading.iaq_accuracy),
    eco2: toNumber(reading.eco2_ppm),
    bvoc: toNumber(reading.bvoc_ppm),
    gasResistance: toNumber(reading.gas_resistance_ohm_comp ?? reading.gas_resistance_ohm ?? reading.gas_ohm),
    gasPercentage: toNumber(reading.gas_percentage),
    uptime: toNumber(reading.uptime_s),
    sensorSlot: reading.sensor_slot,
    address: reading.address,
    valid: reading.valid === true,
  }

  return {
    deviceId: normalizedId,
    deviceType: field?.role || "mycobrain",
    name: field?.name,
    timestamp: status?.lastHeartbeat || new Date().toISOString(),
    location: field?.location
      ? { latitude: field.location.lat, longitude: field.location.lon, source: "field-deployment" }
      : normalizeLocation(reading.location),
    status: status?.serialConnected ? "active" : "inactive",
    metrics,
    port: status?.serialPort || baseUrl,
    firmware: reading.fw_version || status?.firmware,
    connected: status?.serialConnected === true,
    lastSeen: status?.lastHeartbeat,
    source: "operator-http",
    operatorUrl: baseUrl,
    registryId: field?.registry_id,
    locationLabel: field?.location_label,
    lastError: status?.serialConnected === true && hasMeaningfulMetrics(metrics) ? null : status?.lastError || null,
  }
}

async function fetchOperatorDevice(baseUrl: string) {
  try {
    const statusRes = await fetch(`${baseUrl}/api/status`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(OPERATOR_STATUS_TIMEOUT_MS),
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
        const key = String(parsed.sensor_slot || parsed.address || parsed.node_id || parsed.device_id || readings.size)
        readings.set(key, { ...parsed, ts: entry.ts || parsed.ts })
      } catch {
        // Ignore partial serial fragments; the operator keeps these as lastError
        // but still exposes valid complete telemetry lines around them.
      }
    }

    if (status?.lastSensorReading) {
      const reading = status.lastSensorReading
      const key = String(reading.sensor_slot || reading.address || reading.node_id || reading.device_id || readings.size)
      readings.set(key, reading)
    }

    const sensorRes = await fetch(`${baseUrl}/api/sensor`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(OPERATOR_SENSOR_TIMEOUT_MS),
    }).catch(() => null)

    const sensor = sensorRes?.ok ? await sensorRes.json().catch(() => null) : null
    if (sensor?.reading) {
      const reading = sensor.reading
      const key = String(reading.sensor_slot || reading.address || reading.node_id || reading.device_id || readings.size)
      readings.set(key, reading)
    }

    return [...readings.values()]
      .map((reading) => normalizeOperatorReading(baseUrl, status, { reading }))
      .filter(Boolean)
  } catch (error) {
    if (DEBUG_DEVICE_TELEMETRY) {
      console.warn(`Failed to fetch operator device ${baseUrl}:`, error)
    }
    return []
  }
}

// Fetch real device telemetry from MycoBrain, MINDEX, and network
async function fetchRealDeviceTelemetry(request: NextRequest) {
  const mycoBrainUrl = resolveMycoBrainServiceUrl()
  const mindexUrl = resolveMindexServerBaseUrl()
  
  try {
    const devices: any[] = []
    const deviceMap = new Map<string, any>() // deviceId -> device

    // 1. Fetch MycoBrain devices (real connected devices from service)
    try {
      const mycoRes = await fetch(`${mycoBrainUrl}/devices`, {
        signal: AbortSignal.timeout(MYCOBRAIN_SERVICE_TIMEOUT_MS),
      })
      
      if (mycoRes.ok) {
        const mycoData = await mycoRes.json()
        const mycoDevices = mycoData.devices || []
        
        for (const device of mycoDevices) {
          const deviceId = `mycobrain-${device.port?.replace(/[\/\\]/g, '-') || 'unknown'}`
          const bme1 = device.sensor_data?.bme688_1
          const bme2 = device.sensor_data?.bme688_2
          
          const deviceData = {
            deviceId,
            deviceType: "mycobrain" as const,
            timestamp: device.last_message_time || new Date().toISOString(),
            location: device.location || { latitude: 40.7128, longitude: -74.006 },
            status: device.connected ? "active" : "inactive",
            metrics: {
              temperature: bme1?.temperature,
              humidity: bme1?.humidity,
              pressure: bme1?.pressure,
              iaq: bme1?.iaq,
              gasResistance: bme1?.gas_resistance,
              sensor2: bme2 ? {
                temperature: bme2.temperature,
                humidity: bme2.humidity,
                pressure: bme2.pressure,
                iaq: bme2.iaq,
              } : null,
              uptime: device.device_info?.uptime,
              loraStatus: device.device_info?.lora_status,
            },
            port: device.port,
            firmware: device.device_info?.firmware || device.device_info?.mdp_version,
            connected: device.connected,
            lastSeen: device.last_message_time,
          }
          
          devices.push(deviceData)
          deviceMap.set(deviceId, deviceData)
        }
      }
    } catch (error) {
      if (DEBUG_DEVICE_TELEMETRY) {
        console.warn("Failed to fetch MycoBrain devices:", error)
      }
    }

    // 2. Fetch live Wi-Fi operator endpoints. These are the boards that expose
    // /api/status and /api/sensor directly on the lab network.
    const operatorDevices = (await Promise.all(OPERATOR_DEVICE_URLS.map(fetchOperatorDevice))).flat()
    for (const device of operatorDevices) {
      if (!device) continue
      devices.push(device)
      deviceMap.set(device.deviceId, device)
    }

    // 3. Fetch registered devices from MINDEX (includes offline devices)
    try {
      const mindexRes = await fetch(`${mindexUrl}/api/devices?type=mycobrain`, {
        signal: AbortSignal.timeout(MINDEX_DEVICE_TIMEOUT_MS),
      })
      
      if (mindexRes.ok) {
        const mindexData = await mindexRes.json()
        const mindexDevices = mindexData.data || mindexData.devices || []
        
        for (const device of mindexDevices) {
          const deviceId = device.device_id || device.id
          
          // Skip if already added from MycoBrain service
          if (!deviceMap.has(deviceId)) {
            devices.push({
              deviceId,
              deviceType: device.device_type || "mycobrain",
              timestamp: device.last_seen || device.timestamp || new Date().toISOString(),
              location: device.location || { latitude: 40.7128, longitude: -74.006 },
              status: device.status === "online" ? "active" : "inactive",
              metrics: device.metrics || {},
              port: device.port || device.serial_number,
              firmware: device.firmware_version,
              connected: device.status === "online",
              lastSeen: device.last_seen,
            })
          }
        }
      }
    } catch (error) {
      // MINDEX not available - continue with MycoBrain devices only
      if (DEBUG_DEVICE_TELEMETRY) {
        console.warn("Failed to fetch MINDEX devices:", error)
      }
    }

    const registryDevices = await fetchEarthSimulatorDeviceFallback(request)
    for (const device of registryDevices) {
      if (deviceMap.has(device.deviceId) || (device.registryId && deviceMap.has(device.registryId))) continue
      devices.push(device)
      deviceMap.set(device.deviceId, device)
    }

    return devices
  } catch (error) {
    if (DEBUG_DEVICE_TELEMETRY) {
      console.warn("Failed to fetch device telemetry:", error)
    }
    return fetchEarthSimulatorDeviceFallback(request)
  }
}

export async function GET(request: NextRequest) {
  const telemetry = await fetchRealDeviceTelemetry(request)
  return NextResponse.json(telemetry)
}
