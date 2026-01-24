"use client"

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import * as d3 from "d3"
import useSWR from "swr"
import { Leaf, Loader2, Network, Sparkles } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { buildNetworkFromData, findHubSpecies, type MycorrhizalEdge, type MycorrhizalNode } from "@/lib/mindex/mycorrhizae/network"

// Fixed dimensions to prevent growing/stretching bug
const FIXED_WIDTH = 800
const FIXED_HEIGHT = 420
const MIN_WIDTH = 640
const MIN_HEIGHT = 380

interface TaxaResponse {
  data?: Array<{ id: string; canonical_name: string; common_name?: string; rank?: string; source?: string }>
}

interface ObservationsResponse {
  observations?: Array<{
    id: string
    taxon_id: string
    observed_at: string
    location?: { type: "Point"; coordinates: [number, number] }
  }>
}

function fetcher(url: string) {
  return fetch(url).then(async (r) => {
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  })
}

export function MycorrhizalNetworkViz({ className }: { className?: string }) {
  const taxa = useSWR<TaxaResponse>("/api/natureos/mindex/taxa?limit=60", fetcher, { refreshInterval: 60_000 })
  const observations = useSWR<ObservationsResponse>("/api/natureos/mindex/observations?limit=120", fetcher, { refreshInterval: 60_000 })

  const containerRef = useRef<HTMLDivElement | null>(null)
  const [size, setSize] = useState({ width: FIXED_WIDTH, height: FIXED_HEIGHT })
  const resizeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced resize handler to prevent continuous resizing
  const handleResize = useCallback(() => {
    if (!containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const newWidth = Math.min(FIXED_WIDTH, Math.max(MIN_WIDTH, Math.floor(rect.width)))
    const newHeight = Math.min(FIXED_HEIGHT, Math.max(MIN_HEIGHT, Math.floor(rect.height)))
    
    setSize((prev) => {
      // Only update if significantly different (prevents micro-resizing)
      if (Math.abs(prev.width - newWidth) > 10 || Math.abs(prev.height - newHeight) > 10) {
        return { width: newWidth, height: newHeight }
      }
      return prev
    })
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const el = containerRef.current
    
    // Initial size calculation
    handleResize()
    
    const ro = new ResizeObserver(() => {
      // Debounce resize events
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
      resizeTimeoutRef.current = setTimeout(handleResize, 150)
    })
    ro.observe(el)
    
    return () => {
      ro.disconnect()
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current)
      }
    }
  }, [handleResize])

  const graph = useMemo(() => {
    const t = taxa.data?.data ?? []
    const o = observations.data?.observations ?? []

    if (!t.length) return null

    const network = buildNetworkFromData(
      t.map((x) => ({
        id: x.id,
        canonical_name: x.canonical_name,
        common_name: x.common_name,
        kingdom: "Fungi",
        associated_species: [],
      })),
      o.map((x) => ({
        id: x.id,
        taxon_id: x.taxon_id,
        location: x.location,
        observed_at: x.observed_at,
      })),
    )

    const nodes = network.nodes.slice(0, 80)
    const nodeSet = new Set(nodes.map((n) => n.id))
    const edges = network.edges.filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target)).slice(0, 120)

    const hubs = findHubSpecies({ ...network, nodes, edges }, 8)

    return { network, nodes, edges, hubs }
  }, [taxa.data, observations.data])

  const layout = useMemo(() => {
    if (!graph) return null

    const nodes = graph.nodes.map((n) => ({ ...n })) as Array<MycorrhizalNode & d3.SimulationNodeDatum>
    const links = graph.edges.map((e) => ({ ...e })) as Array<MycorrhizalEdge & d3.SimulationLinkDatum<MycorrhizalNode & d3.SimulationNodeDatum>>

    const sim = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink(links as any)
          .id((d: any) => d.id)
          .distance((d: any) => 60 + (1 - (d.weight ?? 0.5)) * 80),
      )
      .force("charge", d3.forceManyBody().strength(-220))
      .force("center", d3.forceCenter(size.width / 2, size.height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => (d.type === "fungus" ? 16 : 10)))

    // Deterministic-ish settle for stable render (no ongoing animation loop).
    for (let i = 0; i < 120; i++) sim.tick()
    sim.stop()

    return { nodes, links }
  }, [graph, size.width, size.height])

  return (
    <Card className={cn("border-purple-500/20 bg-gradient-to-br from-purple-500/5 via-background to-blue-500/5", className)}>
      <CardHeader className="space-y-2">
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-purple-400" />
          Mycorrhizal Network
        </CardTitle>
        <CardDescription>
          A live graph lens over fungi + observations (Wood Wide Web inspired). Nodes/edges are derived from the current MINDEX dataset.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <div 
          ref={containerRef} 
          className="rounded-2xl border border-white/10 bg-black/20 overflow-hidden"
          style={{ 
            width: "100%", 
            maxWidth: FIXED_WIDTH, 
            height: FIXED_HEIGHT,
            minHeight: MIN_HEIGHT,
          }}
        >
          {(taxa.isLoading || observations.isLoading) && !graph ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Building network…
            </div>
          ) : graph && layout ? (
            <svg 
              width="100%" 
              height="100%" 
              viewBox={`0 0 ${size.width} ${size.height}`}
              preserveAspectRatio="xMidYMid meet"
              className="block"
              style={{ maxWidth: FIXED_WIDTH, maxHeight: FIXED_HEIGHT }}
            >
              <defs>
                <linearGradient id="mindexNetGlow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(168,85,247,0.55)" />
                  <stop offset="100%" stopColor="rgba(59,130,246,0.55)" />
                </linearGradient>
              </defs>

              {layout.links.map((l, i) => (
                <line
                  key={i}
                  x1={(l.source as any).x}
                  y1={(l.source as any).y}
                  x2={(l.target as any).x}
                  y2={(l.target as any).y}
                  stroke="rgba(255,255,255,0.10)"
                  strokeWidth={Math.max(1, (l as any).weight ? (l as any).weight * 2.2 : 1.2)}
                />
              ))}

              {layout.nodes.map((n) => {
                const isHub = graph.hubs.some((h) => h.id === n.id)
                const r = n.type === "fungus" ? (isHub ? 16 : 12) : 9
                const fill = n.type === "fungus" ? "rgba(168,85,247,0.35)" : n.type === "observation" ? "rgba(59,130,246,0.25)" : "rgba(16,185,129,0.25)"
                const stroke = isHub ? "url(#mindexNetGlow)" : "rgba(255,255,255,0.18)"

                return (
                  <g key={n.id}>
                    <circle cx={(n as any).x} cy={(n as any).y} r={r} fill={fill} stroke={stroke} strokeWidth={2} />
                  </g>
                )
              })}
            </svg>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No data available to build network.
            </div>
          )}
        </div>

        {graph ? (
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label="nodes" value={String(graph.network.stats.node_count)} />
            <Stat label="edges" value={String(graph.network.stats.edge_count)} />
            <Stat label="avg_degree" value={graph.network.stats.avg_degree.toFixed(2)} />
          </div>
        ) : null}

        {graph?.hubs?.length ? (
          <div className="rounded-2xl border border-white/10 bg-black/20">
            <div className="px-4 py-3 border-b border-white/10 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-purple-300" />
              <div className="text-sm font-medium">Hub species</div>
              <div className="text-xs text-muted-foreground">(highest connectivity)</div>
            </div>
            <ScrollArea className="h-[140px]">
              <div className="p-3 space-y-2">
                {graph.hubs.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-emerald-300" />
                      <div className="text-sm font-medium">{h.canonical_name ?? h.id}</div>
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">{h.degree} links</div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card className="border-white/10 bg-black/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-sm font-mono">{value}</div>
      </CardContent>
    </Card>
  )
}

