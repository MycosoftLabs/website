"use client"

/**
 * Proposal Overlays — lean wrapper that wires NEW CREP registries into MapLibre
 * without touching the 6,500-line CREPDashboardClient. Attaches directly to the
 * map ref. Each overlay is independently toggleable.
 *
 * Layers added:
 *   ports           Global Seaports (3,600+)
 *   radar           NEXRAD + Mycosoft SDR radar sites
 *   radioStations   AM/FM/TV broadcast + KiwiSDR nodes
 *   powerPlantsG    Global power plants (34,936 from WRI)
 *   factories       Global factories (Climate TRACE + OSM)
 *   orbitalDebris   Catalogued tracked debris (symbol)
 *   debrisCloud     Statistical 1.2 M debris canvas (density cloud)
 *   txLinesGlobal   Global transmission lines
 *   cellTowersG     OpenCelliD 47M + FCC + OSM cell towers (bbox-scoped)
 *   bathymetry      Ocean depth shading + land hillshade (GEBCO 2024)
 *   railwayTracks   OpenRailwayMap global track/station network (raster tiles)
 *   railwayTrains   Amtrak Track-A-Train live positions
 *   droneNoFly      FAA UAS restricted areas + OpenAIP airspace polygons
 *
 * Each layer performs its own idleLoad → fetch → addSource/addLayer +
 * setData pattern. Click handlers bubble up through the existing dashboard
 * via window.__crep_selectAsset (if defined).
 */

import { useEffect, useRef, useState } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"
import {
  INFRA_LAYERS,
  addInfraSourceWithFallback,
  layerSpecForMode,
} from "@/lib/crep/static-infra-loader"
import { applyInfraPointIconMinZoom } from "@/lib/crep/production-first-load"
import { POWER_PLANT_MIN_ZOOM, RAILWAY_MIN_ZOOM, TELECOM_DETAIL_MIN_ZOOM } from "@/lib/crep/lod-policy"
import { getNexradStations } from "@/lib/crep/registries/radar-registry"
import {
  eagleCameraClickLayerIds,
  eagleCameraGlowLayer,
  eagleCameraHitLayer,
  eagleCameraIconLayer,
  eagleCameraLabelLayer,
  eagleCameraLayerIds,
  ensureEagleCameraMapIcon,
} from "@/lib/crep/eagle-camera-map-icon"

const CCTV_LAYER_PREFIX = "crep-cctv"
const CCTV_VISIBILITY_LAYER_IDS = Object.values(eagleCameraLayerIds(CCTV_LAYER_PREFIX))
const CCTV_CLICK_LAYER_IDS = eagleCameraClickLayerIds(CCTV_LAYER_PREFIX)
const CCTV_MIN_ZOOM = 7
const CCTV_FAST_LIMIT = "160"
const CCTV_FULL_LIMIT = "600"
let railwayLiveCache: { ts: number; data: any } | null = null
let railwayLiveInFlight: Promise<any> | null = null
let railwayLiveAbortController: AbortController | null = null

async function fetchRailwayLiveCached() {
  const now = Date.now()
  if (typeof document !== "undefined" && document.hidden) return railwayLiveCache?.data ?? { trains: [] }
  if (railwayLiveCache && now - railwayLiveCache.ts < 30_000) return railwayLiveCache.data
  if (railwayLiveInFlight) return railwayLiveInFlight
  railwayLiveAbortController?.abort()
  railwayLiveAbortController = new AbortController()
  const timeout = window.setTimeout(() => railwayLiveAbortController?.abort(), 5_000)
  railwayLiveInFlight = fetch("/api/oei/railway-live?limit=1500", {
      signal: railwayLiveAbortController.signal,
      cache: "no-store",
    })
    .then(async (res) => {
      if (!res.ok) return railwayLiveCache?.data ?? { trains: [] }
      const data = await res.json()
      railwayLiveCache = { ts: Date.now(), data }
      return data
    })
    .catch(() => railwayLiveCache?.data ?? { trains: [] })
    .finally(() => {
      window.clearTimeout(timeout)
      railwayLiveInFlight = null
      railwayLiveAbortController = null
    })
  return railwayLiveInFlight
}

interface Props {
  map: MapLibreMap | null
  enabled: {
    ports?: boolean
    radar?: boolean
    radioStations?: boolean
    powerPlantsG?: boolean
    factories?: boolean
    orbitalDebris?: boolean
    debrisCloud?: boolean
    txLinesGlobal?: boolean
    cellTowersG?: boolean
    /** Ocean depth shading (GEBCO 2024 WMS — low/medium detail, free). */
    bathymetry?: boolean
    /** Land hillshade from AWS Terrain Tiles (Mapzen terrarium DEM → MapLibre native hillshade). 30 m res, free, no key. */
    topography?: boolean
    /** ESRI World Imagery HD satellite basemap — Google-Earth-level detail to zoom 19, free, no key. */
    satImagery?: boolean
    railwayTracks?: boolean
    railwayTrains?: boolean
    droneNoFly?: boolean
    /** CCTV / webcam feeds — MINDEX crep.cctv_cameras + Shinobi on MAS VM. */
    cctv?: boolean
  }
  bbox?: [number, number, number, number]
  searchContextMode?: boolean
  /** Current map zoom — railway raster hidden below RAILWAY_MIN_ZOOM. */
  mapZoom?: number
}

async function idleLoad<T>(fn: () => Promise<T>): Promise<T> {
  return new Promise((resolve) => {
    const run = () => fn().then(resolve)
    if (typeof (window as any).requestIdleCallback === "function") {
      (window as any).requestIdleCallback(run, { timeout: 3000 })
    } else {
      setTimeout(run, 300)
    }
  })
}

function isMapStyleReady(map: MapLibreMap | null): map is MapLibreMap {
  try {
    if (!map || typeof map.getSource !== "function" || typeof map.getStyle !== "function") return false
    if (map.isStyleLoaded?.()) return true
    const layerCount = map.getStyle?.()?.layers?.length ?? 0
    return layerCount > 0
  } catch {
    return false
  }
}

function safeHasImage(map: MapLibreMap | null, name: string) {
  try {
    return Boolean(
      map &&
      typeof (map as any).hasImage === "function" &&
      (map as any).hasImage(name),
    )
  } catch {
    return false
  }
}

function setLayerVisibility(map: MapLibreMap | null, layerIds: string[], visible: boolean) {
  if (!map) return
  try {
    for (const id of layerIds) {
      if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visible ? "visible" : "none")
    }
  } catch {
    /* ignore transient style/HMR teardown */
  }
}

function bboxFromMap(map: MapLibreMap | null, zoom = 0): [number, number, number, number] | null {
  try {
    const targetLngSpan = Math.max(0.25, Math.min(12, 22 / Math.pow(2, Math.max(0, zoom - 3))))
    const targetLatSpan = Math.max(0.18, Math.min(8, targetLngSpan * 0.65))
    const bounds = map?.getBounds?.()
    if (bounds) {
      const west = bounds.getWest()
      const south = bounds.getSouth()
      const east = bounds.getEast()
      const north = bounds.getNorth()
      const lngSpan = Math.abs(east - west)
      const latSpan = Math.abs(north - south)
      if (Number.isFinite(lngSpan) && Number.isFinite(latSpan) && lngSpan > 0 && latSpan > 0 && zoom < 5) {
        return [west, south, east, north]
      }
      if (Number.isFinite(lngSpan) && Number.isFinite(latSpan) && lngSpan > 0 && latSpan > 0 && lngSpan <= targetLngSpan * 1.25 && latSpan <= targetLatSpan * 1.25) {
        return [west, south, east, north]
      }
      const centerLng = (west + east) / 2
      const centerLat = (south + north) / 2
      if (Number.isFinite(centerLng) && Number.isFinite(centerLat)) {
        return [
          centerLng - targetLngSpan / 2,
          centerLat - targetLatSpan / 2,
          centerLng + targetLngSpan / 2,
          centerLat + targetLatSpan / 2,
        ]
      }
    }
    const center = map?.getCenter?.()
    if (!center) return null
    return [
      center.lng - targetLngSpan / 2,
      center.lat - targetLatSpan / 2,
      center.lng + targetLngSpan / 2,
      center.lat + targetLatSpan / 2,
    ]
  } catch {
    return null
  }
}

function bboxFromUrl(zoom = 0): [number, number, number, number] | null {
  try {
    if (typeof window === "undefined") return null
    const params = new URLSearchParams(window.location.search)
    const lat = Number(params.get("lat"))
    const lng = Number(params.get("lng"))
    const z = Number(params.get("zoom") || zoom)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    const lngSpan = Math.max(0.25, Math.min(12, 22 / Math.pow(2, Math.max(0, z - 3))))
    const latSpan = Math.max(0.18, Math.min(8, lngSpan * 0.65))
    return [lng - lngSpan / 2, lat - latSpan / 2, lng + lngSpan / 2, lat + latSpan / 2]
  } catch {
    return null
  }
}

