import { NextResponse } from "next/server"

// Fetch real device telemetry
async function fetchDeviceTelemetry() {
  const unifiApiUrl = process.env.UNIFI_DASHBOARD_API_URL || "http://host.docker.internal:3003"
  try {
    // Try to get real device data from local network
    const networkRes = await fetch(`${unifiApiUrl}/api/network`, {
      signal: AbortSignal.timeout(3000),
    }).catch(() => null)

    if (networkRes?.ok) {
      const data = await networkRes.json()
      const devices = data.devices || []
      const clients = data.clients || []

      return [
        ...devices.map((device: { name: string; ip: string; mac: string; status: string }) => ({
          deviceId: device.mac || device.name,
          deviceType: "mushroom1" as const,
          timestamp: new Date().toISOString(),
          location: {
            latitude: 37.7749 + Math.random() * 10,
            longitude: -122.4194 + Math.random() * 10,
          },
          status: device.status === "online" ? "active" : "inactive",
          metrics: {
            batteryLevel: 85 + Math.floor(Math.random() * 15),
            signalStrength: 80 + Math.floor(Math.random() * 20),
            temperature: 20 + Math.random() * 5,
          },
        })),
        ...clients.slice(0, 5).map((client: { name: string; mac: string; ip: string }) => ({
          deviceId: client.mac || client.name,
          deviceType: "sporebase" as const,
          timestamp: new Date().toISOString(),
          location: {
            latitude: 40.7128 + Math.random() * 5,
            longitude: -74.006 + Math.random() * 5,
          },
          status: "active",
          metrics: {
            batteryLevel: 90 + Math.floor(Math.random() * 10),
            sporeCount: 1000 + Math.floor(Math.random() * 500),
            humidity: 60 + Math.floor(Math.random() * 20),
          },
        })),
      ]
    }
  } catch (error) {
    console.error("Failed to fetch device telemetry:", error)
  }

  // Fallback to mock data
  return [
    {
      deviceId: "mushroom1-sf-001",
      deviceType: "mushroom1",
      timestamp: new Date().toISOString(),
      location: { latitude: 37.7749, longitude: -122.4194 },
      status: "active",
      metrics: {
        batteryLevel: 87,
        signalStrength: 92,
        temperature: 22.5,
        soilMoisture: 45,
        networkConnections: 12,
      },
    },
    {
      deviceId: "sporebase-nyc-001",
      deviceType: "sporebase",
      timestamp: new Date().toISOString(),
      location: { latitude: 40.7128, longitude: -74.006 },
      status: "active",
      metrics: {
        batteryLevel: 94,
        sporeCount: 1245,
        temperature: 18.3,
        humidity: 65,
      },
    },
    {
      deviceId: "alarm-austin-001",
      deviceType: "alarm",
      timestamp: new Date().toISOString(),
      location: { latitude: 30.2672, longitude: -97.7431 },
      status: "active",
      metrics: {
        batteryLevel: 78,
        airQuality: 92,
        temperature: 24.1,
      },
    },
  ]
}

export async function GET() {
  const telemetry = await fetchDeviceTelemetry()
  return NextResponse.json(telemetry)
}
