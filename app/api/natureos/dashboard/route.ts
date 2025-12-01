import { type NextRequest, NextResponse } from "next/server"
import { natureOSAPI } from "@/lib/services/natureos-api"

export async function GET(request: NextRequest) {
  try {
    const response = await natureOSAPI.getDashboardData()

    if (!response.success) {
      return NextResponse.json({ error: response.error || "Failed to fetch dashboard data" }, { status: 500 })
    }

    const backendData = response.data as any

    const transformedData = {
      stats: {
        totalEvents: backendData.Stats?.TotalEvents || 0,
        activeDevices: backendData.Stats?.ActiveDevices || 0,
        dataPoints: backendData.Stats?.DataPoints || 0,
        uptime: backendData.Stats?.Uptime || "0%",
      },
      liveData: {
        readings: (backendData.LiveData?.Readings || []).map((reading: any) => ({
          device: reading.DeviceId || reading.deviceId,
          value: reading.Value || reading.value,
          timestamp: reading.Timestamp || reading.timestamp,
          type: reading.Type || reading.type,
        })),
        lastUpdate: backendData.LiveData?.LastUpdate || new Date().toISOString(),
      },
      insights: {
        trendingCompounds: backendData.Insights?.TrendingCompounds || [],
        recentDiscoveries: backendData.Insights?.RecentDiscoveries || [],
        alerts: backendData.Insights?.Alerts || [],
      },
    }

    return NextResponse.json(transformedData)
  } catch (error) {
    console.error("[v0] Dashboard API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
