"use client"

import { useCallback, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { MeshtasticStatsResponse } from "@/lib/meshtastic/types"

const LS_FAV_IDS = "meshFavoriteNodeIds"

function parseIds(raw: string): string[] {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function MeshToolsPanel() {
  const [text, setText] = useState("")
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState<MeshtasticStatsResponse | null>(null)
  const [statsErr, setStatsErr] = useState<string | null>(null)

  useEffect(() => {
    try {
      const cur = window.localStorage.getItem(LS_FAV_IDS)
      if (cur) {
        const arr = JSON.parse(cur) as unknown
        if (Array.isArray(arr)) setText(arr.filter((x): x is string => typeof x === "string").join("\n"))
      }
    } catch {
      /* ignore */
    }
  }, [])

  const saveFavorites = useCallback(() => {
    const ids = parseIds(text)
    try {
      window.localStorage.setItem(LS_FAV_IDS, JSON.stringify(ids))
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      /* ignore */
    }
  }, [text])

  const pingStats = useCallback(async () => {
    setStatsErr(null)
    try {
      const res = await fetch("/api/meshtastic/stats", { cache: "no-store" })
      const body = (await res.json()) as MeshtasticStatsResponse & { error?: string }
      if (!res.ok) {
        setStatsErr(body.error || `http_${res.status}`)
        setStats(null)
        return
      }
      setStats(body)
    } catch (e) {
      setStatsErr(e instanceof Error ? e.message : "fetch_failed")
      setStats(null)
    }
  }, [])

  useEffect(() => {
    void pingStats()
  }, [pingStats])

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border/70 bg-muted/15 p-4 md:p-5">
        <h2 className="text-base font-semibold">Favorite node IDs</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          One per line or comma-separated. Used by Live → “Favorites only” when at least one id is saved.
        </p>
        <Label htmlFor="fav-ids" className="mt-4 block text-sm text-muted-foreground">
          Node ids
        </Label>
        <textarea
          id="fav-ids"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={8}
          className="mt-2 w-full resize-y rounded-md border border-input bg-background p-3 font-mono text-base leading-relaxed"
          placeholder="!abcdef&#10;!123456"
        />
        <Button type="button" className="mt-3 min-h-[44px] w-full touch-manipulation sm:w-auto" onClick={saveFavorites}>
          Save to browser
        </Button>
        {saved ? <p className="mt-2 text-sm text-emerald-600">Saved. Open Live to apply.</p> : null}
      </div>

      <div className="rounded-xl border border-border/70 bg-muted/15 p-4 md:p-5">
        <h2 className="text-base font-semibold">MAS bridge health</h2>
        <p className="mt-1 text-sm text-muted-foreground">Latest `/api/meshtastic/stats` via same-origin proxy.</p>
        {statsErr ? (
          <p className="mt-3 text-sm text-amber-600" role="alert">
            {statsErr}
          </p>
        ) : null}
        {stats ? (
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Nodes</dt>
              <dd className="font-mono">{stats.node_count}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Packets / 1m</dt>
              <dd className="font-mono">{stats.packets_last_1m}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Packets / 60m</dt>
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
        <Button type="button" variant="outline" className="mt-4 min-h-[44px] touch-manipulation" onClick={() => void pingStats()}>
          Refresh stats
        </Button>
      </div>
    </div>
  )
}
