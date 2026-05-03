"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"

interface Ping {
  ok: boolean
  status: number
  error?: string
  urlConfigured?: boolean
}

interface HealthPayload {
  mas: Ping
  mindex: Ping
  natureos: Ping
  checkedAt?: string
}

export function ToolsHubHealthStrip() {
  const [data, setData] = useState<HealthPayload | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/natureos/tools-hub/health", { cache: "no-store" })
        const json = (await res.json()) as HealthPayload
        if (!cancelled) setData(json)
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "health_fetch_failed")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  function badge(row: Ping, label: string) {
    const configured = row.urlConfigured !== false
    if (!configured) {
      return (
        <Badge key={label} variant="outline">
          {label}: not configured
        </Badge>
      )
    }
    if (row.status === 0) {
      return (
        <Badge key={label} variant="destructive">
          {label}: unreachable
        </Badge>
      )
    }
    return (
      <Badge key={label} variant={row.ok ? "default" : "destructive"}>
        {label}: HTTP {row.status}
      </Badge>
    )
  }

  return (
    <div className="rounded-lg border border-border/70 bg-muted/30 px-4 py-3 space-y-2">
      <p className="text-sm font-medium text-foreground">Live platform health</p>
      <p className="text-sm text-muted-foreground">
        Pulled from env-configured MAS, MINDEX, and NatureOS base URLs — no synthetic OK states.
      </p>
      {err ? <p className="text-sm text-destructive">{err}</p> : null}
      {data ? (
        <div className="flex flex-wrap gap-2 items-center">
          {badge(data.mas, "MAS")}
          {badge(data.mindex, "MINDEX")}
          {badge(data.natureos, "NatureOS")}
          {data.checkedAt ? (
            <span className="text-xs text-muted-foreground ml-auto">Checked {data.checkedAt}</span>
          ) : null}
        </div>
      ) : !err ? (
        <p className="text-sm text-muted-foreground">Loading health…</p>
      ) : null}
    </div>
  )
}
