"use client"

import { useEffect, useState } from "react"

import type { MeshtasticObserverRow, MeshtasticObserversResponse } from "@/lib/meshtastic/types"

export function ObserverGrid() {
  const [rows, setRows] = useState<MeshtasticObserverRow[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/meshtastic/observers", { cache: "no-store" })
        const body = (await res.json()) as MeshtasticObserversResponse & { error?: string }
        if (!res.ok) {
          setError(body.error || `http_${res.status}`)
          return
        }
        if (!cancelled) setRows(body.items ?? [])
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "fetch_failed")
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (error) {
    return <p className="text-sm text-amber-500">{error}</p>
  }

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {rows.length === 0 ? (
        <li className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
          No observers registered.
        </li>
      ) : (
        rows.map((o) => (
          <li
            key={o.observer_id}
            className="flex min-h-[44px] flex-col justify-center rounded-xl border border-border/80 bg-muted/20 p-4"
          >
            <span className="font-mono text-xs text-cyan-200">{o.observer_id}</span>
            <span className="mt-1 text-sm">
              {o.gateway_kind || "gateway"} · {o.region || "region ?"}
            </span>
            <span className="mt-2 text-xs text-muted-foreground">
              online {o.online === true ? "yes" : o.online === false ? "no" : "?"} · pkts/min{" "}
              {o.pkts_per_min ?? "—"}
            </span>
            <span className="mt-1 font-mono text-xs text-muted-foreground">
              {o.lat != null && o.lon != null && Number.isFinite(Number(o.lat)) && Number.isFinite(Number(o.lon))
                ? `${Number(o.lat).toFixed(4)}, ${Number(o.lon).toFixed(4)}`
                : "no position"}
            </span>
          </li>
        ))
      )}
    </ul>
  )
}
