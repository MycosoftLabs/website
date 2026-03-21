"use client"

import React, { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Database, Loader2, RefreshCw, CheckCircle, XCircle, HardDrive
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface DatabaseInfo {
  name: string
  type: string
  host: string
  port: number
  sizeGb: number
  tables: number
  records: number
  status: "online" | "offline" | "syncing"
  description: string
}

export function DatabaseModule() {
  const [databases, setDatabases] = useState<DatabaseInfo[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDatabases = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/dashboard/overview")
      if (res.ok) {
        const data = await res.json()
        setDatabases(data.databaseDetails || [])
      }
    } catch {
      toast.error("Failed to load database info")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchDatabases() }, [])

  const statusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-green-500/20 text-green-400"
      case "offline": return "bg-red-500/20 text-red-400"
      case "syncing": return "bg-amber-500/20 text-amber-400"
      default: return "bg-slate-700 text-slate-400"
    }
  }

  const totalSize = databases.reduce((sum, db) => sum + db.sizeGb, 0)
  const onlineCount = databases.filter((db) => db.status === "online").length

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
          <h2 className="text-2xl font-bold text-white">Database Monitoring</h2>
          <p className="text-slate-400 text-sm">{onlineCount} of {databases.length} online · {totalSize.toFixed(1)} GB total</p>
        </div>
        <button
          onClick={fetchDatabases}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm transition-colors"
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          Refresh
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4 text-center">
            <HardDrive className="w-6 h-6 text-blue-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{totalSize.toFixed(1)} GB</div>
            <div className="text-xs text-slate-500">Total Size</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10 border-green-500/30">
          <CardContent className="py-4 text-center">
            <CheckCircle className="w-6 h-6 text-green-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-400">{onlineCount}</div>
            <div className="text-xs text-slate-400">Online</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="py-4 text-center">
            <Database className="w-6 h-6 text-slate-400 mx-auto mb-1" />
            <div className="text-2xl font-bold text-white">{databases.length}</div>
            <div className="text-xs text-slate-500">Total Databases</div>
          </CardContent>
        </Card>
      </div>

      {/* Database List */}
      <div className="space-y-2">
        {databases.map((db) => (
          <Card key={db.name} className="bg-slate-800/50 border-slate-700">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                  db.status === "online" ? "bg-green-500/20" : "bg-slate-800"
                )}>
                  <Database className={cn("w-5 h-5", db.status === "online" ? "text-green-400" : "text-slate-500")} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-medium text-sm">{db.name}</span>
                    <Badge className={cn("text-xs", statusColor(db.status))}>{db.status.toUpperCase()}</Badge>
                    <span className="text-xs text-slate-600">{db.type}</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {db.host}:{db.port} · {db.sizeGb} GB · {db.tables} tables · {db.records.toLocaleString()} records
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">{db.description}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {databases.length === 0 && (
          <div className="text-center py-8 text-slate-500">No database information available</div>
        )}
      </div>
    </div>
  )
}
