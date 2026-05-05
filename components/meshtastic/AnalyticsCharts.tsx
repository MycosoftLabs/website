"use client"

import { useEffect, useState } from "react"

import type { MeshtasticStatsResponse } from "@/lib/meshtastic/types"

export function AnalyticsCharts() {
  const [stats, setStats] = useState<MeshtasticStatsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch("/api/meshtastic/stats", { cache: "no-store" })
        const body = (await res.json()) as MeshtasticStatsResponse & { error?: string }
        if (!res.ok) {
          setError(body.error || `http_${res.status}`)
          return
        }
        if (!cancelled) setStats(body)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch_failed")
      }
    }
    void load()
    const t = setInterval(load, 20_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  if (error) {
    return <p className="text-sm text-amber-500">{error}</p>
  }

  const cards: { label: string; value: string | number }[] = stats
    ? [
        { label: "Nodes", value: stats.node_count },
        { label: "Packets (1 min)", value: stats.packets_last_1m },
        { label: "Packets (60 min)", value: stats.packets_last_60m },
        { label: "Observers online", value: stats.observers_online },
      ]
    : [
        { label: "Nodes", value: "…" },
        { label: "Packets (1 min)", value: "…" },
        { label: "Packets (60 min)", value: "…" },
        { label: "Observers online", value: "…" },
      ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="rounded-xl border border-border/80 bg-background/80 p-4 md:p-5"
        >
          <p className="text-sm text-muted-foreground">{c.label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums">{c.value}</p>
        </div>
      ))}
    </div>
  )
}
