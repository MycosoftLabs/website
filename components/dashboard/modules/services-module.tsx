"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Server, Loader2, RefreshCw, CheckCircle, XCircle, AlertTriangle,
  ExternalLink, Wifi, WifiOff
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface ServiceInfo {
  name: string
  port: number | null
  status: "running" | "stopped" | "error" | "unknown"
  type: string
  category: string
  description: string
  healthEndpoint?: string
  lastChecked?: string
  uptime?: string
  enabled: boolean
}

export function ServicesModule() {
  const [services, setServices] = useState<ServiceInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchServices = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/services")
      if (res.ok) {
        const data = await res.json()
        setServices(data.services || [])
      }
    } catch {
      toast.error("Failed to load services")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchServices() }, [])

  const toggleService = async (serviceName: string, enabled: boolean) => {
    setActionLoading(serviceName)
    try {
      const res = await fetch("/api/dashboard/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: serviceName, enabled }),
      })
      if (res.ok) {
        setServices((prev) => prev.map((s) =>
          s.name === serviceName ? { ...s, enabled, status: enabled ? "running" : "stopped" } : s
        ))
        toast.success(`${serviceName} ${enabled ? "enabled" : "disabled"}`)
      } else {
        toast.error("Failed to toggle service")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
    }
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "running": return <CheckCircle className="w-4 h-4 text-green-400" />
      case "stopped": return <XCircle className="w-4 h-4 text-slate-500" />
      case "error": return <AlertTriangle className="w-4 h-4 text-red-400" />
      default: return <Wifi className="w-4 h-4 text-slate-500" />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "running": return "bg-green-500/20 text-green-400"
      case "stopped": return "bg-slate-700 text-slate-400"
      case "error": return "bg-red-500/20 text-red-400"
      default: return "bg-slate-700 text-slate-400"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  // Group by category
  const categories = Array.from(new Set(services.map((s) => s.category)))

  const counts = {
    running: services.filter((s) => s.status === "running").length,
    stopped: services.filter((s) => s.status === "stopped").length,
    error: services.filter((s) => s.status === "error").length,
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Service Monitoring</h2>
          <p className="text-slate-400 text-sm">
            {counts.running} running, {counts.stopped} stopped{counts.error > 0 ? `, ${counts.error} error` : ""}
          </p>
        </div>
        <button
          onClick={fetchServices}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-green-400">{counts.running}</div>
            <div className="text-xs text-slate-400">Running</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-slate-400">{counts.stopped}</div>
            <div className="text-xs text-slate-400">Stopped</div>
          </CardContent>
        </Card>
        <Card className={cn("border", counts.error > 0 ? "bg-red-500/10 border-red-500/30" : "bg-slate-800/50 border-slate-700")}>
          <CardContent className="py-3 text-center">
            <div className={cn("text-2xl font-bold", counts.error > 0 ? "text-red-400" : "text-slate-400")}>{counts.error}</div>
            <div className="text-xs text-slate-400">Error</div>
          </CardContent>
        </Card>
      </div>

      {/* Service List by Category */}
      {categories.map((category) => (
        <div key={category} className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-1">{category}</h3>
          {services
            .filter((s) => s.category === category)
            .map((service) => (
              <Card key={service.name} className="bg-slate-800/50 border-slate-700">
                <CardContent className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    {statusIcon(service.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-medium text-sm">{service.name}</span>
                        <Badge className={cn("text-xs", statusColor(service.status))}>{service.status.toUpperCase()}</Badge>
                        {service.port && (
                          <span className="text-xs text-slate-600 font-mono">:{service.port}</span>
                        )}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {service.type} · {service.description}
                      </div>
                    </div>
                    <Switch
                      checked={service.enabled}
                      onCheckedChange={(checked) => toggleService(service.name, checked)}
                      disabled={actionLoading === service.name}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      ))}
    </div>
  )
}
