import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

// Fetch real device telemetry from MycoBrain, MINDEX, and network
async function fetchRealDeviceTelemetry() {
  const mycoBrainUrl = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8765"
  const mindexUrl = process.env.MINDEX_API_URL || "http://localhost:8000"
  
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

    // 2. Fetch registered devices from MINDEX (includes offline devices)
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
