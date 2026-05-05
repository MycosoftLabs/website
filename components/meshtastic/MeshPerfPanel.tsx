"use client"

import { useEffect, useMemo, useState } from "react"

import { useMeshtasticStream } from "@/hooks/use-meshtastic-stream"
import type { MeshtasticStatsResponse, MeshtasticStreamPacket } from "@/lib/meshtastic/types"

function countRecent(packets: MeshtasticStreamPacket[], windowMs: number): number {
  const cutoff = Date.now() - windowMs
  let n = 0
  for (const p of packets) {
    if (!p.rx_time) continue
    const t = Date.parse(p.rx_time)
    if (!Number.isNaN(t) && t >= cutoff) n += 1
  }
  return n
}

export function MeshPerfPanel() {
  const [stats, setStats] = useState<MeshtasticStatsResponse | null>(null)
  const [statsErr, setStatsErr] = useState<string | null>(null)
  const { connected, recentPackets, error } = useMeshtasticStream({ enabled: true, ringBufferSize: 400 })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/meshtastic/stats", { cache: "no-store" })
        const body = (await res.json()) as MeshtasticStatsResponse & { error?: string }
        if (!res.ok) {
          if (!cancelled) setStatsErr(body.error || `http_${res.status}`)
          return
        }
        if (!cancelled) {
          setStatsErr(null)
          setStats(body)
        }
      } catch (e) {
        if (!cancelled) setStatsErr(e instanceof Error ? e.message : "fetch_failed")
      }
    })()
    const id = setInterval(() => {
      void (async () => {
        try {
          const res = await fetch("/api/meshtastic/stats", { cache: "no-store" })
          const body = (await res.json()) as MeshtasticStatsResponse & { error?: string }
          if (res.ok && !cancelled) {
            setStatsErr(null)
            setStats(body)
          }
        } catch {
          /* ignore interval errors */
        }
      })()
    }, 15_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [])

  const in60s = useMemo(() => countRecent(recentPackets, 60_000), [recentPackets])
  const in10s = useMemo(() => countRecent(recentPackets, 10_000), [recentPackets])

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border border-border/70 bg-muted/15 p-4 md:p-5">
        <h2 className="text-base font-semibold">Server (MAS → MINDEX)</h2>
        {statsErr ? (
          <p className="mt-2 text-sm text-amber-600" role="alert">
            {statsErr}
          </p>
        ) : null}
        {stats ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Registered nodes</dt>
              <dd className="font-mono">{stats.node_count}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Packets last 1 minute</dt>
              <dd className="font-mono">{stats.packets_last_1m}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Packets last 60 minutes</dt>
              <dd className="font-mono">{stats.packets_last_60m}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Observers online</dt>
              <dd className="font-mono">{stats.observers_online}</dd>
            </div>
          </dl>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">{statsErr ? null : "Loading…"}</p>
        )}
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/15 p-4 md:p-5">
        <h2 className="text-base font-semibold">Browser SSE buffer</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Rolling 400-packet window from <code className="text-xs">/api/meshtastic/stream</code>. Counts use{" "}
          <code className="text-xs">rx_time</code> when present.
        </p>
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">EventSource</dt>
            <dd className="font-mono">{connected ? "open" : "disconnected"}</dd>
          </div>
          {error ? (
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Last issue</dt>
              <dd className="font-mono text-amber-600">{error}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Buffered packets</dt>
            <dd className="font-mono">{recentPackets.length}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">With rx_time in last 10s</dt>
            <dd className="font-mono">{in10s}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">With rx_time in last 60s</dt>
            <dd className="font-mono">{in60s}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
