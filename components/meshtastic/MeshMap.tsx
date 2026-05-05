"use client"

import type { Feature, FeatureCollection } from "geojson"
import { useCallback, useEffect, useRef, useState } from "react"

import type { MeshtasticNodeRow } from "@/lib/meshtastic/types"
import { useMeshtasticNodes } from "@/hooks/use-meshtastic-nodes"
import { cn } from "@/lib/utils"

const DARK_STYLE = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
const LIGHT_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"

function hueFromString(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h % 360
}

function nodesToGeoJSON(
  nodes: MeshtasticNodeRow[],
  opts: {
    filterNodeId?: string | null
    favoritesOnly?: boolean
    favoriteSet: Set<string>
    colorByHash: boolean
    flashNodeIds: Set<string>
    selectedNodeId: string | null
  }
): FeatureCollection {
  const features: Feature[] = []
  for (const n of nodes) {
    if (n.lat == null || n.lon == null || Number.isNaN(n.lat) || Number.isNaN(n.lon)) continue
    if (opts.filterNodeId && n.node_id !== opts.filterNodeId) continue
    if (opts.favoritesOnly && !opts.favoriteSet.has(n.node_id)) continue
    const hue = opts.colorByHash ? hueFromString(n.node_id) : 180
    /** Precomputed CSS color so MapLibre paint stays a simple `get` expression (strict TS). */
    const color = `hsl(${hue} 70% 52%)`
    let radius = 7
    if (opts.flashNodeIds.has(n.node_id)) radius = 16
    if (opts.selectedNodeId === n.node_id) radius = Math.max(radius, 20)
    const selected = opts.selectedNodeId === n.node_id ? 1 : 0
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [n.lon, n.lat] },
      properties: {
        node_id: n.node_id,
        label: n.long_name || n.short_name || n.node_id,
        region: n.region ?? "",
        hue,
        color,
        radius,
        selected,
      },
    })
  }
  return { type: "FeatureCollection", features }
}

export interface MeshMapProps {
  className?: string
  mapHeightClass?: string
  filterNodeId?: string | null
  favoritesOnly?: boolean
  favoriteNodeIds?: string[]
  colorByHash?: boolean
  basemapKey?: "dark" | "light"
  /** Recent RX positions (packets with from_lat/from_lon) — heat/ghost styling in parent via flags */
  signalGeoJson?: FeatureCollection | null
  showHeatStyle?: boolean
  showGhostStyle?: boolean
  /** When false, hides the node-count caption under the map (map-first / full-bleed layouts). */
  showCaption?: boolean
  /** LineStrings from RX position toward known `to_node` coords (needs MINDEX node lat/lon). */
  linkGeoJson?: FeatureCollection | null
  /** Node ids to pulse larger (e.g. last packet from / to). */
  flashNodeIds?: string[]
  selectedNodeId?: string | null
  onNodeCircleClick?: (nodeId: string) => void
}

