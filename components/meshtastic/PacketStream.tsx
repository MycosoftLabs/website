"use client"

import { Fragment, useCallback, useEffect, useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { MeshtasticPacketRow, MeshtasticPacketsResponse } from "@/lib/meshtastic/types"

const MAX_PAYLOAD_PREVIEW = 4000

function payloadPreview(payload: Record<string, unknown> | null | undefined): string {
  if (!payload || typeof payload !== "object") return ""
  try {
    const s = JSON.stringify(payload, null, 2)
    return s.length > MAX_PAYLOAD_PREVIEW ? `${s.slice(0, MAX_PAYLOAD_PREVIEW)}\n…` : s
  } catch {
    return ""
  }
}

export function PacketStream() {
  const [rows, setRows] = useState<MeshtasticPacketRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [channelFilter, setChannelFilter] = useState<string>("__all__")
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/meshtastic/packets?limit=300&offset=0", { cache: "no-store" })
      const body = (await res.json()) as MeshtasticPacketsResponse & { error?: string }
      if (!res.ok) {
        setError(body.error || `http_${res.status}`)
        return
      }
      setError(null)
      setRows(body.items ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "fetch_failed")
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      await load()
    }
    void run()
    const t = setInterval(() => {
      if (!cancelled) void load()
    }, 25_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [load])

  const channelOptions = useMemo(() => {
    const s = new Set<string>()
    for (const r of rows) {
      const ch = (r.channel ?? "").trim() || "(none)"
      s.add(ch)
    }
    return ["__all__", ...[...s].sort((a, b) => a.localeCompare(b))]
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (channelFilter !== "__all__") {
        const ch = (r.channel ?? "").trim() || "(none)"
        if (ch !== channelFilter) return false
      }
      if (!q) return true
      const hay = [
        r.from_node_id,
        r.to_node_id,
        r.gateway_node_id,
        r.port_num,
        r.channel,
        r.topic,
        r.payload_text,
        r.packet_uid,
      ]
        .map((x) => (x == null ? "" : String(x).toLowerCase()))
        .join(" ")
      return hay.includes(q)
    })
  }, [rows, search, channelFilter])

  if (error && rows.length === 0) {
    return <p className="text-sm text-amber-500">{error}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1 sm:max-w-md">
          <label htmlFor="mesh-packet-search" className="text-sm font-medium">
            Search (from / to / channel / port / text / topic)
          </label>
          <Input
            id="mesh-packet-search"
            type="search"
            className="text-base"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter loaded rows…"
            autoComplete="off"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor="mesh-packet-channel" className="text-sm font-medium">
            Channel
          </label>
          <select
            id="mesh-packet-channel"
            className="h-12 min-h-[44px] rounded-md border border-input bg-background px-3 text-base"
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
          >
            {channelOptions.map((c) => (
              <option key={c} value={c}>
                {c === "__all__" ? "All channels" : c}
              </option>
            ))}
          </select>
        </div>
        <Button type="button" variant="secondary" className="min-h-[44px] touch-manipulation" onClick={() => void load()}>
          Refresh
        </Button>
      </div>
      {error ? (
        <p className="text-sm text-amber-600" role="alert">
          {error} (showing cached rows if any)
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        Showing {filtered.length} of {rows.length} loaded packets (MINDEX via MAS). Expand a row for decoded text and JSON
        payload.
      </p>

      <div className="overflow-x-auto rounded-xl border border-border/80">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="border-b bg-muted/40">
            <tr>
              <th className="p-3 font-medium w-10" aria-label="expand" />
              <th className="p-3 font-medium">Time</th>
              <th className="p-3 font-medium">Channel</th>
              <th className="p-3 font-medium">From</th>
              <th className="p-3 font-medium">To</th>
              <th className="p-3 font-medium">Port</th>
              <th className="p-3 font-medium">Text</th>
              <th className="p-3 font-medium">RSSI</th>
              <th className="p-3 font-medium">SNR</th>
              <th className="p-3 font-medium">Hops</th>
              <th className="p-3 font-medium">MQTT</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="p-6 text-muted-foreground">
                  No packets match filters, or MINDEX has no rows yet.
                </td>
              </tr>
            ) : (
              filtered.map((r) => {
                const rowKey = r.id || r.packet_uid || `${r.rx_time}-${r.from_node_id}-${r.port_num}`
                const open = expandedId === rowKey
                const hops =
                  r.hop_limit != null && r.hop_start != null
                    ? `${r.hop_start}/${r.hop_limit}`
                    : r.hop_limit != null
                      ? String(r.hop_limit)
                      : "—"
                const textShort =
                  r.payload_text && r.payload_text.length > 120 ? `${r.payload_text.slice(0, 120)}…` : r.payload_text || "—"
                return (
                  <Fragment key={rowKey}>
                    <tr className="border-b border-border/40 last:border-0">
                      <td className="p-2 align-top">
                        <button
                          type="button"
                          className="min-h-[44px] min-w-[44px] rounded-md border border-border/60 text-base touch-manipulation"
                          aria-expanded={open}
                          onClick={() => setExpandedId(open ? null : rowKey)}
                        >
                          {open ? "−" : "+"}
                        </button>
                      </td>
                      <td className="p-3 font-mono text-xs text-muted-foreground align-top">{r.rx_time || "—"}</td>
                      <td className="p-3 font-mono text-xs align-top">{(r.channel ?? "").trim() || "—"}</td>
                      <td className="p-3 font-mono text-xs align-top">{r.from_node_id || "—"}</td>
                      <td className="p-3 font-mono text-xs align-top">{r.to_node_id || "—"}</td>
                      <td className="p-3 align-top">{r.port_num || "—"}</td>
                      <td className="p-3 max-w-[280px] align-top text-xs break-words">{textShort}</td>
                      <td className="p-3 font-mono text-xs align-top">{r.rx_rssi ?? "—"}</td>
                      <td className="p-3 font-mono text-xs align-top">{r.rx_snr ?? "—"}</td>
                      <td className="p-3 font-mono text-xs align-top">{hops}</td>
                      <td className="p-3 align-top">{r.via_mqtt === true ? "yes" : r.via_mqtt === false ? "no" : "—"}</td>
                    </tr>
                    {open ? (
                      <tr className="border-b border-border/40 bg-muted/15">
                        <td colSpan={11} className="p-4">
                          <div className="space-y-2 text-xs">
                            <div>
                              <span className="font-semibold">Topic:</span>{" "}
                              <span className="font-mono break-all">{r.topic || "—"}</span>
                            </div>
                            <div>
                              <span className="font-semibold">Want ACK:</span>{" "}
                              {r.want_ack === true ? "yes" : r.want_ack === false ? "no" : "—"}
                            </div>
                            <div>
                              <span className="font-semibold">payload_text</span>
                              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2">
                                {r.payload_text || "—"}
                              </pre>
                            </div>
                            <div>
                              <span className="font-semibold">payload (JSON)</span>
                              <pre className="mt-1 max-h-64 overflow-auto rounded-md bg-muted/40 p-2 font-mono">
                                {payloadPreview(r.payload ?? undefined) || "—"}
                              </pre>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
