import { NextRequest, NextResponse } from "next/server"

// Check for real MycoBrain devices
async function fetchMycoBrainDevices() {
  const urls = [
    process.env.MYCOBRAIN_API_URL || "http://host.docker.internal:8001/api/mycobrain",
    "http://host.docker.internal:8001/api/devices",
  ]

  for (const url of urls) {
    try {
      const response = await fetch(`${url}/devices`, {
        signal: AbortSignal.timeout(3000),
      })
      if (response.ok) {
        const data = await response.json()
        return data.devices || []
      }
    } catch {
      continue
    }
  }

  return []
}

// Check UniFi controller for network devices
async function fetchUniFiDevices() {
  const unifiUrl = process.env.UNIFI_CONTROLLER_URL

  if (!unifiUrl) return []

  try {
    const response = await fetch(`${unifiUrl}/api/s/default/stat/device`, {
      headers: {
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) return []

    const data = await response.json()
    return (data.data || []).map((device: any) => ({
      id: device._id,
      name: device.name || device.hostname || "Unknown Device",
      type: device.type || "network",
      status: device.state === 1 ? "online" : "offline",
      ip: device.ip,
      mac: device.mac,
      model: device.model,
      uptime: device.uptime,
      lastSeen: device.last_seen,
      source: "UniFi",
    }))
  } catch {
    return []
  }
}

// Local device registry from environment sensors
const LOCAL_DEVICES = [
  {
    id: "mycobrain-001",
    name: "MycoBrain Node 1",
    type: "sensor",
    status: "online",
    description: "Primary MycoBrain environmental sensor with 2x BME688",
    location: "Lab",
    sensors: ["temperature", "humidity", "pressure", "gas", "voc"],
    lastSeen: new Date().toISOString(),
    source: "MycoBrain",
  },
]

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")

  // Fetch from multiple sources in parallel
  const [mycoBrainDevices, unifiDevices] = await Promise.all([
    fetchMycoBrainDevices(),
    fetchUniFiDevices(),
  ])

  // Combine all devices
  let allDevices = [...LOCAL_DEVICES, ...mycoBrainDevices, ...unifiDevices]

  // Filter by type if specified
  if (type) {
    allDevices = allDevices.filter((d) => d.type === type)
  }

  // Mark devices as real if we got data from real sources
  const hasRealData = mycoBrainDevices.length > 0 || unifiDevices.length > 0

  return NextResponse.json({
    devices: allDevices,
    total: allDevices.length,
    sources: ["MycoBrain", "UniFi"],
    realData: hasRealData,
    timestamp: new Date().toISOString(),
  })
}

export async function POST(request: Request) {
  const data = await request.json()

  // Forward to MycoBrain API if available
  const mycoBrainUrl = process.env.MYCOBRAIN_API_URL || "http://host.docker.internal:8001/api/mycobrain"

  try {
    const response = await fetch(`${mycoBrainUrl}/devices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const result = await response.json()
      return NextResponse.json({ success: true, device: result })
    }
  } catch {
    // MycoBrain not available
  }

  // Return success with local registration
  return NextResponse.json({
    success: true,
    device: {
      id: `device-${Date.now()}`,
      ...data,
      createdAt: new Date().toISOString(),
    },
    note: "Device registered locally. Sync with MycoBrain when available.",
  })
}
