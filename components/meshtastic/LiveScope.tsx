"use client"

import type { FeatureCollection } from "geojson"
import { useCallback, useEffect, useMemo, useState } from "react"
import { usePathname } from "next/navigation"

import { MeshMap } from "@/components/meshtastic/MeshMap"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useMeshtasticNodes } from "@/hooks/use-meshtastic-nodes"
import { useMeshtasticStream } from "@/hooks/use-meshtastic-stream"
import {
  filterPacketsByScopeHours,
  packetsToLinkGeoJson,
  streamPacketsToSignalGeoJson,
} from "@/lib/meshtastic/signal-geo"
import { playMeshPacketSequence, playMeshPacketTone } from "@/lib/meshtastic/sonify"
import type { MeshtasticNodeRow, MeshtasticStreamPacket } from "@/lib/meshtastic/types"
import { cn } from "@/lib/utils"

const LS_HEAT = "meshLiveHeat"
const LS_GHOST = "meshLiveGhost"
const LS_LIGHT = "meshLiveLightMap"
const LS_HASH = "meshLiveColorHash"
const LS_AUDIO = "meshLiveAudio"
const LS_FAV_ONLY = "meshLiveFavoritesOnly"
const LS_FAV_IDS = "meshFavoriteNodeIds"
const LS_SCOPE = "meshLiveScopeHours"

function readLsBool(key: string, fallback: boolean): boolean {
  if (typeof window === "undefined") return fallback
  try {
    const v = window.localStorage.getItem(key)
    if (v === null) return fallback
    return v === "1" || v === "true"
  } catch {
    return fallback
  }
}

function writeLsBool(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "1" : "0")
  } catch {
    /* ignore */
  }
}

function readFavorites(): string[] {
  if (typeof window === "undefined") return []
  try {
    const t = window.localStorage.getItem(LS_FAV_IDS)
    if (!t) return []
    const parsed = JSON.parse(t) as unknown
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : []
  } catch {
    return []
  }
}

function readScopeHours(): 1 | 6 | 12 | 24 {
  if (typeof window === "undefined") return 1
  try {
    const v = Number(window.localStorage.getItem(LS_SCOPE) ?? "1")
    if (v === 6 || v === 12 || v === 24) return v
    return 1
  } catch {
    return 1
  }
}

function packetChipLabel(p: MeshtasticStreamPacket): string {
  const port = (p.port_num ?? "?").toString().slice(0, 12)
  const from = (p.from_node_id ?? "?").toString().slice(0, 10)
  return `${port} · ${from}`
}

function formatNodeValue(v: unknown): string | null {
  if (v === null || v === undefined) return null
  if (typeof v === "object") return JSON.stringify(v)
  const s = String(v)
  return s.length ? s : null
}