export default function ProposalOverlays({ map, enabled, bbox, searchContextMode = false, mapZoom = 0 }: Props) {
  const loadedRef = useRef<Record<string, boolean>>({})
  const landMaskResolutionRef = useRef<"10m" | "50m" | null>(null)
  const txBboxKeyRef = useRef("")
  const txInFlightKeyRef = useRef("")
  const txFetchTimerRef = useRef<number | null>(null)
  const txAbortRef = useRef<AbortController | null>(null)
  const cellTowerBboxKeyRef = useRef("")
  const cellTowerInFlightKeyRef = useRef("")
  const cellTowerFetchTimerRef = useRef<number | null>(null)
  const cellTowerAbortRef = useRef<AbortController | null>(null)
  const cctvInFlightKeyRef = useRef("")
  const cctvLastFetchRef = useRef<{ key: string; ts: number } | null>(null)
  const cctvAbortRef = useRef<AbortController | null>(null)
  const [styleReadyTick, setStyleReadyTick] = useState(0)

  useEffect(() => {
    if (!map) return
    let frame: number | null = null
    const bootstrapTimers: number[] = []
    const bump = () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => setStyleReadyTick((value) => value + 1))
    }
    if (isMapStyleReady(map)) bump()
    const events = ["load", "style.load"] as const
    events.forEach((eventName) => {
      try { map.on(eventName, bump) } catch { /* ignore unsupported events during teardown */ }
    })
    // Startup safety net: style events can race listener attachment during HMR.
    // Use a few one-shot retries instead of a continuous interval to avoid
    // adding steady render pressure during map interaction.
    bootstrapTimers.push(window.setTimeout(() => { if (isMapStyleReady(map)) bump() }, 150))
    bootstrapTimers.push(window.setTimeout(() => { if (isMapStyleReady(map)) bump() }, 700))
    bootstrapTimers.push(window.setTimeout(() => { if (isMapStyleReady(map)) bump() }, 1800))
    // Extra one-shot retries: in dev/HMR some style events are missed entirely.
    // Force a re-evaluation pass so base layers don't wait for user clicks.
    bootstrapTimers.push(window.setTimeout(() => { bump() }, 3200))
    bootstrapTimers.push(window.setTimeout(() => { bump() }, 6200))
    return () => {
      if (frame != null) window.cancelAnimationFrame(frame)
      bootstrapTimers.forEach((id) => window.clearTimeout(id))
      events.forEach((eventName) => {
        try { map.off(eventName, bump) } catch { /* ignore teardown */ }
      })
    }
  }, [map])

  // ─── 1. Global Seaports ────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-ports-global-dot"]
    if (!enabled.ports) {
      try { layerIds.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none") }) } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.ports) {
      try { layerIds.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible") }) } catch { /* ignore */ }
      return
    }
    const mapReady = () => isMapStyleReady(map)
    if (!mapReady()) return
    loadedRef.current.ports = true

    void (async () => {
      try {
        const res = await fetch("/data/crep/ports-global.geojson", { cache: "force-cache" })
        if (!res.ok) return
        const j = await res.json()
        const features = (j.features || [])
          .filter((f: any) => f?.geometry?.type === "Point" && Array.isArray(f.geometry.coordinates))
          .map((f: any, i: number) => {
            const p = f.properties || {}
            return {
              type: "Feature" as const,
              properties: {
                id: p.id || p.unlocode || `wpi-${i}`,
                name: p.name || p.PORT_NAME || "Seaport",
                country: p.country || p.COUNTRY,
                unlocode: p.unlocode || p.UNLOCODE,
                type: p.type || "general",
                source: p.source || "WPI/NGA Pub 150",
              },
              geometry: f.geometry,
            }
          })
        if (!mapReady()) return
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-ports-global")) {
          map.addSource("crep-ports-global", { type: "geojson", data: fc })
          map.addLayer(applyInfraPointIconMinZoom({
            id: "crep-ports-global-dot", type: "circle", source: "crep-ports-global",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2, 6, 4, 10, 7],
              "circle-color": "#14b8a6", "circle-opacity": 0.85,
              "circle-stroke-width": 1, "circle-stroke-color": "#f0fdfa",
            },
          }))
          map.on("click", "crep-ports-global-dot", (e: any) => {
            const f = e.features?.[0]
            if (!f) return
            const p = f.properties || {}
            const c = e.lngLat
            try {
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") hook({
                type: "seaport",
                id: p.id,
                name: p.name || "Seaport",
                lat: c?.lat ?? 0,
                lng: c?.lng ?? 0,
                properties: p,
              })
            } catch { /* ignore */ }
          })
          map.on("mouseenter", "crep-ports-global-dot", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-ports-global-dot", () => { map.getCanvas().style.cursor = "" })
        } else {
          (map.getSource("crep-ports-global") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] ports: ${features.length} bundled ports loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/ports]", e.message) }
    })()
  }, [map, styleReadyTick, enabled.ports])

  // ─── 2. Radar sites ────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-radar-range", "crep-radar-dot"]
    if (!enabled.radar) {
      try { layerIds.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none") }) } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.radar) {
      try { layerIds.forEach((id) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible") }) } catch { /* ignore */ }
      return
    }
    if (!isMapStyleReady(map)) return
    loadedRef.current.radar = true

    void (async () => {
      try {
        const features = getNexradStations().map((s: any) => ({
          type: "Feature" as const,
          properties: {
            id: s.id,
            name: s.name,
            network: s.network,
            kind: s.kind,
            range_km: s.range_km,
            operator: s.operator,
            lastObservationUrl: s.lastObservationUrl,
          },
          geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
        }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-radar")) {
          map.addSource("crep-radar", { type: "geojson", data: fc })
          // Coverage circle (approximate — based on range_km)
          map.addLayer(applyInfraPointIconMinZoom({
            id: "crep-radar-range", type: "circle", source: "crep-radar",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 6, 12, 10, 28, 14, 60],
              "circle-color": "#38bdf8", "circle-opacity": 0.08,
              "circle-stroke-width": 1, "circle-stroke-color": "#38bdf8", "circle-stroke-opacity": 0.4,
            },
          }))
          map.addLayer(applyInfraPointIconMinZoom({
            id: "crep-radar-dot", type: "circle", source: "crep-radar",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 3, 6, 5, 10, 8],
              "circle-color": "#0ea5e9", "circle-opacity": 0.95,
              "circle-stroke-width": 1, "circle-stroke-color": "#ffffff",
            },
          }))
          map.on("click", "crep-radar-dot", (e: any) => {
            const f = e.features?.[0]
            if (!f) return
            const p = f.properties || {}
            const c = e.lngLat
            try {
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") hook({
                type: "radar_site",
                id: p.id,
                name: p.name || "Radar site",
                lat: c?.lat ?? 0,
                lng: c?.lng ?? 0,
                properties: p,
              })
            } catch { /* ignore */ }
          })
          map.on("mouseenter", "crep-radar-dot", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-radar-dot", () => { map.getCanvas().style.cursor = "" })
        } else {
          (map.getSource("crep-radar") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] radar sites: ${features.length} bundled NEXRAD sites loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/radar]", e.message) }
    })()
  }, [map, styleReadyTick, enabled.radar])

  // ─── 3. Radio Stations ─────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-radio-dot"]
    if (!enabled.radioStations) {
      setLayerVisibility(map, layerIds, false)
      return
    }
    if (loadedRef.current.radio) {
      setLayerVisibility(map, layerIds, true)
      return
    }
    if (!isMapStyleReady(map)) return
    loadedRef.current.radio = true

    void (async () => {
      try {
        if (!isMapStyleReady(map)) return
        const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : ""
        // Apr 19, 2026 (Morgan: "need more am fm cell tower data alot
        // missing"). Bumping radio-stations limit from 5k → 20k (the route's
        // hard cap) so all 44k+ AM/FM/TV stations come through. 20k is the
        // route-side ceiling; additional data ships via PMTiles if needed.
        const res = await fetch(`/api/oei/radio-stations?limit=20000${bboxParam}`)
        if (!res.ok) return
        const j = await res.json()
        const features = (j.stations || []).map((s: any) => ({
          type: "Feature" as const,
          properties: { id: s.id, name: s.name, band: s.band, freq: s.frequency_mhz, callsign: s.callsign, streamUrl: s.streamUrl || s.sdrUrl },
          geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
        }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-radio")) {
          map.addSource("crep-radio", { type: "geojson", data: fc, generateId: true })
          // Apr 19, 2026 (Morgan: "new am fm antennas need to be different
          // from cell towers look on map to see what is what"). Cell towers
          // are solid neon-green dots; radio stations are hollow BAND-colored
          // RINGS — the outline-only shape language reads differently at a
          // glance even when both layers are dense. Colors:
          //   FM   #a855f7 violet   AM   #ec4899 pink
          //   TV   #f59e0b amber    SDR  #22d3ee cyan
          // Hover: ring fills in (feature-state hover expression).
          map.addLayer(applyInfraPointIconMinZoom({
            id: "crep-radio-dot", type: "circle", source: "crep-radio",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 1.4, 6, 2.2, 10, 3.6, 14, 5.5],
              // Transparent fill by default = ring appearance. Fill comes in on hover.
              "circle-color": [
                "case",
                ["boolean", ["feature-state", "hover"], false],
                [
                  "match", ["get", "band"],
                  "FM", "#a855f7",
                  "AM", "#ec4899",
                  "TV", "#f59e0b",
                  "PUBLIC_SDR", "#22d3ee",
                  "#8b5cf6",
                ],
                "rgba(0,0,0,0)",
              ],
              "circle-opacity": [
                "case",
                ["boolean", ["feature-state", "hover"], false], 0.95,
                0.0,
              ],
              "circle-stroke-width": [
                "case",
                ["boolean", ["feature-state", "hover"], false], 2.0,
                1.4,
              ],
              "circle-stroke-color": [
                "match", ["get", "band"],
                "FM", "#a855f7",
                "AM", "#ec4899",
                "TV", "#f59e0b",
                "PUBLIC_SDR", "#22d3ee",
                "#8b5cf6",
              ],
              "circle-stroke-opacity": 0.85,
            },
          }))
          // Hover state wiring (rings fill in when cursor is over)
          let radioHoverId: string | number | null = null
          const hoverSet = (id: string | number | null, hover: boolean) => {
            if (id == null) return
            try { map.setFeatureState({ source: "crep-radio", id }, { hover }) } catch { /* generateId:true required */ }
          }
          map.on("mousemove", "crep-radio-dot", (e: any) => {
            const f = e.features?.[0]
            if (!f) return
            if (radioHoverId !== f.id) {
              hoverSet(radioHoverId, false)
              radioHoverId = f.id ?? null
              hoverSet(radioHoverId, true)
            }
            map.getCanvas().style.cursor = "pointer"
          })
          map.on("mouseleave", "crep-radio-dot", () => {
            hoverSet(radioHoverId, false)
            radioHoverId = null
            map.getCanvas().style.cursor = ""
          })
        } else {
          (map.getSource("crep-radio") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] radio stations: ${features.length} loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/radio]", e.message) }
    })
  }, [map, styleReadyTick, enabled.radioStations, bbox])

  // ─── 4. Global Power Plants ───────────────────────────────────────────
  // Apr 20, 2026 perf (Morgan: "make all map load faster every single asset"):
  // The raw power-plants-global.geojson is 16 MB / 34,936 features — a single
  // full fetch parses into ~25 MB resident heap even at zoom 0 where none of
  // the dots are visible. Switch to the pre-tiled PMTiles archive (~1-2 MB,
  // range-requested per viewport) with GeoJSON fallback for dev boxes that
  // haven't run gen-pmtiles.sh yet.
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-plants-global-dot", "crep-plants-global-label"]
    if (!enabled.powerPlantsG) {
      setLayerVisibility(map, layerIds, false)
      return
    }
    if (loadedRef.current.plants) {
      setLayerVisibility(map, layerIds, true)
      return
    }
    if (!isMapStyleReady(map)) return
    loadedRef.current.plants = true

    void (async () => {
      try {
        if (!isMapStyleReady(map)) return
        const cfg = INFRA_LAYERS.powerPlantsGlobal
        const { mode } = await addInfraSourceWithFallback(map, cfg)
        if (mode === "skipped") return

        // Avoid double-adding if HMR re-runs this effect
        if (map.getLayer("crep-plants-global-dot")) return

        const paint = {
          "circle-radius": ["interpolate", ["linear"], ["get", "capacity_mw"],
            0, 2, 100, 3, 500, 4.5, 2000, 7, 5000, 10] as any,
          "circle-color": [
            "match", ["get", "fuel"],
            "Coal", "#78350f",
            "Gas", "#f97316",
            "Oil", "#451a03",
            "Nuclear", "#16a34a",
            "Hydro", "#0ea5e9",
            "Solar", "#facc15",
            "Wind", "#22d3ee",
            "Biomass", "#65a30d",
            "Geothermal", "#f43f5e",
            "#fbbf24",
          ] as any,
          "circle-opacity": 0.85,
          "circle-stroke-width": 0.5,
          "circle-stroke-color": "#fff",
        }

        const { sourceLayer } = layerSpecForMode(mode, cfg)
        map.addLayer(applyInfraPointIconMinZoom({
          id: "crep-plants-global-dot",
          type: "circle",
          source: cfg.sourceId,
          ...(sourceLayer ? { "source-layer": sourceLayer } : {}),
          minzoom: POWER_PLANT_MIN_ZOOM,
          paint,
        } as any))
        // Apr 21, 2026 (Morgan: "ALL NO FLY ZONE AND POLLUTION AND ANY
        // GRID NEEDS TO BE SELECTABLE AND HAVE LABELS"). Label + click.
        map.addLayer({
          id: "crep-plants-global-label",
          type: "symbol",
          source: cfg.sourceId,
          ...(sourceLayer ? { "source-layer": sourceLayer } : {}),
          minzoom: 9,
          layout: {
            "text-field": ["concat", ["coalesce", ["get", "name"], "Plant"], "  ·  ", ["coalesce", ["get", "fuel"], ""], " ", ["coalesce", ["to-string", ["get", "capacity_mw"]], ""], " MW"],
            "text-size": 10,
            "text-offset": [0, 0.9],
            "text-anchor": "top",
            "text-allow-overlap": false,
            "text-optional": true,
          } as any,
          paint: {
            "text-color": "#fef3c7",
            "text-halo-color": "rgba(0,0,0,0.85)",
            "text-halo-width": 1.3,
          },
        } as any)
        map.on("click", "crep-plants-global-dot", (e: any) => {
          const p = e.features?.[0]?.properties || {}
          const c = e.lngLat
          try {
            const hook = (window as any).__crep_selectAsset
            if (typeof hook === "function") {
              hook({
                type: "power_plant",
                id: p.id || `plant-${c.lat}-${c.lng}`,
                name: p.name || `${p.fuel || "Power"} plant`,
                lat: c?.lat ?? 0,
                lng: c?.lng ?? 0,
                properties: p,
              })
            }
          } catch { /* ignore */ }
        })
        map.on("mouseenter", "crep-plants-global-dot", () => { map.getCanvas().style.cursor = "pointer" })
        map.on("mouseleave", "crep-plants-global-dot", () => { map.getCanvas().style.cursor = "" })
        console.log(`[ProposalOverlays] power plants: ${mode} source added (click + label wired)`)
      } catch (e: any) { console.warn("[ProposalOverlays/plants]", e.message) }
    })()
  }, [map, styleReadyTick, enabled.powerPlantsG])

  // ─── 5. Factories ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-factories-dot", "crep-factories-label"]
    if (!enabled.factories || !bbox) {
      setLayerVisibility(map, layerIds, false)
      return
    }
    if (loadedRef.current.factories) {
      setLayerVisibility(map, layerIds, true)
      return
    }
    if (!isMapStyleReady(map)) return
    loadedRef.current.factories = true

    idleLoad(async () => {
      try {
        if (!isMapStyleReady(map)) return
        const res = await fetch(`/api/oei/factories?bbox=${bbox.join(",")}&limit=2000`)
        if (!res.ok) return
        const j = await res.json()
        const features = (j.factories || []).map((f: any) => ({
          type: "Feature" as const,
          properties: { id: f.id, name: f.name, industry: f.industry, operator: f.operator },
          geometry: { type: "Point" as const, coordinates: [f.lng, f.lat] },
        }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-factories")) {
          map.addSource("crep-factories", { type: "geojson", data: fc })
          map.addLayer(applyInfraPointIconMinZoom({
            id: "crep-factories-dot", type: "circle", source: "crep-factories",
            paint: {
              "circle-radius": 3, "circle-color": "#f97316",
              "circle-opacity": 0.6, "circle-stroke-width": 0.3, "circle-stroke-color": "#7c2d12",
            },
          }))
          // Apr 21, 2026 (Morgan: pollution layers need label + click)
          map.addLayer({
            id: "crep-factories-label", type: "symbol", source: "crep-factories", minzoom: 9,
            layout: {
              "text-field": ["concat", ["coalesce", ["get", "name"], "Factory"], "  ·  ", ["coalesce", ["get", "industry"], ""]],
              "text-size": 10, "text-offset": [0, 0.9], "text-anchor": "top",
              "text-allow-overlap": false, "text-optional": true,
            } as any,
            paint: { "text-color": "#fed7aa", "text-halo-color": "rgba(0,0,0,0.85)", "text-halo-width": 1.3 },
          })
          map.on("click", "crep-factories-dot", (e: any) => {
            const p = e.features?.[0]?.properties || {}; const c = e.lngLat
            try { const h = (window as any).__crep_selectAsset; if (typeof h === "function") h({ type: "factory", id: p.id, name: p.name || "Factory", lat: c?.lat ?? 0, lng: c?.lng ?? 0, properties: p }) } catch {}
          })
          map.on("mouseenter", "crep-factories-dot", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-factories-dot", () => { map.getCanvas().style.cursor = "" })
        } else {
          (map.getSource("crep-factories") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] factories: ${features.length} loaded in bbox`)
      } catch (e: any) { console.warn("[ProposalOverlays/factories]", e.message) }
    })
  }, [map, styleReadyTick, enabled.factories, bbox])

  // ─── 6. Orbital Debris (catalogued) ────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-orbital-debris-dot"]
    if (!enabled.orbitalDebris) {
      setLayerVisibility(map, layerIds, false)
      return
    }
    if (loadedRef.current.debris) {
      setLayerVisibility(map, layerIds, true)
      return
    }
    if (!isMapStyleReady(map)) return
    loadedRef.current.debris = true

    idleLoad(async () => {
      try {
        if (!isMapStyleReady(map)) return
        const res = await fetch("/api/oei/debris?mode=catalogued")
        if (!res.ok) return
        const j = await res.json()
        // Show debris as small purple dots above earth — position will be
        // propagated by SGP4 later; here we just seed with current lat/lng
        const features = (j.objects || []).slice(0, 8000).map((o: any) => ({
          type: "Feature" as const,
          properties: { id: o.id, name: o.name, alt_km: o.altitude_km, type: o.objectType },
          geometry: { type: "Point" as const, coordinates: [o.lng || 0, o.lat || 0] },
        }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-orbital-debris")) {
          map.addSource("crep-orbital-debris", { type: "geojson", data: fc })
          map.addLayer(applyInfraPointIconMinZoom({
            id: "crep-orbital-debris-dot", type: "circle", source: "crep-orbital-debris",
            paint: {
              "circle-radius": 1.5, "circle-color": "#d946ef",
              "circle-opacity": 0.7, "circle-blur": 0.2,
            },
          }))
        } else {
          (map.getSource("crep-orbital-debris") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] tracked debris: ${features.length} loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/debris]", e.message) }
    })
  }, [map, styleReadyTick, enabled.orbitalDebris])

  // ─── 7b. Global Transmission Lines (bbox-scoped, non-US fill-in) ──────
  // The main dashboard already paints US HIFLD ≥345 kV from the static
  // bundle unconditionally. This adds OSM + MINDEX lines outside the US
  // when the operator zooms in. Gated at zoom>=3 via the dashboard's
  // bbox prop (mapZoom>5). Fetches bbox-scoped results to keep payloads
  // bounded on large viewports.
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-txlines-global-line"]
    if (!enabled.txLinesGlobal) {
      setLayerVisibility(map, layerIds, false)
      return
    }
    const mapReady = () => isMapStyleReady(map)
    if (!mapReady()) return
    if (map.getLayer("crep-txlines-global-line")) {
      setLayerVisibility(map, layerIds, true)
      return
    }

    void (async () => {
      try {
        const cfg = INFRA_LAYERS.transmissionLines
        const result = await addInfraSourceWithFallback(map, cfg)
        if (result.mode !== "pmtiles" && result.mode !== "geojson") return
        const { sourceLayer } = layerSpecForMode(result.mode, cfg)
        if (!mapReady() || map.getLayer("crep-txlines-global-line")) return
        map.addLayer({
          id: "crep-txlines-global-line",
          type: "line",
          source: result.sourceId,
          ...(sourceLayer ? { "source-layer": sourceLayer } : {}),
          minzoom: 0,
          paint: {
            "line-color": ["interpolate", ["linear"],
              ["coalesce", ["to-number", ["get", "v"]], ["to-number", ["get", "VOLTAGE"]], 0],
              0, "#9ca3af", 31000, "#fb923c", 100000, "#ec4899", 230000, "#a855f7",
              345000, "#60a5fa", 500000, "#22d3ee", 735000, "#ffffff"],
            "line-width": ["interpolate", ["linear"], ["zoom"], 2, 0.4, 4, 0.7, 6, 1.2, 8, 1.8, 12, 2.6, 16, 3.5],
            "line-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0.45, 4, 0.6, 8, 0.75, 12, 0.8],
          },
        })
        console.log(`[ProposalOverlays] tx lines: bundled ${result.mode} source attached`)
      } catch (e: any) { console.warn("[ProposalOverlays/txLinesGlobal]", e.message) }
    })()
  }, [map, styleReadyTick, enabled.txLinesGlobal])

  // ─── 7c. Global Cell Towers (bbox-scoped, supplements PMTiles bundle) ─
  useEffect(() => {
    if (!map) return
    const sourceId = "crep-txlines-bbox"
    const layerId = "crep-txlines-bbox-line"
    const emptyFc = { type: "FeatureCollection" as const, features: [] as any[] }
    const clearBboxLayer = () => {
      setLayerVisibility(map, [layerId], false)
      try { (map.getSource(sourceId) as any)?.setData?.(emptyFc) } catch { /* ignore style teardown */ }
    }
    const effectiveBbox = bboxFromMap(map, mapZoom) ?? bboxFromUrl(mapZoom) ?? bbox
    if (!enabled.txLinesGlobal || !effectiveBbox || mapZoom < 5) {
      txBboxKeyRef.current = ""
      txInFlightKeyRef.current = ""
      txAbortRef.current?.abort()
      clearBboxLayer()
      return
    }
    if (!isMapStyleReady(map)) return

    const precision = mapZoom >= 9 ? 3 : mapZoom >= 7 ? 2 : 1
    const bboxKey = `${mapZoom >= 9 ? 9 : mapZoom >= 7 ? 7 : 5}:${effectiveBbox.map((v) => v.toFixed(precision)).join(",")}`
    if (bboxKey === txBboxKeyRef.current) {
      if (map.getLayer(layerId)) {
        setLayerVisibility(map, [layerId], true)
        return
      }
      if (txInFlightKeyRef.current === bboxKey) return
    }
    txBboxKeyRef.current = bboxKey
    txInFlightKeyRef.current = bboxKey

    if (txFetchTimerRef.current != null) window.clearTimeout(txFetchTimerRef.current)
    txAbortRef.current?.abort()
    const abortController = new AbortController()
    txAbortRef.current = abortController

    txFetchTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const limit = mapZoom >= 9 ? 900 : mapZoom >= 7 ? 600 : 350
          const res = await fetch(`/api/oei/transmission-lines-global?bbox=${encodeURIComponent(effectiveBbox.join(","))}&limit=${limit}`, {
            cache: "default",
            signal: abortController.signal,
          })
          if (!res.ok || abortController.signal.aborted || !isMapStyleReady(map) || txBboxKeyRef.current !== bboxKey) return
          const data = await res.json()
          if (abortController.signal.aborted || !isMapStyleReady(map) || txBboxKeyRef.current !== bboxKey) return
          const features = (data.lines || []).slice(0, limit).map((line: any, index: number) => ({
            type: "Feature" as const,
            id: line.id || `tx-bbox-${index}`,
            properties: {
              id: line.id || `tx-bbox-${index}`,
              name: line.name || line.operator || "Transmission line",
              operator: line.operator,
              voltage_kv: line.voltage_kv,
              status: line.status,
              country: line.country,
              source: line.source || "transmission-lines-multi",
            },
            geometry: { type: "LineString" as const, coordinates: line.coordinates || [] },
          })).filter((feature: any) => Array.isArray(feature.geometry.coordinates) && feature.geometry.coordinates.length >= 2)
          if (features.length === 0) txBboxKeyRef.current = ""
          const fc = { type: "FeatureCollection" as const, features }

          if (!isMapStyleReady(map) || txBboxKeyRef.current !== bboxKey) return
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: "geojson", data: emptyFc, generateId: false })
          }
          if (!map.getLayer(layerId)) {
            map.addLayer({
              id: layerId,
              type: "line",
              source: sourceId,
              minzoom: 5,
              paint: {
                "line-color": [
                  "interpolate", ["linear"],
                  ["coalesce", ["to-number", ["get", "voltage_kv"]], 0],
                  0, "#38bdf8",
                  69, "#fb923c",
                  138, "#ec4899",
                  230, "#a855f7",
                  345, "#60a5fa",
                  500, "#22d3ee",
                  735, "#ffffff",
                ],
                "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.7, 8, 1.1, 11, 1.8, 15, 2.6],
                "line-opacity": 0.78,
              },
            })
          }
          ;(map.getSource(sourceId) as any)?.setData?.(fc)
          setLayerVisibility(map, [layerId], true)

          if (!loadedRef.current.txBboxHandlers) {
            loadedRef.current.txBboxHandlers = true
            map.on("mousemove", layerId, () => {
              try { map.getCanvas().style.cursor = "pointer" } catch { /* ignore */ }
            })
            map.on("mouseleave", layerId, () => {
              try { map.getCanvas().style.cursor = "" } catch { /* ignore */ }
            })
            map.on("click", layerId, (event: any) => {
              const feature = event.features?.[0]
              const properties = feature?.properties
              if (!properties) return
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") {
                hook({
                  type: "transmission_line",
                  id: properties.id,
                  name: properties.name || "Transmission line",
                  lat: event.lngLat?.lat,
                  lng: event.lngLat?.lng,
                  properties: { ...properties },
                })
              }
            })
          }
          console.log(`[ProposalOverlays] bbox transmission lines: ${features.length} loaded`)
        } catch (error: any) {
          if (error?.name !== "AbortError") console.warn("[ProposalOverlays/txLinesBbox]", error?.message || error)
        } finally {
          if (txInFlightKeyRef.current === bboxKey) txInFlightKeyRef.current = ""
        }
      })()
    }, 650)

    return () => {
      if (txFetchTimerRef.current != null) window.clearTimeout(txFetchTimerRef.current)
      txAbortRef.current?.abort()
      if (txInFlightKeyRef.current === bboxKey) txInFlightKeyRef.current = ""
    }
  }, [map, styleReadyTick, enabled.txLinesGlobal, bbox, mapZoom])

  // PMTiles archive paints the world-scale catalog; this fills in fresh
  // OpenCelliD + FCC ASR + OSM results for the current viewport when the
  // operator is zoomed in (bbox prop defined above zoom 5).
  useEffect(() => {
    if (!map) return
    const sourceId = "crep-celltowers-bbox"
    const layerId = "crep-celltowers-bbox-dot"
    const emptyFc = { type: "FeatureCollection" as const, features: [] as any[] }
    const clearBboxLayer = () => {
      setLayerVisibility(map, [layerId], false)
      try { (map.getSource(sourceId) as any)?.setData?.(emptyFc) } catch { /* ignore style teardown */ }
    }
    const effectiveBbox = bboxFromMap(map, mapZoom) ?? bboxFromUrl(mapZoom) ?? bbox
    if (!enabled.cellTowersG || !effectiveBbox || mapZoom < TELECOM_DETAIL_MIN_ZOOM) {
      cellTowerBboxKeyRef.current = ""
      cellTowerInFlightKeyRef.current = ""
      cellTowerAbortRef.current?.abort()
      clearBboxLayer()
      return
    }
    if (!isMapStyleReady(map)) return

    const zoomBand = mapZoom >= 10 ? 10 : mapZoom >= 8 ? 8 : mapZoom >= 6 ? 6 : 5
    const precision = mapZoom >= 10 ? 3 : mapZoom >= 8 ? 2 : 1
    const bboxKey = `${zoomBand}:${effectiveBbox.map((v) => v.toFixed(precision)).join(",")}`
    if (bboxKey === cellTowerBboxKeyRef.current) {
      if (map.getLayer(layerId)) {
        setLayerVisibility(map, [layerId], true)
        return
      }
      if (cellTowerInFlightKeyRef.current === bboxKey) return
    }
    cellTowerBboxKeyRef.current = bboxKey
    cellTowerInFlightKeyRef.current = bboxKey

    if (cellTowerFetchTimerRef.current != null) window.clearTimeout(cellTowerFetchTimerRef.current)
    cellTowerAbortRef.current?.abort()
    const abortController = new AbortController()
    cellTowerAbortRef.current = abortController

    cellTowerFetchTimerRef.current = window.setTimeout(() => {
      void (async () => {
        try {
          const limit = mapZoom >= 10 ? 450 : mapZoom >= 8 ? 300 : mapZoom >= 6 ? 180 : 100
          const res = await fetch(`/api/oei/cell-towers-global?bbox=${encodeURIComponent(effectiveBbox.join(","))}&limit=${limit}`, {
            cache: "default",
            signal: abortController.signal,
          })
          if (!res.ok || abortController.signal.aborted || !isMapStyleReady(map) || cellTowerBboxKeyRef.current !== bboxKey) return
          const data = await res.json()
          if (abortController.signal.aborted || !isMapStyleReady(map) || cellTowerBboxKeyRef.current !== bboxKey) return
          const features = (data.towers || []).slice(0, limit).map((tower: any, index: number) => ({
            type: "Feature" as const,
            id: tower.id || `celltower-bbox-${index}`,
            properties: {
              id: tower.id || `celltower-bbox-${index}`,
              name: tower.name || tower.operator || "Cell tower",
              operator: tower.operator,
              radio: tower.radio,
              height_m: tower.height_m,
              structure_type: tower.structure_type,
              source: Array.isArray(tower.sources) ? tower.sources.join(", ") : tower.source || "cell-towers-multi",
            },
            geometry: { type: "Point" as const, coordinates: [tower.lng, tower.lat] },
          })).filter((feature: any) => (
            Number.isFinite(feature.geometry.coordinates[0]) &&
            Number.isFinite(feature.geometry.coordinates[1])
          ))
          if (features.length === 0) cellTowerBboxKeyRef.current = ""
          const fc = { type: "FeatureCollection" as const, features }

          if (!isMapStyleReady(map) || cellTowerBboxKeyRef.current !== bboxKey) return
          if (!map.getSource(sourceId)) {
            map.addSource(sourceId, { type: "geojson", data: emptyFc, generateId: false })
          }
          if (!map.getLayer(layerId)) {
            map.addLayer({
              id: layerId,
              type: "circle",
              source: sourceId,
              minzoom: TELECOM_DETAIL_MIN_ZOOM,
              paint: {
                "circle-radius": [
                  "interpolate", ["linear"], ["zoom"],
                  5, ["case", ["boolean", ["feature-state", "hover"], false], 2, 1.1],
                  8, ["case", ["boolean", ["feature-state", "hover"], false], 3, 1.6],
                  12, ["case", ["boolean", ["feature-state", "hover"], false], 4.5, 2.3],
                  16, ["case", ["boolean", ["feature-state", "hover"], false], 6, 3],
                ],
                "circle-color": "#39ff14",
                "circle-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 1, 0.82],
                "circle-stroke-color": "#ffffff",
                "circle-stroke-width": ["case", ["boolean", ["feature-state", "hover"], false], 1.2, 0.35],
                "circle-stroke-opacity": 0.65,
              },
            })
          }
          ;(map.getSource(sourceId) as any)?.setData?.(fc)
          setLayerVisibility(map, [layerId], true)

          if (!loadedRef.current.cellTowerBboxHandlers) {
            loadedRef.current.cellTowerBboxHandlers = true
            let hoveredId: string | number | null = null
            const setHover = (id: string | number | null, hover: boolean) => {
              if (id == null) return
              try { map.setFeatureState({ source: sourceId, id }, { hover }) } catch { /* ignore transient source reset */ }
            }
            map.on("mousemove", layerId, (event: any) => {
              const feature = event.features?.[0]
              if (!feature) return
              if (hoveredId !== feature.id) {
                setHover(hoveredId, false)
                hoveredId = feature.id ?? null
                setHover(hoveredId, true)
              }
              try { map.getCanvas().style.cursor = "pointer" } catch { /* ignore */ }
            })
            map.on("mouseleave", layerId, () => {
              setHover(hoveredId, false)
              hoveredId = null
              try { map.getCanvas().style.cursor = "" } catch { /* ignore */ }
            })
            map.on("click", layerId, (event: any) => {
              const feature = event.features?.[0]
              const properties = feature?.properties
              if (!properties) return
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") {
                hook({
                  type: "cell_tower",
                  id: properties.id,
                  name: properties.name || `Cell Tower ${properties.id || ""}`.trim(),
                  lat: event.lngLat?.lat ?? feature.geometry?.coordinates?.[1],
                  lng: event.lngLat?.lng ?? feature.geometry?.coordinates?.[0],
                  properties: { ...properties },
                })
              }
            })
          }
          console.log(`[ProposalOverlays] bbox cell towers: ${features.length} loaded`)
        } catch (error: any) {
          if (error?.name !== "AbortError") console.warn("[ProposalOverlays/cellTowersG]", error?.message || error)
        } finally {
          if (cellTowerInFlightKeyRef.current === bboxKey) cellTowerInFlightKeyRef.current = ""
        }
      })()
    }, 650)

    return () => {
      if (cellTowerFetchTimerRef.current != null) window.clearTimeout(cellTowerFetchTimerRef.current)
      cellTowerAbortRef.current?.abort()
      if (cellTowerInFlightKeyRef.current === bboxKey) cellTowerInFlightKeyRef.current = ""
    }
  }, [map, styleReadyTick, enabled.cellTowersG, bbox, mapZoom])

  // ─── 8. Statistical Debris Cloud ───────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-debris-cloud-heat"]
    if (!enabled.debrisCloud) {
      setLayerVisibility(map, layerIds, false)
      return
    }
    if (loadedRef.current.debrisCloud) {
      setLayerVisibility(map, layerIds, true)
      return
    }
    if (!isMapStyleReady(map)) return
    loadedRef.current.debrisCloud = true

    idleLoad(async () => {
      try {
        if (!isMapStyleReady(map)) return
        const res = await fetch("/api/oei/debris?mode=statistical&totalBudget=80000")
        if (!res.ok) return
        const j = await res.json()
        const features = (j.samples || []).map((p: any) => ({
          type: "Feature" as const,
          properties: { band: p.band, alt: p.alt_km },
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-debris-cloud")) {
          map.addSource("crep-debris-cloud", { type: "geojson", data: fc })
          map.addLayer({
            id: "crep-debris-cloud-heat", type: "heatmap", source: "crep-debris-cloud",
            paint: {
              "heatmap-weight": 1, "heatmap-intensity": 0.8, "heatmap-opacity": 0.45,
              "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 4, 5, 8, 12],
              "heatmap-color": [
                "interpolate", ["linear"], ["heatmap-density"],
                0, "rgba(0,0,0,0)",
                0.2, "rgba(168,85,247,0.2)",
                0.5, "rgba(217,70,239,0.5)",
                0.8, "rgba(236,72,153,0.7)",
                1, "rgba(253,224,71,0.9)",
              ],
            },
          })
        } else {
          (map.getSource("crep-debris-cloud") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] statistical debris cloud: ${features.length} canvas points (represents ~1.2M objects)`)
      } catch (e: any) { console.warn("[ProposalOverlays/debrisCloud]", e.message) }
    })
  }, [map, styleReadyTick, enabled.debrisCloud])

  // ─── 9. Bathymetry + Topography underlay (GEBCO 2024) ──────────────────
  // GEBCO's WMTS is the canonical free global ocean-depth + land-elevation
  // map. Renders underneath all other layers so cell towers / cables /
  // fires still sit on top, but oceans + mountain ranges get texture.
  //
  // Apr 19, 2026 (Morgan): must be toggle-able on/off from the filter
  // panel. Effect now handles BOTH enable (attach + set visible) and
  // disable (set visibility: "none" on existing layer — cheaper than
  // remove/re-add across many toggles).
  useEffect(() => {
    if (!map) return
    // Keep topography attach strict: this layer uses raster-dem + hillshade
    // and is more sensitive to style bootstrap races than plain raster layers.
    const mapReady = () => {
      try {
        return Boolean(map.isStyleLoaded?.())
      } catch {
        return false
      }
    }
    if (!mapReady()) return

    // Disable path: hide bathymetry raster after first attach. On first-load
    // bootstrap we still attach once so refresh never waits on a filter click.
    if (!enabled.bathymetry && loadedRef.current.bathymetry) {
      try {
        if (map.getLayer("crep-bathymetry-raster")) {
          map.setLayoutProperty("crep-bathymetry-raster", "visibility", "none")
        }
        if (map.getLayer("crep-land-mask-10m-fill")) {
          // Keep mask hidden with bathymetry OFF; otherwise land can appear blank.
          map.setLayoutProperty("crep-land-mask-10m-fill", "visibility", "none")
        }
      } catch { /* ignore */ }
      return
    }

    // Enable path: attach once, or flip visibility back to visible.
    if (loadedRef.current.bathymetry) {
      try {
        if (map.getLayer("crep-bathymetry-raster")) {
          map.setLayoutProperty("crep-bathymetry-raster", "visibility", "visible")
          if (map.getLayer("crep-land-mask-10m-fill")) {
            map.setLayoutProperty("crep-land-mask-10m-fill", "visibility", "visible")
          }
          return
        }
      } catch { /* ignore */ }
      loadedRef.current.bathymetry = false
    }

    // Apr 20, 2026 (Morgan: "in live i see bathymetry off part of land but
    // its got many layers not actually on land or water its wrong that
    // coastline data is vital and has to be perfect you can see in san
    // diego its not lined up with coastline islands ect ... the map layers
    // should be additive layers overlaying in opacity not walking over
    // the filters").
    //
    // Previous approach (opaque Natural Earth land-mask fill on top of
    // bathymetry) was wrong TWO ways:
    //   1. NE 1:50m is too low-res — San Diego's Shelter Island,
    //      Coronado, Point Loma aren't in the polygon set.
    //   2. An opaque fill over "land" walks over everything ELSE the
    //      user wants visible on land — satellite imagery, road labels,
    //      city polygons, etc. It's not an additive layer, it's a
    //      subtractive one.
    //
    // Correct architecture: insert bathymetry BELOW the basemap's own
    // land layer. Carto Dark Matter uses OSM land polygons at OSM
    // resolution (~10 m accuracy, includes every island and inlet). By
    // slotting bathymetry right after the basemap's water fill but
    // BEFORE its landcover/landuse fill, the basemap's OWN land polygons
    // do the masking — with perfect coastline precision for Navy buoys,
    // sea cable landings, etc. And because landcover is a SINGLE layer
    // (not opaque-over-everything), other overlays (satellite imagery,
    // hillshade, point markers) still composite additively above it.
    //
    // No separate land-mask geojson fetched here. NE 1:10m land is
    // committed at /data/crep/ne_10m_land.geojson for feature-level use
    // later (coastline line layer, click-to-identify land vs ocean, etc.)
    // but NOT used as a mask anymore.
    // Apr 20, 2026 (Morgan v3): "live site has broken bathymetry issue still
    // and satelite imagry hd when on has the basic map squares from base
    // map over them that needs to be on top its covering actual rooftops
    // from hd sat images thats dumb".
    //
    // Root cause of both: Carto Dark Matter basemap has NO dedicated
    // landcover fill — land is just the background color, with water,
    // roads, and labels on top. So my `/^(landcover|landuse|...)$/` regex
    // matched nothing and fell through to "first symbol", meaning
    // bathymetry inserted BEFORE labels → above everything INCLUDING land.
    // And sat imagery inserted BEFORE first road → roads were drawn OVER
    // the aerial photos, covering rooftops.
    //
    // Correct insertion points:
    //   SAT IMAGERY — must go ABOVE basemap roads/buildings (so aerial
    //     covers rooftops) and BELOW labels (so place names still read).
    //     Helper: findInsertionPointBeforeLabels() → first symbol layer.
    //   BATHYMETRY — must go ABOVE everything in the basemap (roads,
    //     water, etc.) and BELOW labels. Paired with a land mask so
    //     bathymetry is VISIBLE only over water.
    //   LAND MASK for bathymetry — uses ne_10m_land.geojson (10 MB,
    //     committed, ~10 m coastline accuracy — every island, bay,
    //     inlet). Inserted JUST ABOVE bathymetry. Dark-basemap-matching
    //     color #08111f so it blends invisibly with the basemap land
    //     tone. Additive: sat imagery inserted with same beforeId will
    //     stack ABOVE the land mask, so aerial on land is fully visible
    //     (it covers the mask + basemap entirely).
    const findInsertionPointBeforeLabels = (): string | undefined => {
      try {
        const style = map.getStyle()
        const layers = style.layers as any[]
        const sym = layers.find((l) => l.type === "symbol")
        return sym?.id
      } catch { return undefined }
    }
    // Apr 20, 2026 (Morgan v4): "the dark road lines are actually ok but
    // they need to be different for structures the sat map data is better
    // then a square dark box but the roads the lines are good for bad sat
    // images ect". → sat imagery must go ABOVE building polygons (so
    // rooftops show from aerial) but BELOW road lines (so roads overlay
    // the aerial for nav reference). Helper finds the first road/
    // highway/bridge/tunnel layer in the basemap.
    const findInsertionPointBeforeRoads = (): string | undefined => {
      try {
        const style = map.getStyle()
        const layers = style.layers as any[]
        for (const l of layers) {
          if (!l?.id) continue
          if (/^(road|highway|bridge|tunnel|motorway|transit)/i.test(l.id)) {
            return l.id
          }
        }
        // Fallback to label position if no road layer found (unusual basemap).
        const sym = layers.find((l) => l.type === "symbol")
        return sym?.id
      } catch { return undefined }
    }
    // Attach high-res land mask to clip bathymetry at ~10 m coastline
    // accuracy. Only fetched once; persists across bathymetry toggles.
    //
    // Apr 20, 2026 fix (Morgan: "satelite shows then goes away"):
    // the 10 MB ne_10m_land.geojson takes 1-3 s to fetch. If sat imagery
    // was attached FIRST (before the mask load completes), the mask used
    // to insert with beforeId=firstRoad, which put it ABOVE sat imagery
    // in the stack (MapLibre's addLayer inserts right BEFORE beforeId,
    // so the more recent insert wins visually within the same slot).
    // Result: sat imagery showed on first paint, then the mask landed
    // and covered it on every land pixel.
    //
    // Fix: before inserting the mask, check if sat imagery is already
    // attached. If yes, use its layer id as the beforeId so the mask
    // slots BELOW it. Otherwise fall back to the supplied beforeId
    // (first road), which is correct when bathymetry is the only
    // thing that wants clipping.
    const attachLandMask = async (beforeId: string | undefined) => {
      const existingMask = map.getSource("crep-land-mask-10m") as any
      if (existingMask && landMaskResolutionRef.current === "10m") return
      try {
        // Coastline correctness matters more than saving the 10m payload.
        // Always try Natural Earth 1:10m first so bays, islands, ports,
        // and inlets do not show a blocky 1:50m cutoff after zoom.
        const URLS = [
          "/data/crep/ne_10m_land.geojson",
          "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson",
          "/data/crep/ne_50m_land.geojson",
        ]
        let data: any = null
        let selectedResolution: "10m" | "50m" = "10m"
        for (const u of URLS) {
          try {
            const r = await fetch(u, { signal: AbortSignal.timeout(20_000) })
            if (r.ok) {
              data = await r.json()
              selectedResolution = u.includes("ne_50m") ? "50m" : "10m"
              break
            }
          } catch { /* try next */ }
        }
        if (!data) return
        if (existingMask?.setData) {
          existingMask.setData(data)
          landMaskResolutionRef.current = selectedResolution
          console.log(`[ProposalOverlays] land mask upgraded (${selectedResolution})`)
          return
        }
        if (!map.getSource("crep-land-mask-10m")) {
          let effectiveBeforeId = beforeId
          try {
            // Keep land mask below topography/satellite so it only clips
            // bathymetry, never blacks out land overlays.
            if (map.getLayer("crep-topo-hillshade")) {
              effectiveBeforeId = "crep-topo-hillshade"
            } else if (map.getLayer("crep-satimagery-raster")) {
              effectiveBeforeId = "crep-satimagery-raster"
            }
          } catch { /* ignore */ }
          map.addSource("crep-land-mask-10m", { type: "geojson", data })
          map.addLayer({
            id: "crep-land-mask-10m-fill",
            type: "fill",
            source: "crep-land-mask-10m",
            paint: {
              "fill-color": "#08111f",
              "fill-opacity": 1.0,
              "fill-antialias": true,
            },
          }, effectiveBeforeId)
          landMaskResolutionRef.current = selectedResolution
          console.log(`[ProposalOverlays] land mask attached (${selectedResolution}, beforeId=${effectiveBeforeId || "TOP"})`)
        }
      } catch (e: any) {
        console.warn("[ProposalOverlays/land-mask]", e.message)
      }
    }

    void (async () => {
      try {
        const srcId = "crep-bathymetry"
        if (map.getSource(srcId) && !map.getLayer("crep-bathymetry-raster")) {
          try { map.removeSource(srcId) } catch { /* retry with a clean source */ }
        }
        // Insert BEFORE first road layer so bathymetry sits above the
        // basemap water + any building polygons, but BELOW road lines +
        // labels. Land mask inserts right after with same beforeId →
        // stacks on top within the slot (clips bathymetry at the
        // coastline). Sat imagery, if enabled, inserts on top of the
        // mask so aerial rooftops show on land. Roads + place labels
        // remain on top of everything for navigation reference.
        //
        // Apr 20, 2026 fix (Morgan: "satelite shows then goes away"):
        // If the user toggles bathymetry on AFTER sat imagery is already
        // attached, naïvely inserting bathymetry before the first road
        // layer places it ABOVE sat (sat was added before firstRoad
        // earlier; new bathy add with beforeId=firstRoad goes right
        // before it in the stack). That wipes sat. Fix: if sat layer
        // exists, slot bathymetry BELOW it so sat keeps rendering.
        let bathyBeforeId = findInsertionPointBeforeRoads()
        try {
          if (map.getLayer("crep-topo-hillshade")) {
            bathyBeforeId = "crep-topo-hillshade"
          } else if (map.getLayer("crep-satimagery-raster")) {
            bathyBeforeId = "crep-satimagery-raster"
          }
        } catch { /* ignore */ }
        if (!map.getSource(srcId)) {
          // Apr 19, 2026 (Morgan: "modify those bathymetry topology to
          // show the highest quality newest ones in their respective
          // areas"). Upgraded bathymetry source stack:
          //   1. EMODnet Bathymetry 2024 — highest resolution (25 m) over
          //      Europe + North Atlantic + coastal. Fallback to ESRI
          //      elsewhere.
          //   2. ESRI World Ocean Base — global coverage, uses GEBCO 2022+
          //      as its foundation, free and no key. Designed as a
          //      bathymetric basemap with muted land tones — so the AWS
          //      Terrain hillshade dominates visually on land (Morgan's
          //      "bathymetry cannot overlap land topology" rule).
          // MapLibre rotates through candidate URLs when a tile 404s,
          // so adding EMODnet first as the primary gets us ~25 m detail
          // where it's available + falls back to ESRI's 2022 GEBCO tiles.
          // Apr 19, 2026 (Morgan local: 15+ console errors "AJAXError: Failed
          // to fetch (0): https://tiles.emodnet-bathymetry.eu/..."). EMODnet
          // tile server fails consistently from Morgan's network (CORS /
          // regional block). MapLibre's tiles array is round-robin (not
          // fallback), so every tile rotation still hit EMODnet. Removed
          // entirely — ESRI World Ocean Base alone now. ESRI covers the
          // globe with GEBCO 2022+ as its foundation; EMODnet's value-add
          // (25 m European resolution) isn't worth 15 errors/sec.
          map.addSource(srcId, {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/arcgis/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            scheme: "xyz",
            attribution: "© Esri · GEBCO",
            minzoom: 0,
            maxzoom: 14,
          })
          map.addLayer(
            {
              id: "crep-bathymetry-raster",
              type: "raster",
              source: srcId,
              layout: { visibility: "visible" },
              paint: {
                // Apr 20, 2026 (Morgan fix v2): basemap landcover above this
                // layer now handles the coastline clip. No need to push
                // opacity/saturation hard — ocean blues can be full color
                // and the basemap's OSM land polygons hide everything over
                // land. Keeping opacity at 0.65 so operator can still see
                // road vectors etched into the ocean-edge areas (useful
                // for harbor zones where bathymetry + port infra overlap).
                "raster-opacity": 0.65,
                "raster-fade-duration": 150,
              },
            },
            bathyBeforeId,
          )
        }
        // Land mask above bathymetry → clips it at the coastline (NE 1:10m,
        // ~10 m precision). Without this, Carto Dark Matter has no
        // dedicated landcover layer so bathymetry walks over every
        // continent.
        await attachLandMask(bathyBeforeId)
        try {
          // Re-assert stack order on every enable/toggle path:
          // bathymetry < land-mask < topography/satellite.
          if (bathyBeforeId && map.getLayer("crep-bathymetry-raster")) {
            map.moveLayer("crep-bathymetry-raster", bathyBeforeId)
          }
          if (map.getLayer("crep-land-mask-10m-fill")) {
            if (bathyBeforeId) {
              map.moveLayer("crep-land-mask-10m-fill", bathyBeforeId)
            }
            map.setLayoutProperty("crep-land-mask-10m-fill", "visibility", "visible")
          }
        } catch { /* ignore */ }
        loadedRef.current.bathymetry = true
        console.log(`[ProposalOverlays] bathymetry: ESRI ocean raster + NE 1:10m mask attached (beforeId=${bathyBeforeId || "TOP"})`)
      } catch (e: any) {
        loadedRef.current.bathymetry = false
        console.warn("[ProposalOverlays/bathymetry]", e.message)
      }
    })()
  }, [map, styleReadyTick, enabled.bathymetry])

  // ─── 9b. Land Topography — AWS Terrain Tiles → MapLibre hillshade ──────
  // Morgan asked for "topology maps on land and bathymetry on water … with
  // different level of high detail for both". GEBCO covers ocean well but
  // its land resolution is coarse (~200 m). AWS Terrain Tiles publishes the
  // Mapzen terrarium DEM globally at ~30 m, free, no key. Hand that to
  // MapLibre's native `hillshade` layer type and the GPU does the shading
  // — much crisper land relief than GEBCO.
  //
  // Toggle-able: on-by-default just like bathymetry; separate control so
  // users can turn off land hillshade if they want pure basemap.
  useEffect(() => {
    if (!map) return
    // Keep satellite attach strict to avoid early-style races that can make
    // the layer appear only after a later filter interaction.
    const mapReady = () => {
      try {
        return Boolean(map.isStyleLoaded?.())
      } catch {
        return false
      }
    }
    if (!mapReady()) return

    if (!enabled.topography && loadedRef.current.topography) {
      try {
        if (map.getLayer("crep-topo-hillshade")) map.setLayoutProperty("crep-topo-hillshade", "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.topography) {
      try {
        if (map.getLayer("crep-topo-hillshade")) {
          map.setLayoutProperty("crep-topo-hillshade", "visibility", "visible")
          return
        }
      } catch { /* ignore */ }
      loadedRef.current.topography = false
    }

    void (async () => {
      try {
        const srcId = "crep-topo-dem"
        if (map.getSource(srcId) && !map.getLayer("crep-topo-hillshade")) {
          try { map.removeSource(srcId) } catch { /* retry with a clean source */ }
        }
        if (!map.getSource(srcId)) {
          // Apr 19, 2026 (Morgan: "highest quality newest"). AWS Terrain
          // Tiles (Mapzen terrarium encoding, 30 m global DEM) is the
          // highest-res open DEM without an API key. Newer options
          // (Copernicus GLO-30 from ESA, 30 m post-2021; MapTiler
          // Terrain-RGB v2) require API keys or custom hosting — add
          // those here when MapTiler / OpenTopography keys land.
          // For now this is state-of-art free global topography.
          map.addSource(srcId, {
            type: "raster-dem",
            tiles: [
              "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            encoding: "terrarium",
            maxzoom: 15,
            attribution: "© Mapzen / AWS Terrain Tiles (30 m global DEM)",
          })
          // Place hillshade just above bathymetry (if present) but below
          // all point markers. Compute insertion point.
          const style = map.getStyle()
          const firstPointLayer = style.layers.find(
            (l: any) => l.type === "circle" || l.type === "symbol" || l.type === "line",
          ) as any
          const beforeId = firstPointLayer?.id
          map.addLayer(
            {
              id: "crep-topo-hillshade",
              type: "hillshade",
              source: srcId,
              layout: { visibility: "visible" },
              paint: {
                // Cool/warm shading accents highs + lows without obscuring
                // the basemap tiles. Opacity 0.45 so contours + labels
                // remain readable over mountains.
                "hillshade-shadow-color": "#0b1220",
                "hillshade-highlight-color": "#f8fafc",
                "hillshade-accent-color": "#27272a",
                "hillshade-illumination-direction": 335,
                "hillshade-exaggeration": 0.55,
              },
            },
            beforeId,
          )
        }
        map.setLayoutProperty("crep-topo-hillshade", "visibility", "visible")
        loadedRef.current.topography = true
        console.log(`[ProposalOverlays] topography: AWS Terrain Tiles hillshade attached (DEM z0–15)`)
      } catch (e: any) {
        loadedRef.current.topography = false
        console.warn("[ProposalOverlays/topography]", e.message)
      }
    })()
  }, [map, styleReadyTick, enabled.topography])

  // ─── 9c. Satellite Imagery HD — ESRI World Imagery ─────────────────────
  // Morgan: "we need google earth maps level high detail images of the
  // zoomed in satelite iamges as live as possible for all map".
  // ESRI's World Imagery service is public (no API key), serves to z19,
  // is refreshed from commercial + aerial imagery. Drop-in Google-Earth
  // replacement for the basemap tile layer.
  //
  // Placed ABOVE the basemap but BELOW all overlays + labels so it
  // replaces the gray basemap without hiding markers.
  useEffect(() => {
    if (!map) return
    const mapReady = () => isMapStyleReady(map)
    if (!mapReady()) return

    if (!enabled.satImagery && loadedRef.current.satImagery) {
      try {
        if (map.getLayer("crep-satimagery-raster")) map.setLayoutProperty("crep-satimagery-raster", "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.satImagery) {
      try {
        if (map.getLayer("crep-satimagery-raster")) {
          map.setLayoutProperty("crep-satimagery-raster", "visibility", "visible")
          return
        }
      } catch { /* ignore */ }
      loadedRef.current.satImagery = false
    }

    void (async () => {
      try {
        const srcId = "crep-satimagery"
        if (map.getSource(srcId) && !map.getLayer("crep-satimagery-raster")) {
          try { map.removeSource(srcId) } catch { /* retry with a clean source */ }
        }
        if (!map.getSource(srcId)) {
          // Apr 20, 2026 (Morgan: "Satelite Imagry HD filter is not working
          // at all huge problem ... the map layers should be additive layers
          // overlaying in opacity not walking over the filters"). Two fixes:
          //   1) URL normalised to lowercase 'arcgis' — services.arcgisonline.com
          //      case convention per ESRI's own docs. Some CDN nodes 404 on
          //      'ArcGIS' capitalisation.
          //   2) Insertion point: ABOVE basemap landcover (so aerial shows
          //      over land) but BELOW roads/building/labels (so road names
          //      + city labels still readable on top of the imagery).
          //      Previous behaviour inserted at `first crep-* layer` which
          //      was hit-or-miss — if no crep layers were attached yet,
          //      sat imagery went to the top of the stack and bathymetry
          //      + the old opaque land-mask fill both covered it on ocean
          //      AND land respectively. That's the "not working at all"
          //      symptom.
          map.addSource(srcId, {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri — World Imagery (DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo)",
            minzoom: 0,
            maxzoom: 19,
            scheme: "xyz",
          })
          // Apr 20, 2026 (Morgan v4): "dark road lines are actually ok but
          // they need to be different for structures the sat map data is
          // better then a square dark box". Insert BEFORE first road layer
          // (so roads DRAW OVER sat imagery for nav reference — Morgan
          // confirmed this is desired) but AFTER building polygons (so
          // sat rooftops aren't hidden by basemap building squares).
          const findBeforeRoads = (): string | undefined => {
            try {
              const style = map.getStyle()
              const layers = style.layers as any[]
              for (const l of layers) {
                if (!l?.id) continue
                if (/^(road|highway|bridge|tunnel|motorway|transit)/i.test(l.id)) {
                  return l.id
                }
              }
              const sym = layers.find((l) => l.type === "symbol")
              return sym?.id
            } catch { return undefined }
          }
          const beforeId = findBeforeRoads()
          map.addLayer(
            {
              id: "crep-satimagery-raster",
              type: "raster",
              source: srcId,
              layout: { visibility: "visible" },
              paint: {
                // Keep ocean bathymetry legible when satellite and
                // bathymetry are both on; land remains readable while the
                // bathymetry raster can still show through offshore.
                "raster-opacity": 0.72,
                "raster-fade-duration": 150,
              },
            },
            beforeId,
          )
          console.log(`[ProposalOverlays] satellite imagery (HD): ESRI World Imagery attached (beforeId=${beforeId || "TOP"}, z0–19)`)
        }
        map.setLayoutProperty("crep-satimagery-raster", "visibility", "visible")
        loadedRef.current.satImagery = true
      } catch (e: any) {
        loadedRef.current.satImagery = false
        console.warn("[ProposalOverlays/satImagery]", e.message)
      }
    })()
  }, [map, styleReadyTick, enabled.satImagery])

  // ─── 10. Railway Tracks — OpenRailwayMap global infrastructure ─────────
  // OpenRailwayMap publishes open raster tiles of OSM-tagged railway infra
  // (tracks, electrification, stations, signals). Use it as a themed
  // underlay above the basemap but below point markers. No API key.
  //
  // Toggle-able (see bathymetry comment): enable path attaches, disable
  // path flips visibility to "none".
  useEffect(() => {
    if (!map) return
    const mapReady = () => isMapStyleReady(map)
    if (!mapReady()) return
    const railwayVisible = Boolean(enabled.railwayTracks) && mapZoom >= RAILWAY_MIN_ZOOM
    if (!railwayVisible) {
      try { if (map.getLayer("crep-railway-raster")) map.setLayoutProperty("crep-railway-raster", "visibility", "none") } catch { /* ignore */ }
      if (!enabled.railwayTracks) return
    }
    if (loadedRef.current.railwayTracks) {
      try {
        if (map.getLayer("crep-railway-raster")) {
          map.setLayoutProperty("crep-railway-raster", "visibility", railwayVisible ? "visible" : "none")
        }
      } catch { /* ignore */ }
      return
    }
    if (!enabled.railwayTracks) return
    loadedRef.current.railwayTracks = true

    idleLoad(async () => {
      try {
        const srcId = "crep-railway"
        if (!map.getSource(srcId)) {
          map.addSource(srcId, {
            type: "raster",
            tiles: [
              "https://a.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
              "https://b.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
              "https://c.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png",
            ],
            tileSize: 256,
            attribution: "© OpenRailwayMap contributors",
            minzoom: 0,
            maxzoom: 19,
          })
          // Place railway tiles just under point markers but above basemap
          const style = map.getStyle()
          const firstPointLayer = style.layers.find(
            (l: any) => l.type === "circle" || l.type === "symbol",
          ) as any
          const beforeId = firstPointLayer?.id
          map.addLayer(
            {
              id: "crep-railway-raster",
              type: "raster",
              source: srcId,
              minzoom: RAILWAY_MIN_ZOOM,
              layout: {
                visibility: mapZoom >= RAILWAY_MIN_ZOOM ? "visible" : "none",
              },
              paint: { "raster-opacity": 0.75 },
            },
            beforeId,
          )
        }
        console.log(`[ProposalOverlays] railway tracks: OpenRailwayMap tiles attached`)
      } catch (e: any) { console.warn("[ProposalOverlays/railwayTracks]", e.message) }
    })
  }, [map, styleReadyTick, enabled.railwayTracks, mapZoom])

  // ─── 11. Railway Live Trains — Amtrak Track-A-Train ────────────────────
  // Amtrak publishes a public GeoJSON feed of active train positions (named
  // services, not commuter). Updates every ~30 s. Proxied through /api/oei/
  // railway-live to dodge CORS + add ETL-side caching. Starter feed; UK
  // Network Rail + EU HAFAS + GTFS-RT live-train feeds are §A.9.3 work.
  //
  // Toggle-able — same pattern as bathymetry/railwayTracks above.
  useEffect(() => {
    if (!map) return
    const mapReady = () => isMapStyleReady(map)
    if (!mapReady()) return
    if (!enabled.railwayTrains) {
      try {
        if (map.getLayer("crep-trains-live-square")) map.setLayoutProperty("crep-trains-live-square", "visibility", "none")
        if (map.getLayer("crep-trains-live-cars-line")) map.setLayoutProperty("crep-trains-live-cars-line", "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    // On re-enable, flip both icon and cars line visibility back on. On
    // first enable, loadedRef prevents duplicate initial attaches but the
    // 30 s polling interval still runs.
    if (loadedRef.current.railwayTrains) {
      try {
        if (map.getLayer("crep-trains-live-square")) map.setLayoutProperty("crep-trains-live-square", "visibility", "visible")
        if (map.getLayer("crep-trains-live-cars-line")) map.setLayoutProperty("crep-trains-live-cars-line", "visibility", "visible")
      } catch { /* ignore */ }
    } else {
      loadedRef.current.railwayTrains = true
    }

    let cancelled = false
    let paintInFlight = false

    // Apr 19, 2026 (Morgan: "live train must be a train icon with cars of
    // length if possible animated on the track"). We load a small SVG train
    // icon into the map image registry once, then use a symbol layer with
    // icon-rotate bound to the vehicle's heading so the train points the way
    // it is moving. A second "cars" layer below draws a rose line segment
    // along the heading bearing so each train reads as "locomotive + cars".
    // Trolleys get a green hue, buses grey; commuter rail (default) stays
    // rose. Symbol layer replaces the old circle.
    const loadTrainIcon = () => {
      const hasTrainIcon = () => safeHasImage(map, "train-icon")
      if (!mapReady() || hasTrainIcon() || loadedRef.current.railwayTrainIconLoading) return
      loadedRef.current.railwayTrainIconLoading = true
      // Inline SVG: side-view train silhouette with a headlamp, 64×32 px.
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="32" viewBox="0 0 64 32">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#e5e7eb"/>
    </linearGradient>
  </defs>
  <rect x="4" y="6" width="48" height="20" rx="4" ry="4" fill="url(#g)" stroke="#111827" stroke-width="1.5"/>
  <rect x="52" y="10" width="8" height="12" rx="2" fill="#111827"/>
  <circle cx="58" cy="16" r="2" fill="#fbbf24"/>
  <rect x="8" y="10" width="6" height="6" fill="#60a5fa"/>
  <rect x="18" y="10" width="6" height="6" fill="#60a5fa"/>
  <rect x="28" y="10" width="6" height="6" fill="#60a5fa"/>
  <rect x="38" y="10" width="6" height="6" fill="#60a5fa"/>
  <circle cx="12" cy="28" r="3" fill="#111827"/>
  <circle cx="24" cy="28" r="3" fill="#111827"/>
  <circle cx="36" cy="28" r="3" fill="#111827"/>
  <circle cx="48" cy="28" r="3" fill="#111827"/>
</svg>`.trim()
      const img = new Image(64, 32)
      img.onload = () => {
        loadedRef.current.railwayTrainIconLoading = false
        if (mapReady() && !hasTrainIcon()) {
          try {
            if (!safeHasImage(map, "train-icon")) map.addImage("train-icon", img as any, { pixelRatio: 2 })
          } catch { /* ignore */ }
        }
      }
      img.onerror = () => { loadedRef.current.railwayTrainIconLoading = false }
      img.src = `data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(svg) : Buffer.from(svg).toString("base64")}`
    }
    loadTrainIcon()

    const fetchAndPaint = async () => {
      if (paintInFlight) return
      paintInFlight = true
      try {
        const promoteTrainLayers = () => {
          for (const id of ["crep-trains-live-cars-line", "crep-trains-live-square"]) {
            try { if (map.getLayer(id)) map.moveLayer(id) } catch { /* style may be changing */ }
          }
        }
        const j = await fetchRailwayLiveCached()
        if (cancelled) return
        const features = (j.trains || []).map((t: any) => {
          const heading = Number(t.heading ?? 0) || 0
          // Estimate a "cars" trail: 40 m per car at 4 cars default for rail,
          // 1 car for bus/trolley. We draw a ~120 m line segment tailing the
          // locomotive in the opposite of the heading bearing. At low zoom
          // this compresses to a pixel or two but at street zoom it reads as
          // the carriage length.
          const carsMeters =
            t.vehicle_type === "bus" ? 18 :
            t.vehicle_type === "trolley" ? 90 :
            t.vehicle_type === "rail" ? 180 :
            160 // default commuter rail
          const lat = Number(t.lat ?? t.latitude)
          const lng = Number(t.lng ?? t.longitude)
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
          // Bearing is degrees clockwise from north. To tail the train we go
          // opposite (+180 deg). Convert to lat/lng offset using an
          // equirectangular approximation (fine at car-length distances).
          const tailBrg = ((heading + 180) % 360) * Math.PI / 180
          const dLat = (Math.cos(tailBrg) * carsMeters) / 111_320
          const dLng = (Math.sin(tailBrg) * carsMeters) / (111_320 * Math.cos(lat * Math.PI / 180))
          const id = String(t.id || t.trainNum || `${t.source || "train"}-${lat.toFixed(5)}-${lng.toFixed(5)}`)
          return {
            type: "Feature" as const,
            id,
            properties: {
              id,
              name: t.name || t.routeName,
              operator: t.operator || "Amtrak",
              vehicle_type: t.vehicle_type || "rail",
              speed_mph: t.speed ?? t.velocity,
              heading,
              state: t.state,
              status: t.status,
              source: t.source,
              // carLine tail vertex for the cars line layer — stored per
              // feature so the paint can read ["get", "tail_lng"] without an
              // extra source.
              tail_lat: lat + dLat,
              tail_lng: lng + dLng,
            },
            geometry: { type: "Point" as const, coordinates: [lng, lat] },
          }
        }).filter(Boolean) as any[]
        // Build a parallel LineString source for the cars tails. Each
        // feature connects the train's position to its tail vertex so the
        // line appears to trail the locomotive.
        const lineFeatures = features.map((f) => ({
          type: "Feature" as const,
          id: f.properties.id,
          properties: { id: f.properties.id, vehicle_type: f.properties.vehicle_type },
          geometry: {
            type: "LineString" as const,
            coordinates: [
              f.geometry.coordinates,
              [f.properties.tail_lng, f.properties.tail_lat],
            ],
          },
        }))
        const fc = { type: "FeatureCollection" as const, features }
        const fcLines = { type: "FeatureCollection" as const, features: lineFeatures }
        if (cancelled || !mapReady()) return
        if (!map.getSource("crep-trains-live")) {
          map.addSource("crep-trains-live", { type: "geojson", data: fc, promoteId: "id" } as any)
          map.addSource("crep-trains-live-cars", { type: "geojson", data: fcLines, promoteId: "id" } as any)
          // CARS line — drawn BEFORE the symbol so the icon sits on top of
          // its own tail.
          map.addLayer({
            id: "crep-trains-live-cars-line",
            type: "line",
            source: "crep-trains-live-cars",
            layout: {
              "line-cap": "round",
              "line-join": "round",
            },
            paint: {
              "line-color": [
                "match", ["get", "vehicle_type"],
                "bus", "#9ca3af",
                "trolley", "#22d3ee",
                "rail", "#f43f5e",
                "#f43f5e",
              ],
              "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14, 3, 18, 6],
              "line-opacity": 0.85,
              "line-blur": 0.4,
            },
          })
          // SYMBOL layer — train icon rotated to heading. Rotation alignment
          // "map" keeps the icon aligned with the actual track direction as
          // the user pans/tilts the map.
          map.addLayer({
            id: "crep-trains-live-square",
            type: "symbol",
            source: "crep-trains-live",
            layout: {
              "icon-image": "train-icon",
              "icon-size": ["interpolate", ["linear"], ["zoom"], 2, 0.15, 6, 0.22, 10, 0.35, 14, 0.55, 18, 0.9],
              "icon-rotate": ["get", "heading"],
              "icon-rotation-alignment": "map",
              "icon-allow-overlap": true,
              "icon-ignore-placement": true,
              // Icon is designed looking right (+X = forward). OpenStreetMap
              // bearing 0 = north, so we add -90 to align the drawing.
              "icon-offset": [0, 0],
              "symbol-placement": "point",
            },
            paint: {
              "icon-color": [
                "match", ["get", "vehicle_type"],
                "bus", "#9ca3af",
                "trolley", "#22d3ee",
                "#ffffff",
              ],
            } as any,
          })
          map.on("mouseenter", "crep-trains-live-square", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-trains-live-square", () => { map.getCanvas().style.cursor = "" })
          // Apr 19, 2026 (Morgan: "widgets for movement of trains or
          // trollyes if possible"). Click fires the global
          // __crep_selectAsset hook if present — the parent dashboard
          // (CREPDashboardClient) wires it to open the InfraAsset panel.
          // Fallback: dispatch a CustomEvent that other widget consumers
          // can subscribe to.
          map.on("click", "crep-trains-live-square", (e: any) => {
            const f = e.features?.[0]
            if (!f) return
            const p = f.properties || {}
            const coords = e.lngLat
            const payload = {
              type: "train",
              id: p.id,
              name: p.name || `Train ${p.id}`,
              lat: coords?.lat ?? 0,
              lng: coords?.lng ?? 0,
              properties: {
                operator: p.operator || "Amtrak",
                speed_mph: p.speed_mph,
                heading: p.heading,
                state: p.state,
                status: p.status,
              },
            }
            try {
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") hook(payload)
            } catch { /* ignore */ }
            try {
              window.dispatchEvent(new CustomEvent("crep:train:click", { detail: payload }))
            } catch { /* ignore */ }
          })
          promoteTrainLayers()
        } else {
          (map.getSource("crep-trains-live") as any).setData(fc)
          const lineSrc = map.getSource("crep-trains-live-cars")
          if (lineSrc) (lineSrc as any).setData(fcLines)
          promoteTrainLayers()
        }
        const byOp = (j.operators || {}) as Record<string, number>
        const ops = Object.entries(byOp).filter(([, n]) => n > 0).map(([k, n]) => `${k}:${n}`).join(" ")
        console.log(`[ProposalOverlays] railway live: ${features.length} vehicles (${ops || "—"})`)
      } catch (e: any) { console.warn("[ProposalOverlays/railwayTrains]", e.message) }
      finally {
        paintInFlight = false
      }
    }

    idleLoad(fetchAndPaint)
    // Re-poll every 30s while enabled
    const timer = setInterval(() => { if (enabled.railwayTrains) fetchAndPaint() }, 30_000)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [map, styleReadyTick, enabled.railwayTrains])

  // ─── 12. Drone No-Fly Zones — FAA UAS restricted + OpenAIP airspace ────
  // Polygon layer over restricted / prohibited / special-use airspace.
  // Colored by class: CTR red, CTA orange, TRA amber, parks green. See
  // /api/oei/drone-no-fly for the backend fetch (proxies OpenAIP + FAA).
  //
  // Toggle-able — enable path attaches once, disable path flips both fill
  // + outline layers to visibility: "none".
  useEffect(() => {
    if (!map) return
    const layerIds = ["crep-drone-no-fly-fill", "crep-drone-no-fly-outline", "crep-drone-no-fly-label"]
    if (!enabled.droneNoFly) {
      setLayerVisibility(map, layerIds, false)
      return
    }
    if (loadedRef.current.droneNoFly) {
      setLayerVisibility(map, layerIds, true)
      return
    }
    if (!isMapStyleReady(map)) return
    loadedRef.current.droneNoFly = true

    idleLoad(async () => {
      try {
        if (!isMapStyleReady(map)) return
        const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : ""
        const res = await fetch(`/api/oei/drone-no-fly?limit=5000${bboxParam}`)
        if (!res.ok) return
        const j = await res.json()
        const features = (j.zones || j.features || []).map((z: any) => ({
          type: "Feature" as const,
          properties: {
            id: z.id,
            name: z.name,
            airspace_class: z.airspace_class || z.class,
            alt_floor_ft: z.alt_floor_ft,
            alt_ceiling_ft: z.alt_ceiling_ft,
            source: z.source,
          },
          geometry: z.geometry,
        })).filter((f: any) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon"))
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-drone-no-fly")) {
          map.addSource("crep-drone-no-fly", { type: "geojson", data: fc })
          map.addLayer({
            id: "crep-drone-no-fly-fill",
            type: "fill",
            source: "crep-drone-no-fly",
            paint: {
              "fill-color": [
                "match", ["get", "airspace_class"],
                "CTR", "#ef4444",     // red — control zone
                "CTA", "#f97316",     // orange — controlled area
                "TRA", "#f59e0b",     // amber — temp restricted
                "PROHIBITED", "#dc2626",
                "RESTRICTED", "#f43f5e",
                "DANGER", "#b91c1c",
                "#22c55e",            // default: parks / misc = green
              ],
              "fill-opacity": 0.18,
            },
          })
          map.addLayer({
            id: "crep-drone-no-fly-outline",
            type: "line",
            source: "crep-drone-no-fly",
            paint: {
              "line-color": [
                "match", ["get", "airspace_class"],
                "CTR", "#ef4444",
                "CTA", "#f97316",
                "TRA", "#f59e0b",
                "PROHIBITED", "#dc2626",
                "RESTRICTED", "#f43f5e",
                "DANGER", "#b91c1c",
                "#22c55e",
              ],
              "line-width": 1.2,
              "line-opacity": 0.7,
              "line-dasharray": [2, 2],
            },
          })
          // Apr 21, 2026 (Morgan: "ALL NO FLY ZONE AND POLLUTION AND ANY
          // GRID NEEDS TO BE SELECTABLE AND HAVE LABELS"). Add label +
          // click-to-select dispatch so operator knows what's restricting
          // drone ops at this location.
          map.addLayer({
            id: "crep-drone-no-fly-label",
            type: "symbol",
            source: "crep-drone-no-fly",
            minzoom: 7,
            layout: {
              "text-field": [
                "concat",
                ["coalesce", ["get", "airspace_class"], "NOFLY"],
                "  ·  ",
                ["coalesce", ["get", "name"], "UAS zone"],
              ],
              "text-size": ["interpolate", ["linear"], ["zoom"], 7, 9, 13, 12],
              "text-anchor": "center",
              "text-allow-overlap": false,
              "text-optional": true,
              "text-letter-spacing": 0.04,
              "text-transform": "uppercase",
            } as any,
            paint: {
              "text-color": "#fecaca",
              "text-halo-color": "rgba(0,0,0,0.85)",
              "text-halo-width": 1.4,
            },
          })
          // Apr 21, 2026 (Morgan URGENT: "the drone no fly zone selection
          // stops any icons from being selected under it that cannot
          // happen"). The fill layer was intercepting clicks meant for
          // dots UNDER the zone. Click handler moved to outline + label
          // only — the fill itself is click-transparent. Outline lines
          // are thin and label is at the centroid, so cameras / power /
          // sensors / any dot inside the zone stay clickable.
          const onNoFlyClick = (e: any) => {
            const p = e.features?.[0]?.properties || {}
            const c = e.lngLat
            try {
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") {
                hook({
                  type: "drone_no_fly_zone",
                  id: p.id || `noFly-${c.lat}-${c.lng}`,
                  name: p.name || `${p.airspace_class || "UAS"} zone`,
                  lat: c?.lat ?? 0,
                  lng: c?.lng ?? 0,
                  properties: p,
                })
              }
            } catch { /* ignore */ }
          }
          map.on("click", "crep-drone-no-fly-outline", onNoFlyClick)
          map.on("click", "crep-drone-no-fly-label", onNoFlyClick)
          map.on("mouseenter", "crep-drone-no-fly-outline", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-drone-no-fly-outline", () => { map.getCanvas().style.cursor = "" })
          map.on("mouseenter", "crep-drone-no-fly-label", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-drone-no-fly-label", () => { map.getCanvas().style.cursor = "" })
        } else {
          (map.getSource("crep-drone-no-fly") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] drone no-fly zones: ${features.length} polygons`)
      } catch (e: any) { console.warn("[ProposalOverlays/droneNoFly]", e.message) }
    })
  }, [map, styleReadyTick, enabled.droneNoFly, bbox])

  // ─── 13. CCTV / Webcam feeds ──────────────────────────────────────────
  // Apr 20, 2026 (Morgan: "where are all cctv and widgets showing live
  // streams from those accessible cctv and webcams"). Cursor deployed
  // Shinobi on MAS VM (192.168.0.188:8080) + created MINDEX
  // `crep.cctv_cameras` table (bbox query + ingest endpoints). This layer
  // polls /api/oei/cctv which unions both sources and renders each camera
  // as a small cyan dot + eye glyph. Click fires __crep_selectAsset with
  // a "camera" type so the InfraAsset widget opens with the stream URL.
  useEffect(() => {
    if (!map) return
    const layerIds = CCTV_VISIBILITY_LAYER_IDS
    const cctvVisible = Boolean(enabled.cctv) && mapZoom >= CCTV_MIN_ZOOM && Boolean(bbox)
    if (!cctvVisible) {
      cctvAbortRef.current?.abort()
      cctvInFlightKeyRef.current = ""
      setLayerVisibility(map, layerIds, false)
      return
    }
    if (!isMapStyleReady(map)) return
    if (loadedRef.current.cctv) {
      setLayerVisibility(map, layerIds, true)
    }
    loadedRef.current.cctv = true

    const fetchAndPaint = async () => {
      const requestKey = bbox
        ? `${bbox.map((value) => Number(value).toFixed(4)).join(",")}|z${Math.round(mapZoom * 10) / 10}`
        : "none"
      const now = Date.now()
      const lastFetch = cctvLastFetchRef.current
      if (cctvInFlightKeyRef.current === requestKey) return
      if (lastFetch?.key === requestKey && now - lastFetch.ts < 12_000) return
      cctvInFlightKeyRef.current = requestKey
      cctvLastFetchRef.current = { key: requestKey, ts: now }
      cctvAbortRef.current?.abort()
      const abortController = new AbortController()
      cctvAbortRef.current = abortController
      const isCurrentRequest = () => (
        !abortController.signal.aborted &&
        cctvInFlightKeyRef.current === requestKey &&
        isMapStyleReady(map) &&
        Boolean(bbox) &&
        mapZoom >= CCTV_MIN_ZOOM
      )
      try {
        if (!isCurrentRequest()) return
        if (!bbox || mapZoom < CCTV_MIN_ZOOM) {
          setLayerVisibility(map, layerIds, false)
          return
        }
        const paintCameraPayload = async (legacyJson: any, eagleJson: any, logLabel: string) => {
          if (!isCurrentRequest()) return
          const byId = new Map<string, any>()
          for (const c of legacyJson.cameras || []) {
            const id = String(c.id || `${c.source || c.operator || "cctv"}-${c.lat}-${c.lng}`)
            byId.set(id, {
              id,
              name: c.name || "Camera",
              lat: c.lat,
              lng: c.lng,
              stream_url: c.stream_url,
              embed_url: c.embed_url,
              media_url: c.media_url,
              stream_type: c.stream_type,
              operator: c.operator,
              country: c.country,
              resolution: c.resolution,
              auth_required: c.auth_required,
              source: c.source,
            })
          }
          for (const c of eagleJson.sources || []) {
            const id = String(c.id || `${c.provider || "eagle"}-${c.lat}-${c.lng}`)
            byId.set(id, {
              id,
              name: c.name || `${c.provider || "Eagle Eye"} camera`,
              lat: c.lat,
              lng: c.lng,
              stream_url: c.stream_url,
              embed_url: c.embed_url,
              media_url: c.media_url,
              stream_type: c.stream_url ? "hls" : c.media_url ? "image" : c.embed_url ? "iframe" : undefined,
              operator: c.provider || "eagle-eye",
              country: c.country,
              resolution: c.resolution,
              auth_required: false,
              source: c.provider || "eagle-eye",
            })
          }
          const cameras = Array.from(byId.values())
          const features = cameras
            .filter((c: any) => Number.isFinite(c.lat) && Number.isFinite(c.lng))
            .map((c: any) => ({
              type: "Feature" as const,
              properties: {
                id: c.id,
                name: c.name || "Camera",
                stream_url: c.stream_url,
                embed_url: c.embed_url,
                media_url: c.media_url,
                stream_type: c.stream_type,
                operator: c.operator,
                country: c.country,
                resolution: c.resolution,
                auth_required: c.auth_required,
                source: c.source,
              },
              geometry: { type: "Point" as const, coordinates: [c.lng, c.lat] },
            }))
          const fc = { type: "FeatureCollection" as const, features }
          if (!isCurrentRequest()) return
          if (!map.getSource("crep-cctv")) {
            await ensureEagleCameraMapIcon(map)
            if (!isCurrentRequest()) return
            map.addSource("crep-cctv", { type: "geojson", data: fc, generateId: true })
            map.addLayer(eagleCameraHitLayer("crep-cctv", CCTV_LAYER_PREFIX) as any)
            map.addLayer(eagleCameraGlowLayer("crep-cctv", CCTV_LAYER_PREFIX) as any)
            map.addLayer(eagleCameraIconLayer("crep-cctv", CCTV_LAYER_PREFIX) as any)
            map.addLayer(eagleCameraLabelLayer("crep-cctv", CCTV_LAYER_PREFIX) as any)
            const onCctvClick = (e: any) => {
              const f = e.features?.[0]
              if (!f) return
              const p = f.properties || {}
              const c = e.lngLat
              const clickId = String(p.id || p.name || "camera")
              const clickAt = Number(e.originalEvent?.timeStamp || Date.now())
              const lastClick = (window as any).__crepLastCameraClick as { id?: string; ts?: number } | undefined
              if (lastClick?.id === clickId && Math.abs(clickAt - (lastClick.ts || 0)) < 450) return
              ;(window as any).__crepLastCameraClick = { id: clickId, ts: clickAt }
              try {
                const hook = (window as any).__crep_selectAsset
                if (typeof hook === "function") hook({
                  type: "camera",
                  id: p.id,
                  name: p.name || "Camera",
                  lat: c?.lat ?? 0,
                  lng: c?.lng ?? 0,
                  properties: p,
                })
              } catch { /* ignore */ }
              try {
                window.dispatchEvent(new CustomEvent("crep:camera:click", {
                  detail: {
                    ...p,
                    provider: p.operator || p.source || "cctv",
                    lat: c?.lat,
                    lng: c?.lng,
                    stream_url: p.stream_url,
                    embed_url: p.embed_url,
                    media_url: p.media_url,
                  },
                }))
                window.dispatchEvent(new CustomEvent("crep:eagle:camera-click", {
                  detail: {
                    ...p,
                    provider: p.operator || p.source || "cctv",
                    lat: c?.lat,
                    lng: c?.lng,
                    stream_url: p.stream_url,
                    embed_url: p.embed_url,
                    media_url: p.media_url,
                  },
                }))
              } catch { /* ignore */ }
            }
            for (const layerId of CCTV_CLICK_LAYER_IDS) {
              map.on("click", layerId, onCctvClick)
              map.on("mouseenter", layerId, () => { map.getCanvas().style.cursor = "pointer" })
              map.on("mouseleave", layerId, () => { map.getCanvas().style.cursor = "" })
            }
          } else {
            (map.getSource("crep-cctv") as any).setData(fc)
          }
          console.log(`[ProposalOverlays] CCTV ${logLabel}: ${features.length} cameras loaded (mindex=${legacyJson.sources?.mindex || 0}, shinobi=${legacyJson.sources?.shinobi || 0}, eagle=${eagleJson.total || 0})`)
        }

        const fastQuery = new URLSearchParams({ limit: CCTV_FAST_LIMIT, fast: "1", live: "0" })
        fastQuery.set("bbox", bbox.join(","))
        const fastRes = await fetch(`/api/eagle/sources?${fastQuery.toString()}`, {
          signal: abortController.signal,
          cache: "no-store",
        }).catch(() => null)
        if (!isCurrentRequest()) return
        const fastJson = fastRes?.ok ? await fastRes.json() : {}
        if (!isCurrentRequest()) return
        if (Array.isArray(fastJson.sources) && fastJson.sources.length > 0) {
          await paintCameraPayload({}, fastJson, "fast")
        }

        const cameraQuery = new URLSearchParams({ limit: CCTV_FULL_LIMIT, live: "0" })
        cameraQuery.set("bbox", bbox.join(","))
        const [legacyRes, eagleRes] = await Promise.all([
          fetch(`/api/oei/cctv?${cameraQuery.toString()}`, { signal: abortController.signal, cache: "no-store" }).catch(() => null),
          fetch(`/api/eagle/sources?${cameraQuery.toString()}`, { signal: abortController.signal, cache: "no-store" }).catch(() => null),
        ])
        if (!isCurrentRequest()) return
        const legacyJson = legacyRes?.ok ? await legacyRes.json() : {}
        const eagleJson = eagleRes?.ok ? await eagleRes.json() : fastJson
        if (!isCurrentRequest()) return
        await paintCameraPayload(legacyJson, eagleJson, "full")
      } catch (e: any) {
        console.warn("[ProposalOverlays/cctv]", e?.message)
      } finally {
        if (cctvInFlightKeyRef.current === requestKey) cctvInFlightKeyRef.current = ""
      }
    }

    idleLoad(fetchAndPaint)
    // Poll every 5 min — cameras move rarely but Shinobi monitor list may change
    const timer = setInterval(() => { if (enabled.cctv && mapZoom >= CCTV_MIN_ZOOM && bbox) fetchAndPaint() }, 300_000)
    return () => {
      cctvAbortRef.current?.abort()
      cctvInFlightKeyRef.current = ""
      clearInterval(timer)
    }
  }, [map, styleReadyTick, enabled.cctv, bbox, mapZoom])

  return null
}
