"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Key, Loader2, RefreshCw, Copy, Eye, EyeOff,
  CheckCircle, AlertTriangle, XCircle, RotateCcw, Search
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface APIKeyInfo {
  name: string
  key: string
  category: string
  status: "configured" | "pending" | "missing"
  lastUsed?: string
  masked: boolean
}

export function APIKeysModule() {
  const [keys, setKeys] = useState<APIKeyInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")

  const fetchKeys = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/api-keys")
      if (res.ok) {
        const data = await res.json()
        setKeys(data.keys || [])
      }
    } catch {
      toast.error("Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchKeys() }, [])

  const copyKey = (key: string, name: string) => {
    navigator.clipboard.writeText(key)
    toast.success(`${name} key copied`)
  }

  const toggleVisibility = (name: string) => {
    setVisibleKeys((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "configured": return <CheckCircle className="w-4 h-4 text-green-400" />
      case "pending": return <AlertTriangle className="w-4 h-4 text-amber-400" />
      case "missing": return <XCircle className="w-4 h-4 text-red-400" />
      default: return null
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "configured": return "bg-green-500/20 text-green-400"
      case "pending": return "bg-amber-500/20 text-amber-400"
      case "missing": return "bg-red-500/20 text-red-400"
      default: return "bg-slate-700 text-slate-400"
    }
  }

  const categories = Array.from(new Set(keys.map((k) => k.category)))

  const filtered = keys
    .filter((k) => filterCategory === "all" || k.category === filterCategory)
    .filter((k) => {
      if (!search) return true
      return k.name.toLowerCase().includes(search.toLowerCase())
    })

  const counts = {
    configured: keys.filter((k) => k.status === "configured").length,
    pending: keys.filter((k) => k.status === "pending").length,
    missing: keys.filter((k) => k.status === "missing").length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">API Keys</h2>
          <p className="text-slate-400 text-sm">
            {counts.configured} configured, {counts.pending} pending, {counts.missing} missing
          </p>
        </div>
        <button
          onClick={fetchKeys}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-green-400">{counts.configured}</div>
            <div className="text-xs text-slate-400">Configured</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/30">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-amber-400">{counts.pending}</div>
            <div className="text-xs text-slate-400">Pending</div>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="py-3 text-center">
            <div className="text-2xl font-bold text-red-400">{counts.missing}</div>
            <div className="text-xs text-slate-400">Missing</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search keys..."
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-300 focus:outline-none"
        >
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Key List */}
      <div className="space-y-1">
        {filtered.map((keyInfo) => (
          <Card key={keyInfo.name} className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-2.5 px-4">
              <div className="flex items-center gap-3">
                {statusIcon(keyInfo.status)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{keyInfo.name}</span>
                    <Badge className={cn("text-xs", statusColor(keyInfo.status))}>{keyInfo.status.toUpperCase()}</Badge>
                    <span className="text-xs text-slate-600">{keyInfo.category}</span>
                  </div>
                  {keyInfo.status === "configured" && (
                    <div className="text-xs font-mono text-slate-500 mt-0.5">
                      {visibleKeys.has(keyInfo.name) ? keyInfo.key : "••••••••••••••••"}
                    </div>
                  )}
                </div>
                {keyInfo.status === "configured" && (
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => toggleVisibility(keyInfo.name)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title={visibleKeys.has(keyInfo.name) ? "Hide" : "Show"}
                    >
                      {visibleKeys.has(keyInfo.name) ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyKey(keyInfo.key, keyInfo.name)}
                      className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-slate-500">No keys match your filter</div>
        )}
      </div>
    </div>
  )
}
