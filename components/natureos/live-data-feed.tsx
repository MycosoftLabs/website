"use client"

import { useState, useEffect, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, TrendingUp, Database } from "lucide-react"

interface DashboardData {
  stats: {
    totalEvents: number
    activeDevices: number
    dataPoints: number
    uptime: string
  }
  liveData: {
    readings: Array<{
      device: string
      value: number
      timestamp: string
      type: string
    }>
    lastUpdate: string
  }
  insights: {
    trendingCompounds: string[]
    recentDiscoveries: string[]
    alerts: string[]
  }
}

export function LiveDataFeed() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch("/api/natureos/dashboard")
      if (!response.ok) throw new Error("Failed to fetch dashboard data")

      const dashboardData = await response.json()
      setData(dashboardData)
      setError(null)
    } catch (err) {
      console.error("[v0] Dashboard fetch error:", err)
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Activity className="h-6 w-6 animate-pulse" />
          <span className="ml-2">Loading live data...</span>
        </div>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="p-6">
        <div className="text-center text-muted-foreground">
          <p>Unable to load live data from NatureOS</p>
          {error && <p className="text-sm mt-2">{error}</p>}
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">System Stats</h3>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Total Events</span>
            <span className="font-medium">{data.stats.totalEvents.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Active Devices</span>
            <span className="font-medium">{data.stats.activeDevices}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Data Points</span>
            <span className="font-medium">{data.stats.dataPoints.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Uptime</span>
            <Badge variant="secondary">{data.stats.uptime}</Badge>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Live Readings</h3>
        </div>
        <div className="space-y-2">
          {data.liveData.readings.slice(0, 5).map((reading, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-muted-foreground">{reading.device}</span>
              <span className="font-medium">{reading.value}</span>
            </div>
          ))}
          <p className="text-xs text-muted-foreground mt-2">
            Last update: {new Date(data.liveData.lastUpdate).toLocaleTimeString()}
          </p>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Insights</h3>
        </div>
        <div className="space-y-3">
          {data.insights.trendingCompounds.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Trending Compounds</p>
              <div className="flex flex-wrap gap-1">
                {data.insights.trendingCompounds.map((compound, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {compound}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {data.insights.recentDiscoveries.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-1">Recent Discoveries</p>
              <div className="space-y-1">
                {data.insights.recentDiscoveries.slice(0, 3).map((discovery, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">
                    {discovery}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
