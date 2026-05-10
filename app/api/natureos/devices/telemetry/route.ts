import { NextResponse } from "next/server"
import { resolveMindexServerBaseUrl } from "@/lib/mindex-base-url"
import { resolveMycoBrainServiceUrl } from "@/lib/mycobrain-service-url"

export const dynamic = "force-dynamic"

const OPERATOR_DEVICE_URLS = (
  process.env.MYCOBRAIN_OPERATOR_URLS || "http://192.168.0.228:8787,http://192.168.0.123:8787"
)
  .split(",")
  .map((url) => url.trim().replace(/\/+$/, ""))
  .filter(Boolean)

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

function normalizeOperatorReading(baseUrl: string, status: any, sensor: any) {
  const reading = sensor?.reading || status?.lastSensorReading
  if (!reading) return null

  const host = new URL(baseUrl).hostname
  const deviceId = String(
    reading.device_id ||
      reading.node_id ||
      `mycobrain-${host.replace(/\./g, "-")}`
  )
  const slot = reading.sensor_slot ? `-${reading.sensor_slot}` : ""
  const normalizedId = `${deviceId}${slot}-${host.replace(/\./g, "-")}`

  return {
    deviceId: normalizedId,
    deviceType: "mycobrain" as const,
    timestamp: status?.lastHeartbeat || new Date().toISOString(),
    location: normalizeLocation(reading.location),
    status: status?.serialConnected ? "active" : "inactive",
    metrics: {
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
    },
    port: status?.serialPort || baseUrl,
    firmware: reading.fw_version || status?.firmware,
    connected: status?.serialConnected === true,
    lastSeen: status?.lastHeartbeat,
    source: "operator-http",
    operatorUrl: baseUrl,
    lastError: status?.lastError || null,
  }
}

async function fetchOperatorDevice(baseUrl: string) {
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
      signal: AbortSignal.timeout(2000),
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
    console.error(`Failed to fetch operator device ${baseUrl}:`, error)
    return []
  }
}

// Fetch real device telemetry from MycoBrain, MINDEX, and network
async function fetchRealDeviceTelemetry() {
  const mycoBrainUrl = resolveMycoBrainServiceUrl()
  const mindexUrl = resolveMindexServerBaseUrl()
  
  try {
    const devices: any[] = []
    const deviceMap = new Map<string, any>() // deviceId -> device

    // 1. Fetch MycoBrain devices (real connected devices from service)
    try {
      const mycoRes = await fetch(`${mycoBrainUrl}/devices`, {
        signal: AbortSignal.timeout(5000),
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
      console.error("Failed to fetch MycoBrain devices:", error)
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
        signal: AbortSignal.timeout(3000),
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
      console.error("Failed to fetch MINDEX devices:", error)
    }

    // Network devices removed - only show real MycoBrain devices from service and MINDEX
    // No fake/sample network devices

    return devices
  } catch (error) {
    console.error("Failed to fetch device telemetry:", error)
    // Return empty array - no mock fallback
    return []
  }
}

export async function GET() {
  const telemetry = await fetchRealDeviceTelemetry()
  return NextResponse.json(telemetry)
}
