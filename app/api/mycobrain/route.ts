import { NextRequest, NextResponse } from "next/server"

// MycoBrain service URL - runs on port 8003 (local) or via network
const MYCOBRAIN_SERVICE_URL = process.env.MYCOBRAIN_SERVICE_URL || "http://localhost:8003"
const MAS_API_URL = process.env.MAS_API_URL || "http://192.168.0.188:8001"

export const dynamic = "force-dynamic"

// Fetch devices from MAS network registry (for when no local service)
async function fetchNetworkDevices(): Promise<any[]> {
  try {
    const response = await fetch(`${MAS_API_URL}/api/devices`, {
      signal: AbortSignal.timeout(5000),
      headers: { "Accept": "application/json" },
    })
    if (!response.ok) return []
    const data = await response.json()
    
    // Transform MAS registry format to local device format
    return (data.devices || []).map((d: any) => ({
      port: d.extra?.port_name || d.device_id,
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
        bme688_count: d.sensors?.length || 2,
        status: d.status,
      },
      sensor_data: {},
      capabilities: {
        bme688_count: d.sensors?.length || 2,
        has_lora: d.capabilities?.includes("lora") || false,
        has_neopixel: d.capabilities?.includes("led") || true,
        has_buzzer: d.capabilities?.includes("buzzer") || true,
        i2c_bus: d.capabilities?.includes("i2c") || true,
        analog_inputs: 4,
        digital_io: 3,
      },
      // Identity fields
      device_name: d.device_name,
      device_role: d.device_role,
      device_display_name: d.device_display_name,
      display_name: d.device_display_name || d.device_name || d.device_id,
    }))
  } catch (error) {
    console.error("Failed to fetch network devices:", error)
    return []
  }
}

// Normalize device data from service to match frontend expectations
function normalizeDevice(d: any) {
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
      signal: AbortSignal.timeout(3000),
    }).catch(() => null)
    
    if (!healthRes?.ok) {
      // No local service - try to fetch from MAS network registry instead
      const networkDevices = await fetchNetworkDevices()
      
      if (networkDevices.length > 0) {
        return NextResponse.json({
          devices: networkDevices,
          source: "network-registry",
          message: "Devices loaded from MAS network registry (no local service)",
          timestamp: new Date().toISOString(),
          serviceUrl: MYCOBRAIN_SERVICE_URL,
          masUrl: MAS_API_URL,
          serviceHealthy: false,
          networkHealthy: true,
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
    
    // Fetch all connected devices from the local MycoBrain service
    const response = await fetch(`${MYCOBRAIN_SERVICE_URL}/devices`, {
      signal: AbortSignal.timeout(3000),
    })
    
    if (response.ok) {
      const data = await response.json()
      
      // Normalize devices to match frontend expectations
      const normalizedDevices = (data.devices || []).map(normalizeDevice)
      
      // Also get available ports to show discovery status
      const portsRes = await fetch(`${MYCOBRAIN_SERVICE_URL}/ports`, {
        signal: AbortSignal.timeout(1500),
      }).catch(() => null)
      
      const portsData = portsRes?.ok ? await portsRes.json() : { ports: [], discovery_running: false }
      
      // Also fetch network devices and merge (avoid duplicates)
      const networkDevices = await fetchNetworkDevices()
      const localDeviceIds = new Set(normalizedDevices.map((d: any) => d.device_id))
      const additionalNetworkDevices = networkDevices.filter(d => !localDeviceIds.has(d.device_id))
      
      return NextResponse.json({
        ...data,
        devices: [...normalizedDevices, ...additionalNetworkDevices],
        source: "mycobrain-service",
        availablePorts: portsData.ports || [],
        discoveryRunning: portsData.discovery_running || false,
        serviceHealthy: true,
        networkDevicesIncluded: additionalNetworkDevices.length,
      })
    }
    
    throw new Error("Service unavailable")
  } catch (error) {
    // Try network registry as last resort
    const networkDevices = await fetchNetworkDevices()
    
    if (networkDevices.length > 0) {
      return NextResponse.json({
        devices: networkDevices,
        source: "network-registry-fallback",
        message: "Devices loaded from MAS network registry",
        timestamp: new Date().toISOString(),
        networkHealthy: true,
      })
    }
    
    return NextResponse.json({
      devices: [],
      source: "api",
      error: "MycoBrain service not available",
      message: "Start the MycoBrain service to connect devices",
      timestamp: new Date().toISOString(),
      serviceUrl: MYCOBRAIN_SERVICE_URL,
    })
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { action, port = "COM5" } = body
  
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
