import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

/**
 * Device Discovery API
 * 
 * Continuously discovers and tracks MycoBrain devices by:
 * 1. Scanning serial ports via MycoBrain service
 * 2. Checking MINDEX for registered devices
 * 3. Integrating with Mycorrhizae protocol
 * 
 * This is the core device discovery endpoint for NatureOS.
 */
export async function GET() {
  const mycoBrainUrl = process.env.MYCOBRAIN_SERVICE_URL || process.env.MYCOBRAIN_API_URL || "http://localhost:8003"
  const mindexUrl = process.env.MINDEX_API_URL || "http://localhost:8000"
  const masUrl = process.env.MAS_API_URL || "http://localhost:8001"
  
  try {
    const discoveredDevices: any[] = []
    const deviceMap = new Map<string, any>()
    const likelyPorts = new Set<string>()

    // 1. Get all ports (including unconnected ones)
    try {
      const portsRes = await fetch(`${mycoBrainUrl}/ports`, {
        signal: AbortSignal.timeout(3000),
      })
      
      if (portsRes.ok) {
        const portsData = await portsRes.json()
        const ports = portsData.ports || []
        
        for (const portInfo of ports) {
          const portName = portInfo.device || portInfo.port
          if (!portName) continue
          let likelyMycoBrain = portInfo.likely_mycobrain ?? portInfo.is_mycobrain
          if (likelyMycoBrain === undefined) {
            const hwid = String(portInfo.hwid || "").toUpperCase()
            const hasVid = portInfo.vid != null
            likelyMycoBrain = hasVid && !hwid.includes("ACPI") && !hwid.includes("PNP0501")
          }
          if (!likelyMycoBrain) continue
          likelyPorts.add(String(portName))
          const deviceId = `mycobrain-${String(portName).replace(/[\/\\]/g, '-')}`
          if (!deviceMap.has(deviceId)) {
            deviceMap.set(deviceId, {
              deviceId,
              deviceType: "mycobrain",
              port: portName,
              description: portInfo.description,
              hwid: portInfo.hwid,
              connected: portInfo.is_connected || false,
              discovered: true,
              source: "serial_scan",
            })
          }
        }
      }
    } catch (error) {
      console.error("Failed to scan ports:", error)
    }

    // 2. Get connected devices from MycoBrain service (only include real ports)
    try {
      const devicesRes = await fetch(`${mycoBrainUrl}/devices`, {
        signal: AbortSignal.timeout(3000),
      })
      
      if (devicesRes.ok) {
        const devicesData = await devicesRes.json()
        const devices = devicesData.devices || []
        
        for (const device of devices) {
          const port = device.port ? String(device.port).replace(/[\/\\]/g, '-') : ''
          if (!port || !likelyPorts.has(device.port)) continue
          const deviceId = `mycobrain-${port}`
          
          const existing = deviceMap.get(deviceId) || {}
          deviceMap.set(deviceId, {
            ...existing,
            deviceId,
            deviceType: "mycobrain",
            connected: device.status === "connected" || device.connected || false,
            discovered: true,
            lastMessage: device.last_message_time,
            sensorData: device.sensor_data,
            deviceInfo: device.info || device.device_info,
            source: "mycobrain_service",
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch MycoBrain devices:", error)
    }

    // 3. Get registered devices from MINDEX
    try {
      const mindexRes = await fetch(`${mindexUrl}/api/devices?type=mycobrain`, {
        signal: AbortSignal.timeout(3000),
      })
      
      if (mindexRes.ok) {
        const mindexData = await mindexRes.json()
        const devices = mindexData.data || mindexData.devices || []
        
        for (const device of devices) {
          const deviceId = device.device_id || device.id
          
          const existing = deviceMap.get(deviceId) || {}
          deviceMap.set(deviceId, {
            ...existing,
            deviceId,
            deviceType: device.device_type || existing.deviceType || "mycobrain",  // ← Preserve existing or default to mycobrain
            serialNumber: device.serial_number,
            firmwareVersion: device.firmware_version,
            status: device.status,
            location: device.location,
            metadata: device.metadata,
            registered: true,
            discovered: true,  // ← Mark as discovered
            source: existing.source ? `${existing.source},mindex` : "mindex",
          })
        }
      }
    } catch (error) {
      console.error("Failed to fetch MINDEX devices:", error)
    }

    // 4. Get device info from Mycorrhizae protocol (via MAS)
    try {
      const masRes = await fetch(`${masUrl}/agents/registry/search?q=mycobrain`, {
        signal: AbortSignal.timeout(2000),
      })
      
      if (masRes.ok) {
        const masData = await masRes.json()
        const agents = masData.agents || []
        
        for (const agent of agents) {
          if (agent.name?.toLowerCase().includes("mycobrain")) {
            const deviceId = agent.id || `agent-${agent.name}`
            
            const existing = deviceMap.get(deviceId) || {}
            deviceMap.set(deviceId, {
              ...existing,
              deviceId,
              agentId: agent.id,
              agentName: agent.name,
              agentStatus: agent.active ? "active" : "idle",
              source: existing.source ? `${existing.source},mycorrhizae` : "mycorrhizae",
            })
          }
        }
      }
    } catch (error) {
      // MAS not available - continue
    }

    // Convert map to array
    for (const [deviceId, device] of deviceMap.entries()) {
      discoveredDevices.push({
        ...device,
        deviceId,
        // Determine overall status
        status: device.connected ? "online" : 
                device.status === "online" ? "online" :
                device.discovered ? "offline" : "unknown",
        // Last seen timestamp
        lastSeen: device.lastMessage || device.metadata?.last_seen || new Date().toISOString(),
      })
    }

    return NextResponse.json({
      devices: discoveredDevices,
      total: discoveredDevices.length,
      online: discoveredDevices.filter(d => d.status === "online").length,
      offline: discoveredDevices.filter(d => d.status === "offline").length,
      discoveryActive: true,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Device discovery error:", error)
    return NextResponse.json(
      {
        devices: [],
        total: 0,
        online: 0,
        offline: 0,
        discoveryActive: false,
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}



































