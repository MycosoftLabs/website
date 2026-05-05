"use client"

import { useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import type { MeshtasticPacketRow, MeshtasticPacketsResponse } from "@/lib/meshtastic/types"

interface ChannelAgg {
  channel: string
  count: number
  lastRx: string | null
}

function aggregate(rows: MeshtasticPacketRow[]): ChannelAgg[] {
  const m = new Map<string, { count: number; last: string | null }>()
  for (const r of rows) {
    const ch = (r.channel ?? "").trim() || "(none)"
    const cur = m.get(ch) ?? { count: 0, last: null as string | null }
    cur.count += 1
    const t = r.rx_time ?? null
    if (t && (!cur.last || t > cur.last)) cur.last = t
    m.set(ch, cur)
  }
  return [...m.entries()]
    .map(([channel, v]) => ({ channel, count: v.count, lastRx: v.last }))
    .sort((a, b) => b.count - a.count)
}

export function ChannelRoster() {
  const [rows, setRows] = useState<MeshtasticPacketRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/meshtastic/packets?limit=800&offset=0", { cache: "no-store" })
      const body = (await res.json()) as MeshtasticPacketsResponse & { error?: string }
      if (!res.ok) {
        setError(body.error || `http_${res.status}`)
        setRows([])
        return
      }
      setRows(body.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch_failed")
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const agg = aggregate(rows)

  const messagesForChannel = useMemo(() => {
    if (!selectedChannel) return []
    return rows
      .filter((r) => {
        const ch = (r.channel ?? "").trim() || "(none)"
        return ch === selectedChannel
      })
      .sort((a, b) => {
        const ta = a.rx_time ?? ""
        const tb = b.rx_time ?? ""
        return tb.localeCompare(ta)
      })
      .slice(0, 150)
  }, [rows, selectedChannel])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" className="min-h-[44px] touch-manipulation" onClick={() => void load()}>
          Refresh
        </Button>
        {loading ? <span className="text-sm text-muted-foreground">Loading…</span> : null}
        {error ? (
          <span className="text-sm text-amber-600" role="alert">
            {error}
          </span>
        ) : null}
      </div>

      {agg.length === 0 && !loading && !error ? (
        <p className="text-sm text-muted-foreground">No packets yet — channel roster will populate when ingest is live.</p>
      ) : null}

      <div>
        <h3 className="mb-2 text-sm font-semibold">Channels (from recent packet sample)</h3>
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <table className="min-w-[520px] w-full text-sm">
            <thead className="border-b bg-muted/40 text-left">
              <tr>
                <th className="p-3 font-medium">Channel</th>
                <th className="p-3 font-medium">Packets (sample)</th>
                <th className="p-3 font-medium">Last rx (UTC)</th>
              </tr>
            </thead>
            <tbody>
              {agg.map((a) => {
                const sel = selectedChannel === a.channel
                return (
                  <tr
                    key={a.channel}
                    className={`border-b border-border/40 last:border-0 ${sel ? "bg-cyan-500/10" : ""}`}
                  >
                    <td className="p-2">
                      <button
                        type="button"
                        className="min-h-[44px] w-full rounded-md px-2 py-2 text-left font-mono text-xs touch-manipulation hover:bg-muted/50"
                        onClick={() => setSelectedChannel(sel ? null : a.channel)}
                      >
                        {a.channel}
                        <span className="ml-2 text-muted-foreground">{sel ? "(tap to clear)" : "(tap for messages)"}</span>
                      </button>
                    </td>
                    <td className="p-3 font-mono">{a.count}</td>
                    <td className="p-3 font-mono text-xs text-muted-foreground">{a.lastRx ?? "—"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {selectedChannel ? (
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Messages — <span className="font-mono">{selectedChannel}</span>
          </h3>
          <p className="mb-2 text-xs text-muted-foreground">
            Newest first (up to 150 rows from the same loaded batch). Only real fields from MINDEX; empty text means no decoded
            line for that packet.
          </p>
          <div className="overflow-x-auto rounded-lg border border-border/70">
            <table className="min-w-[720px] w-full text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="p-3 font-medium">Time</th>
                  <th className="p-3 font-medium">From</th>
                  <th className="p-3 font-medium">Port</th>
                  <th className="p-3 font-medium">payload_text</th>
                  <th className="p-3 font-medium">RSSI</th>
                </tr>
              </thead>
              <tbody>
                {messagesForChannel.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-4 text-muted-foreground">
                      No rows for this channel in the current sample.
                    </td>
                  </tr>
                ) : (
                  messagesForChannel.map((r) => (
                    <tr key={r.id || r.packet_uid || `${r.rx_time}-${r.from_node_id}`} className="border-b border-border/40 last:border-0">
                      <td className="p-3 font-mono text-xs text-muted-foreground">{r.rx_time || "—"}</td>
                      <td className="p-3 font-mono text-xs">{r.from_node_id || "—"}</td>
                      <td className="p-3">{r.port_num || "—"}</td>
                      <td className="p-3 max-w-md break-words text-xs">{r.payload_text || "—"}</td>
                      <td className="p-3 font-mono text-xs">{r.rx_rssi ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Select a channel row to list recent decoded text lines for that channel.</p>
      )}
    </div>
  )
}