export function LiveScope() {
  const pathname = usePathname()
  const [hydrated, setHydrated] = useState(false)
  const [heat, setHeat] = useState(false)
  const [ghosts, setGhosts] = useState(true)
  const [lightMap, setLightMap] = useState(false)
  const [colorHash, setColorHash] = useState(true)
  const [audioOn, setAudioOn] = useState(false)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [scopeHours, setScopeHours] = useState<1 | 6 | 12 | 24>(1)
  const [favoriteNodeIds, setFavoriteNodeIds] = useState<string[]>([])
  const [paused, setPaused] = useState(false)
  const { nodes: nodeOptions } = useMeshtasticNodes()
  const [filterNodeId, setFilterNodeId] = useState<string>("")
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  useEffect(() => {
    setHeat(readLsBool(LS_HEAT, false))
    setGhosts(readLsBool(LS_GHOST, true))
    setLightMap(readLsBool(LS_LIGHT, false))
    setColorHash(readLsBool(LS_HASH, true))
    setAudioOn(readLsBool(LS_AUDIO, false))
    setFavoritesOnly(readLsBool(LS_FAV_ONLY, false))
    setScopeHours(readScopeHours())
    setFavoriteNodeIds(readFavorites())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!pathname?.includes("/meshtastic")) return
    setFavoriteNodeIds(readFavorites())
  }, [pathname])

  const onPacketAudio = useCallback(
    (pkt: MeshtasticStreamPacket) => {
      if (!audioOn) return
      void playMeshPacketTone({
        rx_rssi: pkt.rx_rssi,
        port_num: pkt.port_num,
        payload_text: pkt.payload_text ?? null,
      })
    },
    [audioOn]
  )

  const { connected, recentPackets, error, clearRecentPackets } = useMeshtasticStream({
    enabled: !paused,
    ringBufferSize: 200,
    onPacket: onPacketAudio,
  })

  const scopedPackets = useMemo(
    () => filterPacketsByScopeHours(recentPackets, scopeHours),
    [recentPackets, scopeHours]
  )

  const signalGeoJson: FeatureCollection = useMemo(() => {
    if (!heat && !ghosts) return { type: "FeatureCollection", features: [] }
    return streamPacketsToSignalGeoJson(scopedPackets)
  }, [heat, ghosts, scopedPackets])

  const lastFlashSig = useMemo(() => {
    const last = scopedPackets[scopedPackets.length - 1]
    if (!last) return ""
    return `${last.packet_uid ?? ""}|${last.from_node_id ?? ""}|${last.to_node_id ?? ""}`
  }, [scopedPackets])

  const flashNodeIds = useMemo(() => {
    const last = scopedPackets[scopedPackets.length - 1]
    if (!last) return [] as string[]
    const out: string[] = []
    if (last.from_node_id) out.push(last.from_node_id)
    if (last.to_node_id) out.push(last.to_node_id)
    return out
  }, [scopedPackets.length, lastFlashSig])

  const linkGeoJson = useMemo(
    () => packetsToLinkGeoJson(scopedPackets, nodeOptions),
    [scopedPackets, nodeOptions]
  )

  const selectedRegistryNode = useMemo(
    () => (selectedNodeId ? nodeOptions.find((n) => n.node_id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodeOptions]
  )

  const selectedNodePackets = useMemo(() => {
    if (!selectedNodeId) return [] as MeshtasticStreamPacket[]
    return scopedPackets
      .filter((p) => p.from_node_id === selectedNodeId || p.to_node_id === selectedNodeId)
      .slice(-36)
  }, [scopedPackets, selectedNodeId])

  const feedPackets = useMemo(() => scopedPackets.slice(-24), [scopedPackets])

  const toggle = (key: "heat" | "ghosts" | "light" | "hash" | "audio" | "favOnly", next: boolean) => {
    if (key === "heat") {
      setHeat(next)
      writeLsBool(LS_HEAT, next)
    }
    if (key === "ghosts") {
      setGhosts(next)
      writeLsBool(LS_GHOST, next)
    }
    if (key === "light") {
      setLightMap(next)
      writeLsBool(LS_LIGHT, next)
    }
    if (key === "hash") {
      setColorHash(next)
      writeLsBool(LS_HASH, next)
    }
    if (key === "audio") {
      setAudioOn(next)
      writeLsBool(LS_AUDIO, next)
    }
    if (key === "favOnly") {
      setFavoritesOnly(next)
      writeLsBool(LS_FAV_ONLY, next)
    }
  }

  const setScope = (h: 1 | 6 | 12 | 24) => {
    setScopeHours(h)
    try {
      window.localStorage.setItem(LS_SCOPE, String(h))
    } catch {
      /* ignore */
    }
  }

  const filterId = filterNodeId.trim() || null
  const favEmpty = favoriteNodeIds.length === 0

  if (!hydrated) {
    return <div className="min-h-[480px] rounded-xl border border-border/60 bg-muted/20 p-8 text-sm text-muted-foreground">Loading live scope…</div>
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative h-[min(78vh,760px)] min-h-[480px] w-full overflow-hidden rounded-xl border border-cyan-500/25 bg-black/40 shadow-inner">
        <div className="absolute inset-0 z-0 flex flex-col p-1 sm:p-2">
          <MeshMap
            key={lightMap ? "map-light" : "map-dark"}
            className="flex min-h-0 flex-1 flex-col space-y-0"
            mapHeightClass="min-h-0 flex-1"
            showCaption={false}
            basemapKey={lightMap ? "light" : "dark"}
            filterNodeId={filterId}
            favoritesOnly={favoritesOnly && !favEmpty}
            favoriteNodeIds={favoriteNodeIds}
            colorByHash={colorHash}
            signalGeoJson={signalGeoJson}
            showHeatStyle={heat}
            showGhostStyle={ghosts}
            linkGeoJson={linkGeoJson}
            flashNodeIds={flashNodeIds}
            selectedNodeId={selectedNodeId}
            onNodeCircleClick={(id) => setSelectedNodeId((prev) => (prev === id ? null : id))}
          />
        </div>

        {selectedNodeId ? (
          <div
            className="pointer-events-auto absolute right-2 top-28 z-20 flex max-h-[min(62vh,520px)] w-[min(calc(100%-1rem),360px)] flex-col overflow-hidden rounded-xl border border-cyan-500/30 bg-background/95 shadow-xl backdrop-blur-md sm:top-32"
            role="dialog"
            aria-label="Selected node details"
          >
            <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border/60 px-3 py-3">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Node</h3>
                <p className="truncate font-mono text-xs text-muted-foreground" title={selectedNodeId}>
                  {selectedNodeId}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="min-h-[44px] shrink-0 touch-manipulation"
                onClick={() => setSelectedNodeId(null)}
              >
                Close
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 text-sm">
              {selectedRegistryNode ? (
                <dl className="grid gap-x-2 gap-y-2 text-xs sm:grid-cols-[minmax(0,7rem)_1fr]">
                  {(
                    [
                      ["Display", selectedRegistryNode.long_name || selectedRegistryNode.short_name],
                      ["Short name", selectedRegistryNode.short_name],
                      ["Long name", selectedRegistryNode.long_name],
                      ["Hardware", selectedRegistryNode.hw_model],
                      ["Role", selectedRegistryNode.role],
                      ["Region", selectedRegistryNode.region],
                      ["Lat", selectedRegistryNode.lat],
                      ["Lon", selectedRegistryNode.lon],
                      ["Last heard", selectedRegistryNode.last_heard_at],
                      ["Battery %", selectedRegistryNode.battery_pct],
                      ["Voltage", selectedRegistryNode.voltage],
                      ["Channel util", selectedRegistryNode.channel_util],
                      ["Air util TX", selectedRegistryNode.air_util_tx],
                      ["Firmware", selectedRegistryNode.firmware],
                      ["Modem preset", selectedRegistryNode.modem_preset],
                      ["Licensed", selectedRegistryNode.is_licensed],
                      ["Observer", selectedRegistryNode.is_observer],
                      ["Updated", selectedRegistryNode.updated_at],
                    ] as const
                  ).map(([label, raw]) => {
                    const val = formatNodeValue(raw)
                    if (!val) return null
                    return (
                      <div key={label} className="contents">
                        <dt className="text-muted-foreground">{label}</dt>
                        <dd className="break-words font-mono text-foreground">{val}</dd>
                      </div>
                    )
                  })}
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This node id appears in live traffic but is not in the nodes registry response yet (no row from
                  MINDEX / API). Details below are from the live buffer only.
                </p>
              )}
              <h4 className="mt-4 border-t border-border/60 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Packets in buffer ({scopeHours}h)
              </h4>
              {selectedNodePackets.length === 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">No packets involving this node in the current window.</p>
              ) : (
                <ul className="mt-2 space-y-2">
                  {[...selectedNodePackets].reverse().map((p, i) => (
                    <li
                      key={`${p.packet_uid ?? ""}-${p.rx_time ?? ""}-sel-${i}`}
                      className="rounded-md border border-border/50 bg-muted/30 p-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">{packetChipLabel(p)}</span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 min-h-0 shrink-0 px-2 text-xs touch-manipulation"
                          onClick={() => void playMeshPacketSequence(p, { maxNotes: 16 })}
                        >
                          Play
                        </Button>
                      </div>
                      {p.payload_text ? (
                        <p className="mt-1 line-clamp-3 whitespace-pre-wrap break-words text-[11px] text-foreground/90">
                          {p.payload_text}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-2 sm:p-3">
          <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-[min(100%,420px)] rounded-lg border border-border/60 bg-background/90 p-3 text-sm shadow-lg backdrop-blur-md">
              <p className="mb-2 font-medium text-foreground">Live controls</p>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-3">
                <div className="flex items-center gap-2">
                  <Checkbox id="m-heat" checked={heat} onCheckedChange={(v) => toggle("heat", v === true)} />
                  <Label htmlFor="m-heat" className="text-base font-normal sm:text-sm">
                    Heat
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="m-ghost" checked={ghosts} onCheckedChange={(v) => toggle("ghosts", v === true)} />
                  <Label htmlFor="m-ghost" className="text-base font-normal sm:text-sm">
                    Ghosts
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="m-light" checked={lightMap} onCheckedChange={(v) => toggle("light", v === true)} />
                  <Label htmlFor="m-light" className="text-base font-normal sm:text-sm">
                    Light basemap
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="m-hash" checked={colorHash} onCheckedChange={(v) => toggle("hash", v === true)} />
                  <Label htmlFor="m-hash" className="text-base font-normal sm:text-sm">
                    Color by id
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="m-audio" checked={audioOn} onCheckedChange={(v) => toggle("audio", v === true)} />
                  <Label htmlFor="m-audio" className="text-base font-normal sm:text-sm">
                    Audio cues
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="m-fav"
                    checked={favoritesOnly}
                    disabled={favEmpty}
                    onCheckedChange={(v) => toggle("favOnly", v === true)}
                  />
                  <Label htmlFor="m-fav" className={cn("text-base font-normal sm:text-sm", favEmpty && "opacity-50")}>
                    Favorites only
                  </Label>
                </div>
              </div>
              {favEmpty ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Set favorite node IDs under Meshtastic → Tools. Mute globally uses Audio lab /{" "}
                  <code className="text-xs">mycosoft_meshtastic_audio_mute</code>.
                </p>
              ) : null}
              <p className="mt-2 text-xs text-muted-foreground">
                Click a node on the map to open details (click again to clear).
              </p>
              <div className="mt-3 space-y-1">
                <Label htmlFor="m-node-filter" className="text-xs text-muted-foreground">
                  Filter map to one node
                </Label>
                <select
                  id="m-node-filter"
                  value={filterNodeId}
                  onChange={(e) => setFilterNodeId(e.target.value)}
                  className="mt-1 flex h-12 w-full rounded-md border border-input bg-background px-3 text-base shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-10 sm:text-sm"
                >
                  <option value="">All nodes</option>
                  {nodeOptions.map((n) => (
                    <option key={n.node_id} value={n.node_id}>
                      {(n.long_name || n.short_name || n.node_id).slice(0, 48)} ({n.node_id})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pointer-events-auto mt-2 flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-2 py-2 text-sm shadow-lg backdrop-blur-md sm:mt-0">
              <span className="px-1 font-mono text-xs text-muted-foreground">
                SSE {connected ? "live" : "off"}
              </span>
              {error ? <span className="text-xs text-amber-600">{error}</span> : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="min-h-[44px] touch-manipulation"
                disabled
                title="Archived timeline playback needs MINDEX packet positions — not wired yet."
              >
                Rewind
              </Button>
              <Button
                type="button"
                variant={paused ? "default" : "outline"}
                size="sm"
                className="min-h-[44px] touch-manipulation"
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="min-h-[44px] touch-manipulation"
                onClick={() => {
                  clearRecentPackets()
                  setPaused(false)
                }}
              >
                Snap to live
              </Button>
            </div>
          </div>

          <div className="pointer-events-auto mt-auto flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-background/90 px-2 py-2 shadow-lg backdrop-blur-md">
              <span className="text-xs font-medium text-muted-foreground">Buffer window</span>
              {([1, 6, 12, 24] as const).map((h) => (
                <label key={h} className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-sm">
                  <input
                    type="radio"
                    name="mesh-scope"
                    checked={scopeHours === h}
                    onChange={() => setScope(h)}
                    className="h-4 w-4"
                  />
                  {h}h
                </label>
              ))}
            </div>

            <div className="max-h-[140px] overflow-x-auto overflow-y-hidden rounded-lg border border-border/60 bg-background/90 py-2 shadow-lg backdrop-blur-md">
              <div className="flex min-w-min gap-2 px-2">
                {feedPackets.length === 0 ? (
                  <span className="px-2 py-2 text-sm text-muted-foreground">No packets in buffer yet…</span>
                ) : (
                  feedPackets.map((p, i) => (
                    <button
                      key={`${p.packet_uid ?? ""}-${p.rx_time ?? ""}-${i}`}
                      type="button"
                      className="max-w-[220px] shrink-0 rounded-md border border-border/70 bg-muted/40 px-3 py-2 text-left text-xs leading-snug touch-manipulation hover:bg-muted/70"
                      title={JSON.stringify(p)}
                      onClick={() => {
                        const id = p.from_node_id?.trim()
                        if (id) setSelectedNodeId(id)
                      }}
                    >
                      {packetChipLabel(p)}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
        <summary className="cursor-pointer text-base font-medium">Legend & decode hints</summary>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Port / payload</h3>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>TEXT_MESSAGE_APP, GRP_TXT — group or direct text</li>
              <li>ADVERT / NODEINFO — node metadata</li>
              <li>POSITION_APP — GPS / relative position</li>
              <li>TELEMETRY_APP — metrics / sensor</li>
              <li>Other port nums pass through as raw MAS labels</li>
            </ul>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Node roles</h3>
            <ul className="list-inside list-disc space-y-1 text-muted-foreground">
              <li>Repeater, Companion, Room server — from MINDEX node role field when present</li>
              <li>Observer gateways — Observers page + CREP mesh layers (planned)</li>
            </ul>
          </div>
        </div>
      </details>
    </div>
  )
}
