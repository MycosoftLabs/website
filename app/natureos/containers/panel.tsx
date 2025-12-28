"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"

interface MetricsPayload {
  docker?: {
    running?: number
    stopped?: number
    total?: number
    containers?: unknown[]
  }
  os?: unknown
  cpu?: unknown
  memory?: unknown
}

export function ContainersPanel() {
  const [data, setData] = useState<MetricsPayload | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/natureos/system/metrics")
      if (res.ok) setData(await res.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  const running = data?.docker?.running ?? 0
  const stopped = data?.docker?.stopped ?? 0
  const total = data?.docker?.total ?? running + stopped

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Source: <span className="font-mono text-foreground">/api/natureos/system/metrics</span>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Running</CardTitle>
            <CardDescription>Containers currently running</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{running}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Stopped</CardTitle>
            <CardDescription>Containers stopped</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stopped}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CardDescription>Total containers</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{total}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Controls</CardTitle>
          <CardDescription>Start/stop/restart controls will be powered by a Docker API bridge.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>
            This page already reflects Docker totals (when MAS exposes them). Next step is adding a secure API bridge
            that lists containers and executes actions.
          </p>
          <p>
            For now you can manage containers in the Docker UI or via CLI, and NatureOS will show status via system
            metrics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

