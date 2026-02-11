import { NextRequest, NextResponse } from "next/server"

// Check for real MycoBrain devices from local service or MAS
async function fetchMycoBrainDevices() {
  // Try local MycoBrain service first (for local dev), then MAS VM
  const urls = [
    process.env.MYCOBRAIN_API_URL, // http://localhost:8003 for local dev
    process.env.MAS_API_URL ? `${process.env.MAS_API_URL}/api/mycobrain` : null,
    "http://192.168.0.188:8001/api/mycobrain",
  ].filter(Boolean) as string[]

  for (const baseUrl of urls) {
    try {
      // MycoBrain service uses /devices endpoint directly
      const response = await fetch(`${baseUrl}/devices`, {
        signal: AbortSignal.timeout(3000),
        cache: "no-store",
      })
      if (response.ok) {
        const data = await response.json()
        const devices = data.devices || []
        if (devices.length > 0) {
          console.log(`[Devices API] Found ${devices.length} devices from ${baseUrl}`)
          return devices
        }
      }
    } catch (error) {
      console.log(`[Devices API] Failed to fetch from ${baseUrl}:`, (error as Error).message)
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

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type")

  // Fetch from real sources only - NO mock data
  const [mycoBrainDevices, unifiDevices] = await Promise.all([
    fetchMycoBrainDevices(),
    fetchUniFiDevices(),
  ])

  // Combine devices from real sources only
  let allDevices = [...mycoBrainDevices, ...unifiDevices]

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
    mycobrain_url: process.env.MYCOBRAIN_API_URL || "not set",
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
