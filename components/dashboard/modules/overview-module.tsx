"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Users, Cpu, Database, Activity, TrendingUp, DollarSign,
  Shield, Server, Loader2, RefreshCw, AlertTriangle, CheckCircle
} from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { MYCAStateWidget } from "@/components/myca/MYCAStateWidget"

interface OverviewStats {
  users: { total: number; human: number; machine: number }
  devices: { total: number; online: number }
  services: { total: number; running: number; stopped: number; error: number }
  databases: { totalSizeGb: number; online: number; total: number }
  security: { threatLevel: string; eventsToday: number }
  mrr: { amount: number; activeUsers: number; apiCalls: number } | null
  recentActivity: Array<{ time: string; event: string; type: string }>
}

export function OverviewModule() {
  const [stats, setStats] = useState<OverviewStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/overview")
      if (!res.ok) throw new Error("Failed to load")
      const data = await res.json()
      setStats(data)
      setError(null)
    } catch {
      setError("Failed to load overview stats")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="text-center py-20 text-slate-400">
        <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
        <p>{error}</p>
        <button onClick={fetchStats} className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm">
          Try again
        </button>
      </div>
    )
  }

  const statCards = [
    {
      label: "Total Users",
      value: stats?.users.total ?? 0,
      sub: `${stats?.users.human ?? 0} human, ${stats?.users.machine ?? 0} machine`,
      icon: Users,
      color: "text-blue-400"
    },
    {
      label: "Devices",
      value: stats?.devices.total ?? 0,
      sub: `${stats?.devices.online ?? 0} online`,
      icon: Cpu,
      color: "text-emerald-400"
    },
    {
      label: "Services",
      value: `${stats?.services.running ?? 0}/${stats?.services.total ?? 0}`,
      sub: stats?.services.error ? `${stats.services.error} error(s)` : "All healthy",
      icon: Server,
      color: stats?.services.error ? "text-red-400" : "text-green-400"
    },
    {
      label: "Security",
      value: stats?.security.threatLevel?.toUpperCase() ?? "UNKNOWN",
      sub: `${stats?.security.eventsToday ?? 0} events today`,
      icon: Shield,
      color: stats?.security.threatLevel === "critical" ? "text-red-400" :
             stats?.security.threatLevel === "high" ? "text-orange-400" :
             stats?.security.threatLevel === "elevated" ? "text-amber-400" : "text-green-400"
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">System Overview</h2>
          <p className="text-slate-400 text-sm">
            Last updated: {format(new Date(), "HH:mm:ss")}
          </p>
        </div>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="bg-slate-800/50 border-slate-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-400">{stat.label}</CardTitle>
                <Icon className={cn("h-5 w-5", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <p className="text-xs text-slate-500 mt-1">{stat.sub}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* MRR Card */}
      {stats?.mrr && (
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <DollarSign className="w-5 h-5 text-amber-400" />
              MRR & Beta Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-2xl font-bold text-amber-400">${stats.mrr.amount}</div>
                <div className="text-sm text-slate-500">MRR</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.mrr.activeUsers}</div>
                <div className="text-sm text-slate-500">Active Users</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.mrr.apiCalls}</div>
                <div className="text-sm text-slate-500">API Calls</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* MYCA State */}
      <MYCAStateWidget />

      {/* Database Summary */}
      {stats?.databases && (
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Database className="w-5 h-5 text-blue-400" />
              Databases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <div className="text-2xl font-bold text-white">{stats.databases.totalSizeGb.toFixed(1)} GB</div>
                <div className="text-sm text-slate-500">Total Size</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-400">{stats.databases.online}</div>
                <div className="text-sm text-slate-500">Online</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.databases.total}</div>
                <div className="text-sm text-slate-500">Total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Activity */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Recent Activity</CardTitle>
          <CardDescription className="text-slate-400">Latest system events</CardDescription>
        </CardHeader>
        <CardContent>
          {(!stats?.recentActivity || stats.recentActivity.length === 0) ? (
            <div className="text-sm text-slate-500">No recent activity</div>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm">
                  <span className="text-slate-500 w-20 text-right shrink-0 font-mono text-xs">{item.time}</span>
                  <span className={cn(
                    "h-2 w-2 rounded-full shrink-0",
                    item.type === "security" ? "bg-red-500" :
                    item.type === "service" ? "bg-blue-500" :
                    item.type === "user" ? "bg-purple-500" :
                    "bg-emerald-500"
                  )} />
                  <span className="text-slate-300">{item.event}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
