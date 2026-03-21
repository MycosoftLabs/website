"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Lock, Loader2, RefreshCw, Shield, Globe, Users,
  Crown, CreditCard, Building, Search, RotateCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface RouteGate {
  path: string
  description: string
  currentGate: string
  defaultGate: string
  isOverridden: boolean
  overriddenAt?: string
}

const GATE_LEVELS = ["PUBLIC", "FREEMIUM", "AUTHENTICATED", "PREMIUM", "COMPANY", "ADMIN", "SUPER_ADMIN"]

const gateColor = (gate: string) => {
  switch (gate) {
    case "PUBLIC": return "bg-green-500/20 text-green-400"
    case "FREEMIUM": return "bg-teal-500/20 text-teal-400"
    case "AUTHENTICATED": return "bg-blue-500/20 text-blue-400"
    case "PREMIUM": return "bg-purple-500/20 text-purple-400"
    case "COMPANY": return "bg-indigo-500/20 text-indigo-400"
    case "ADMIN": return "bg-orange-500/20 text-orange-400"
    case "SUPER_ADMIN": return "bg-red-500/20 text-red-400"
    default: return "bg-slate-700 text-slate-400"
  }
}

const gateIcon = (gate: string) => {
  switch (gate) {
    case "PUBLIC": return Globe
    case "FREEMIUM": return Users
    case "AUTHENTICATED": return Lock
    case "PREMIUM": return CreditCard
    case "COMPANY": return Building
    case "ADMIN": return Shield
    case "SUPER_ADMIN": return Crown
    default: return Lock
  }
}

export function AccessModule() {
  const [routes, setRoutes] = useState<RouteGate[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [filterGate, setFilterGate] = useState<string>("all")

  const fetchRoutes = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/access")
      if (res.ok) {
        const data = await res.json()
        setRoutes(data.routes || [])
      }
    } catch {
      toast.error("Failed to load routes")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchRoutes() }, [])

  const updateGate = async (path: string, newGate: string) => {
    setActionLoading(path)
    try {
      const res = await fetch("/api/dashboard/access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, gate: newGate }),
      })
      if (res.ok) {
        setRoutes((prev) => prev.map((r) =>
          r.path === path ? { ...r, currentGate: newGate, isOverridden: newGate !== r.defaultGate, overriddenAt: newGate !== r.defaultGate ? new Date().toISOString() : undefined } : r
        ))
        toast.success(`Gate updated for ${path}`)
      } else {
        toast.error("Failed to update gate")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
    }
  }

  const resetGate = async (path: string) => {
    const route = routes.find((r) => r.path === path)
    if (route) {
      await updateGate(path, route.defaultGate)
    }
  }

  const resetAll = async () => {
    setActionLoading("all")
    try {
      const res = await fetch("/api/dashboard/access", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetAll: true }),
      })
      if (res.ok) {
        setRoutes((prev) => prev.map((r) => ({ ...r, currentGate: r.defaultGate, isOverridden: false })))
        toast.success("All gates reset to defaults")
      } else {
        toast.error("Failed to reset gates")
      }
    } catch {
      toast.error("Network error")
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = routes
    .filter((r) => {
      if (filterGate !== "all" && r.currentGate !== filterGate) return false
      if (search && !r.path.toLowerCase().includes(search.toLowerCase()) && !r.description.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })

  const overriddenCount = routes.filter((r) => r.isOverridden).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Access Gate Management</h2>
          <p className="text-slate-400 text-sm">
            {routes.length} routes · {overriddenCount} overridden
          </p>
        </div>
        <div className="flex gap-2">
          {overriddenCount > 0 && (
            <button
              onClick={resetAll}
              disabled={actionLoading === "all"}
              className="flex items-center gap-2 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg text-sm transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reset All
            </button>
          )}
          <button
            onClick={fetchRoutes}
            className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search routes..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={filterGate}
          onChange={(e) => setFilterGate(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">All Gates</option>
          {GATE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      {/* Route List */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((route) => {
            const Icon = gateIcon(route.currentGate)
            return (
              <Card key={route.path} className={cn(
                "bg-slate-800/50 border-slate-700",
                route.isOverridden && "border-amber-500/30"
              )}>
                <CardContent className="py-2.5 px-4">
                  <div className="flex items-center gap-3">
                    <Icon className={cn("w-4 h-4 flex-shrink-0", gateColor(route.currentGate).split(" ")[1])} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <code className="text-white text-sm font-mono">{route.path}</code>
                        {route.isOverridden && (
                          <Badge className="bg-amber-500/20 text-amber-400 text-xs">OVERRIDDEN</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">{route.description}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <select
                        value={route.currentGate}
                        onChange={(e) => updateGate(route.path, e.target.value)}
                        disabled={actionLoading === route.path}
                        className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-300 focus:outline-none"
                      >
                        {GATE_LEVELS.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                      {route.isOverridden && (
                        <button
                          onClick={() => resetGate(route.path)}
                          disabled={actionLoading === route.path}
                          className="p-1 text-amber-400 hover:bg-amber-500/20 rounded"
                          title="Reset to default"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
          {filtered.length === 0 && (
            <div className="text-center py-8 text-slate-500">No routes match your filter</div>
          )}
        </div>
      )}
    </div>
  )
}