export function MeshMap({
  className,
  mapHeightClass = "h-[min(70vh,560px)]",
  filterNodeId = null,
  favoritesOnly = false,
  favoriteNodeIds = [],
  colorByHash = false,
  basemapKey = "dark",
  signalGeoJson = null,
  showHeatStyle = false,
  showGhostStyle = false,
  showCaption = true,
  linkGeoJson = null,
  flashNodeIds = [],
  selectedNodeId = null,
  onNodeCircleClick,
}: MeshMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<import("maplibre-gl").Map | null>(null)
  const onNodeCircleClickRef = useRef<typeof onNodeCircleClick>(undefined)
  onNodeCircleClickRef.current = onNodeCircleClick
  const [mapReady, setMapReady] = useState(false)
  const [plotted, setPlotted] = useState(0)
  const [mapError, setMapError] = useState<string | null>(null)
  const { nodes, error: nodesError, isLoading: nodesLoading, isValidating: nodesValidating } = useMeshtasticNodes()

  const favoriteSet = useRef(new Set<string>())
  favoriteSet.current = new Set(favoriteNodeIds)

  const applySignalLayer = useCallback(
    (map: import("maplibre-gl").Map, fc: FeatureCollection) => {
      const src = map.getSource("mesh-signals") as import("maplibre-gl").GeoJSONSource | undefined
      if (src) src.setData(fc)
    },
    []
  )

  // Init map once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    let cancelled = false
    let map: import("maplibre-gl").Map | null = null

    ;(async () => {
      try {
        await import("maplibre-gl/dist/maplibre-gl.css")
        const maplibregl = (await import("maplibre-gl")).default
        if (cancelled || !containerRef.current) return

        const styleUrl = basemapKey === "light" ? LIGHT_STYLE : DARK_STYLE
        map = new maplibregl.Map({
          container: containerRef.current,
          style: styleUrl,
          center: [-117.02, 32.64],
          zoom: 4,
        })
        map.addControl(new maplibregl.NavigationControl(), "top-right")

        map.on("load", () => {
          if (!map || cancelled) return
          map.addSource("mesh-nodes", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          })
          map.addLayer({
            id: "mesh-nodes-circle",
            type: "circle",
            source: "mesh-nodes",
            paint: {
              "circle-radius": ["get", "radius"],
              "circle-color": ["get", "color"],
              "circle-stroke-width": [
                "case",
                ["==", ["get", "selected"], 1],
                3.5,
                1.5,
              ],
              "circle-stroke-color": "#0f172a",
            },
          })

          map.addSource("mesh-signals", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          })
          map.addLayer(
            {
              id: "mesh-signals-circle",
              type: "circle",
              source: "mesh-signals",
              paint: {
                "circle-radius": showHeatStyle ? 10 : 5,
                "circle-color": showHeatStyle ? "rgba(251,146,60,0.55)" : "rgba(34,211,238,0.35)",
                "circle-stroke-width": 0,
                "circle-opacity": showGhostStyle ? 0.45 : showHeatStyle ? 0.5 : 0,
              },
            },
            "mesh-nodes-circle"
          )

          map.addSource("mesh-arcs", {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          })
          map.addLayer(
            {
              id: "mesh-arcs-line",
              type: "line",
              source: "mesh-arcs",
              layout: { "line-cap": "round", "line-join": "round" },
              paint: {
                "line-color": "rgba(34,211,238,0.88)",
                "line-width": 2,
                "line-opacity": 0.82,
                "line-dasharray": [2, 3],
              },
            },
            "mesh-nodes-circle"
          )

          map.on("click", "mesh-nodes-circle", (e) => {
            const f = e.features?.[0]
            const id = f?.properties?.node_id
            if (typeof id === "string" && id) onNodeCircleClickRef.current?.(id)
          })
          map.on("mouseenter", "mesh-nodes-circle", () => {
            map.getCanvas().style.cursor = "pointer"
          })
          map.on("mouseleave", "mesh-nodes-circle", () => {
            map.getCanvas().style.cursor = ""
          })

          mapRef.current = map
          setMapReady(true)
        })
      } catch (e) {
        if (!cancelled) setMapError(e instanceof Error ? e.message : "map_failed")
      }
    })()

    return () => {
      cancelled = true
      setMapReady(false)
      mapRef.current = null
      map?.remove()
    }
  }, [basemapKey])

  // Link lines (from → to when coords exist)
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    const src = map.getSource("mesh-arcs") as import("maplibre-gl").GeoJSONSource | undefined
    if (!src) return
    const fc = linkGeoJson ?? { type: "FeatureCollection" as const, features: [] }
    src.setData(fc)
    try {
      map.setLayoutProperty("mesh-arcs-line", "visibility", fc.features.length ? "visible" : "none")
    } catch {
      /* layer missing during teardown */
    }
  }, [mapReady, linkGeoJson])

  // Repaint node circles from shared SWR cache when selection / flash / filter props change (no refetch).
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    const flashSet = new Set(flashNodeIds)
    const fc = nodesToGeoJSON(nodes, {
      filterNodeId,
      favoritesOnly,
      favoriteSet: favoriteSet.current,
      colorByHash,
      flashNodeIds: flashSet,
      selectedNodeId: selectedNodeId ?? null,
    })
    setPlotted(fc.features.length)
    const src = map.getSource("mesh-nodes") as import("maplibre-gl").GeoJSONSource | undefined
    if (src) src.setData(fc)
  }, [
    mapReady,
    nodes,
    filterNodeId,
    favoritesOnly,
    favoriteNodeIds,
    colorByHash,
    flashNodeIds,
    selectedNodeId,
  ])

  // Ease map toward first visible node when registry / filter changes (ignore live flash / selection).
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    const fc = nodesToGeoJSON(nodes, {
      filterNodeId,
      favoritesOnly,
      favoriteSet: favoriteSet.current,
      colorByHash,
      flashNodeIds: new Set(),
      selectedNodeId: null,
    })
    const first = fc.features[0]
    if (first && first.geometry.type === "Point") {
      const c = first.geometry.coordinates as [number, number]
      map.easeTo({ center: c, zoom: fc.features.length ? Math.max(map.getZoom(), 8) : 4, duration: 600 })
    }
  }, [mapReady, nodes, filterNodeId, favoritesOnly, favoriteNodeIds, colorByHash])

  // Signal / heat points
  useEffect(() => {
    if (!mapReady || !mapRef.current) return
    const map = mapRef.current
    const fc = signalGeoJson ?? { type: "FeatureCollection", features: [] }
    applySignalLayer(map, fc)
    const showSignals = showHeatStyle || showGhostStyle
    try {
      map.setPaintProperty("mesh-signals-circle", "circle-opacity", showSignals ? (showGhostStyle ? 0.45 : 0.5) : 0)
      map.setPaintProperty("mesh-signals-circle", "circle-radius", showHeatStyle ? 10 : 5)
      map.setPaintProperty(
        "mesh-signals-circle",
        "circle-color",
        showHeatStyle ? "rgba(251,146,60,0.55)" : "rgba(34,211,238,0.35)"
      )
    } catch {
      /* layer may not exist during style swap */
    }
  }, [mapReady, signalGeoJson, showHeatStyle, showGhostStyle, applySignalLayer])

  const bannerError = mapError || nodesError
  const captionLoading = nodesLoading && nodes.length === 0

  return (
    <div className={cn("space-y-3", className)}>
      {bannerError ? (
        <p className="text-sm text-amber-500" role="alert">
          {bannerError}
          {nodesError && nodesValidating ? " — retrying…" : ""}
        </p>
      ) : null}
      <div
        ref={containerRef}
        className={cn("w-full overflow-hidden rounded-xl border border-border/80", mapHeightClass)}
        aria-label="Meshtastic node positions"
      />
      {showCaption ? (
        <p className="text-sm text-muted-foreground">
          {captionLoading
            ? "Loading nodes…"
            : `${nodes.length} rows from API, ${plotted} with valid coordinates.`}
        </p>
      ) : null}
    </div>
  )
}
