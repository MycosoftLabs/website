"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import type { MeshtasticStatsResponse } from "@/lib/meshtastic/types"
import { cn } from "@/lib/utils"

const LINKS: { href: string; title: string; body: string }[] = [
  { href: "/natureos/meshtastic/live", title: "Live", body: "Map-first SSE buffer, overlays, legend, packet strip." },
  { href: "/natureos/meshtastic/map", title: "Map", body: "Static node map (MINDEX last known positions)." },
  { href: "/natureos/meshtastic/packets", title: "Packets", body: "Paged history from MINDEX via MAS." },
  { href: "/natureos/meshtastic/channels", title: "Channels", body: "Distinct mesh channels seen in recent traffic." },
  { href: "/natureos/meshtastic/nodes", title: "Nodes", body: "Fleet table + roles." },
  { href: "/natureos/meshtastic/tools", title: "Tools", body: "Favorites list, CREP handoff, health checks." },
  { href: "/natureos/meshtastic/observers", title: "Observers", body: "Gateways and decode throughput." },
  { href: "/natureos/meshtastic/analytics", title: "Analytics", body: "Charts from MAS stats + history." },
  { href: "/natureos/meshtastic/perf", title: "Perf", body: "Bridge + browser buffer health." },
  { href: "/natureos/meshtastic/audio-lab", title: "Audio lab", body: "Tone.js cues, mute, calibration." },
]

export function MeshHub() {
  const [stats, setStats] = useState<MeshtasticStatsResponse | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/meshtastic/stats", { cache: "no-store" })
        const body = (await res.json()) as MeshtasticStatsResponse & { error?: string }
        if (!res.ok) {
          if (!cancelled) setErr(body.error || `http_${res.status}`)
          return
        }
        if (!cancelled) {
          setErr(null)
          setStats(body)
        }
      } catch (e) {
        if (!cancelled) setErr(e instanceof Error ? e.message : "fetch_failed")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-4 md:p-6">
        <h2 className="text-base font-semibold md:text-lg">Fleet snapshot</h2>
        {err ? (
          <p className="mt-2 text-sm text-amber-600" role="alert">
            {err}
          </p>
        ) : null}
        {stats ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Nodes</dt>
              <dd className="font-mono text-lg">{stats.node_count}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Packets / 1m</dt>
              <dd className="font-mono text-lg">{stats.packets_last_1m}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Packets / 60m</dt>
              <dd className="font-mono text-lg">{stats.packets_last_60m}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Observers online</dt>
              <dd className="font-mono text-lg">{stats.observers_online}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{err ? null : "Loading stats…"}</p>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "min-h-[44px] rounded-lg border border-border/70 bg-background/80 p-4 transition-colors",
              "hover:border-cyan-500/40 hover:bg-muted/40 touch-manipulation"
            )}
          >
            <div className="text-base font-semibold">{l.title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{l.body}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
