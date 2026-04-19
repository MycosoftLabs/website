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

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

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
    bathymetry?: boolean
    railwayTracks?: boolean
    railwayTrains?: boolean
    droneNoFly?: boolean
  }
  bbox?: [number, number, number, number]
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

export default function ProposalOverlays({ map, enabled, bbox }: Props) {
  const loadedRef = useRef<Record<string, boolean>>({})

  // ─── 1. Global Seaports ────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !enabled.ports) return
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function")
    if (!mapReady()) return
    if (loadedRef.current.ports) return
    loadedRef.current.ports = true

    idleLoad(async () => {
      try {
        const res = await fetch("/api/oei/ports?limit=5000")
        if (!res.ok) return
        const j = await res.json()
        const features = (j.ports || []).map((p: any) => ({
          type: "Feature" as const,
          properties: { id: p.id, name: p.name, country: p.country, unlocode: p.unlocode, type: p.type },
          geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
        }))
        if (!mapReady()) return
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-ports-global")) {
          map.addSource("crep-ports-global", { type: "geojson", data: fc })
          map.addLayer({
            id: "crep-ports-global-dot", type: "circle", source: "crep-ports-global",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2, 6, 4, 10, 7],
              "circle-color": "#14b8a6", "circle-opacity": 0.85,
              "circle-stroke-width": 1, "circle-stroke-color": "#f0fdfa",
            },
          })
        } else {
          (map.getSource("crep-ports-global") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] ports: ${features.length} loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/ports]", e.message) }
    })
  }, [map, enabled.ports])

  // ─── 2. Radar sites ────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !enabled.radar) return
    if (loadedRef.current.radar) return
    loadedRef.current.radar = true

    idleLoad(async () => {
      try {
        const res = await fetch("/api/oei/radar")
        if (!res.ok) return
        const j = await res.json()
        const features = (j.sites || []).map((s: any) => ({
          type: "Feature" as const,
          properties: { id: s.id, name: s.name, network: s.network, kind: s.kind, range_km: s.range_km },
          geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
        }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-radar")) {
          map.addSource("crep-radar", { type: "geojson", data: fc })
          // Coverage circle (approximate — based on range_km)
          map.addLayer({
            id: "crep-radar-range", type: "circle", source: "crep-radar",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 6, 12, 10, 28, 14, 60],
              "circle-color": "#38bdf8", "circle-opacity": 0.08,
              "circle-stroke-width": 1, "circle-stroke-color": "#38bdf8", "circle-stroke-opacity": 0.4,
            },
          })
          map.addLayer({
            id: "crep-radar-dot", type: "circle", source: "crep-radar",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 3, 6, 5, 10, 8],
              "circle-color": "#0ea5e9", "circle-opacity": 0.95,
              "circle-stroke-width": 1, "circle-stroke-color": "#ffffff",
            },
          })
        } else {
          (map.getSource("crep-radar") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] radar sites: ${features.length} loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/radar]", e.message) }
    })
  }, [map, enabled.radar])

  // ─── 3. Radio Stations ─────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !enabled.radioStations) return
    if (loadedRef.current.radio) return
    loadedRef.current.radio = true

    idleLoad(async () => {
      try {
        const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : ""
        const res = await fetch(`/api/oei/radio-stations?limit=5000${bboxParam}`)
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
          map.addLayer({
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
          })
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
  }, [map, enabled.radioStations, bbox])

  // ─── 4. Global Power Plants ───────────────────────────────────────────
  useEffect(() => {
    if (!map || !enabled.powerPlantsG) return
    if (loadedRef.current.plants) return
    loadedRef.current.plants = true

    idleLoad(async () => {
      try {
        const res = await fetch("/data/crep/power-plants-global.geojson", { cache: "force-cache" })
        if (!res.ok) return
        const fc = await res.json()
        if (!map.getSource("crep-plants-global")) {
          map.addSource("crep-plants-global", { type: "geojson", data: fc })
          map.addLayer({
            id: "crep-plants-global-dot", type: "circle", source: "crep-plants-global",
            minzoom: 3,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["get", "capacity_mw"],
                0, 2, 100, 3, 500, 4.5, 2000, 7, 5000, 10],
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
              ],
              "circle-opacity": 0.85, "circle-stroke-width": 0.5, "circle-stroke-color": "#fff",
            },
          })
        }
        console.log(`[ProposalOverlays] power plants: ${fc.features.length} loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/plants]", e.message) }
    })
  }, [map, enabled.powerPlantsG])

  // ─── 5. Factories ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!map || !enabled.factories || !bbox) return
    if (loadedRef.current.factories) return
    loadedRef.current.factories = true

    idleLoad(async () => {
      try {
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
          map.addLayer({
            id: "crep-factories-dot", type: "circle", source: "crep-factories",
            minzoom: 5,
            paint: {
              "circle-radius": 3, "circle-color": "#f97316",
              "circle-opacity": 0.6, "circle-stroke-width": 0.3, "circle-stroke-color": "#7c2d12",
            },
          })
        } else {
          (map.getSource("crep-factories") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] factories: ${features.length} loaded in bbox`)
      } catch (e: any) { console.warn("[ProposalOverlays/factories]", e.message) }
    })
  }, [map, enabled.factories, bbox])

  // ─── 6. Orbital Debris (catalogued) ────────────────────────────────────
  useEffect(() => {
    if (!map || !enabled.orbitalDebris) return
    if (loadedRef.current.debris) return
    loadedRef.current.debris = true

    idleLoad(async () => {
      try {
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
          map.addLayer({
            id: "crep-orbital-debris-dot", type: "circle", source: "crep-orbital-debris",
            paint: {
              "circle-radius": 1.5, "circle-color": "#d946ef",
              "circle-opacity": 0.7, "circle-blur": 0.2,
            },
          })
        } else {
          (map.getSource("crep-orbital-debris") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] tracked debris: ${features.length} loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/debris]", e.message) }
    })
  }, [map, enabled.orbitalDebris])

  // ─── 7b. Global Transmission Lines (bbox-scoped, non-US fill-in) ──────
  // The main dashboard already paints US HIFLD ≥345 kV from the static
  // bundle unconditionally. This adds OSM + MINDEX lines outside the US
  // when the operator zooms in. Gated at zoom>=3 via the dashboard's
  // bbox prop (mapZoom>5). Fetches bbox-scoped results to keep payloads
  // bounded on large viewports.
  useEffect(() => {
    if (!map || !enabled.txLinesGlobal || !bbox) return
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function")
    if (!mapReady()) return

    idleLoad(async () => {
      try {
        const res = await fetch(`/api/oei/transmission-lines-global?bbox=${bbox.join(",")}&limit=10000&includeOSM=true`)
        if (!res.ok) return
        const j = await res.json()
        const features = (j.lines || [])
          .filter((l: any) => Array.isArray(l.coordinates) && l.coordinates.length >= 2)
          .map((l: any) => ({
            type: "Feature" as const,
            properties: {
              id: l.id, operator: l.operator, voltage_kv: l.voltage_kv || 0,
              status: l.status, country: l.country, source: l.source,
            },
            geometry: { type: "LineString" as const, coordinates: l.coordinates },
          }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!mapReady()) return
        if (!map.getSource("crep-txlines-global")) {
          map.addSource("crep-txlines-global", { type: "geojson", data: fc })
          map.addLayer({
            id: "crep-txlines-global-line", type: "line", source: "crep-txlines-global",
            minzoom: 3,
            paint: {
              "line-color": ["interpolate", ["linear"], ["get", "voltage_kv"],
                0, "#9ca3af", 100, "#fb923c", 230, "#ec4899",
                345, "#60a5fa", 500, "#22d3ee", 735, "#ffffff"],
              "line-width": ["interpolate", ["linear"], ["get", "voltage_kv"],
                0, 0.8, 230, 1.5, 500, 2.2, 735, 3],
              "line-opacity": 0.75,
            },
          })
        } else {
          (map.getSource("crep-txlines-global") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] tx lines (global): ${features.length} loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/txLinesGlobal]", e.message) }
    })
  }, [map, enabled.txLinesGlobal, bbox])

  // ─── 7c. Global Cell Towers (bbox-scoped, supplements PMTiles bundle) ─
  // PMTiles archive paints the world-scale catalog; this fills in fresh
  // OpenCelliD + FCC ASR + OSM results for the current viewport when the
  // operator is zoomed in (bbox prop defined above zoom 5).
  useEffect(() => {
    if (!map || !enabled.cellTowersG || !bbox) return
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function")
    if (!mapReady()) return

    idleLoad(async () => {
      try {
        const res = await fetch(`/api/oei/cell-towers-global?bbox=${bbox.join(",")}&limit=5000`)
        if (!res.ok) return
        const j = await res.json()
        const features = (j.towers || [])
          .filter((t: any) => Number.isFinite(t.lat) && Number.isFinite(t.lng))
          .map((t: any) => ({
            type: "Feature" as const,
            properties: {
              id: t.id, operator: t.operator, radio: t.radio,
              mcc: t.mcc, source: t.source,
            },
            geometry: { type: "Point" as const, coordinates: [t.lng, t.lat] },
          }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!mapReady()) return
        if (!map.getSource("crep-celltowers-bbox")) {
          map.addSource("crep-celltowers-bbox", { type: "geojson", data: fc })
          map.addLayer({
            id: "crep-celltowers-bbox-dot", type: "circle", source: "crep-celltowers-bbox",
            minzoom: 5,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 2, 10, 3.5, 14, 6],
              "circle-color": "#c084fc", "circle-opacity": 0.85,
              "circle-stroke-width": 0.6, "circle-stroke-color": "#ffffff", "circle-stroke-opacity": 0.6,
            },
          })
        } else {
          (map.getSource("crep-celltowers-bbox") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] cell towers (bbox): ${features.length} loaded`)
      } catch (e: any) { console.warn("[ProposalOverlays/cellTowersG]", e.message) }
    })
  }, [map, enabled.cellTowersG, bbox])

  // ─── 8. Statistical Debris Cloud ───────────────────────────────────────
  useEffect(() => {
    if (!map || !enabled.debrisCloud) return
    if (loadedRef.current.debrisCloud) return
    loadedRef.current.debrisCloud = true

    idleLoad(async () => {
      try {
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
  }, [map, enabled.debrisCloud])

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
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function")
    if (!mapReady()) return

    // Disable path: layer is present but toggle flipped off.
    if (!enabled.bathymetry) {
      try {
        if (map.getLayer("crep-bathymetry-raster")) {
          map.setLayoutProperty("crep-bathymetry-raster", "visibility", "none")
        }
      } catch { /* ignore */ }
      return
    }

    // Enable path: attach once, or just flip visibility back to visible.
    if (loadedRef.current.bathymetry) {
      try {
        if (map.getLayer("crep-bathymetry-raster")) {
          map.setLayoutProperty("crep-bathymetry-raster", "visibility", "visible")
        }
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.bathymetry = true

    idleLoad(async () => {
      try {
        const srcId = "crep-bathymetry"
        if (!map.getSource(srcId)) {
          // GEBCO 2024 WMS tiles — shaded relief over ocean + land.
          // Public, attribution required. Alternative: NOAA ETOPO1.
          map.addSource(srcId, {
            type: "raster",
            tiles: [
              "https://wms.gebco.net/mapserv?request=GetMap&service=WMS&version=1.1.1&layers=GEBCO_LATEST_SUB_ICE_TOPO&styles=&format=image%2Fpng&srs=EPSG%3A3857&bbox={bbox-epsg-3857}&width=256&height=256",
            ],
            tileSize: 256,
            attribution: "GEBCO Bathymetry 2024",
            minzoom: 0,
            maxzoom: 9,
          })
          // Find the first non-basemap layer so we insert under it
          const style = map.getStyle()
          const firstOverlay = style.layers.find((l) => l.id.startsWith("crep-") && l.id !== "crep-boundaries-country") as any
          const beforeId = firstOverlay?.id
          map.addLayer(
            {
              id: "crep-bathymetry-raster",
              type: "raster",
              source: srcId,
              layout: { visibility: "visible" },
              paint: {
                // Low opacity so the basemap's contours still show through;
                // GEBCO provides just enough ocean-depth color to kill the
                // flat-gray-ocean problem Morgan reported.
                "raster-opacity": 0.45,
                "raster-brightness-min": 0.05,
                "raster-brightness-max": 0.95,
              },
            },
            beforeId,
          )
        }
        console.log(`[ProposalOverlays] bathymetry: GEBCO 2024 raster attached${
          map.getLayer("crep-bathymetry-raster") ? "" : " (layer missing)"
        }`)
      } catch (e: any) { console.warn("[ProposalOverlays/bathymetry]", e.message) }
    })
  }, [map, enabled.bathymetry])

  // ─── 10. Railway Tracks — OpenRailwayMap global infrastructure ─────────
  // OpenRailwayMap publishes open raster tiles of OSM-tagged railway infra
  // (tracks, electrification, stations, signals). Use it as a themed
  // underlay above the basemap but below point markers. No API key.
  //
  // Toggle-able (see bathymetry comment): enable path attaches, disable
  // path flips visibility to "none".
  useEffect(() => {
    if (!map) return
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function")
    if (!mapReady()) return
    if (!enabled.railwayTracks) {
      try { if (map.getLayer("crep-railway-raster")) map.setLayoutProperty("crep-railway-raster", "visibility", "none") } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.railwayTracks) {
      try { if (map.getLayer("crep-railway-raster")) map.setLayoutProperty("crep-railway-raster", "visibility", "visible") } catch { /* ignore */ }
      return
    }
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
              paint: { "raster-opacity": 0.75 },
            },
            beforeId,
          )
        }
        console.log(`[ProposalOverlays] railway tracks: OpenRailwayMap tiles attached`)
      } catch (e: any) { console.warn("[ProposalOverlays/railwayTracks]", e.message) }
    })
  }, [map, enabled.railwayTracks])

  // ─── 11. Railway Live Trains — Amtrak Track-A-Train ────────────────────
  // Amtrak publishes a public GeoJSON feed of active train positions (named
  // services, not commuter). Updates every ~30 s. Proxied through /api/oei/
  // railway-live to dodge CORS + add ETL-side caching. Starter feed; UK
  // Network Rail + EU HAFAS + GTFS-RT live-train feeds are §A.9.3 work.
  //
  // Toggle-able — same pattern as bathymetry/railwayTracks above.
  useEffect(() => {
    if (!map) return
    if (!enabled.railwayTrains) {
      try { if (map.getLayer("crep-trains-live-square")) map.setLayoutProperty("crep-trains-live-square", "visibility", "none") } catch { /* ignore */ }
      return
    }
    // On re-enable, flip visibility back; fetchAndPaint below will refresh
    // data too. On first enable, loadedRef prevents duplicate initial
    // attaches but the 30 s polling interval still runs.
    if (loadedRef.current.railwayTrains) {
      try { if (map.getLayer("crep-trains-live-square")) map.setLayoutProperty("crep-trains-live-square", "visibility", "visible") } catch { /* ignore */ }
    } else {
      loadedRef.current.railwayTrains = true
    }

    const fetchAndPaint = async () => {
      try {
        const res = await fetch("/api/oei/railway-live?limit=1500")
        if (!res.ok) return
        const j = await res.json()
        const features = (j.trains || []).map((t: any) => ({
          type: "Feature" as const,
          properties: {
            id: t.id || t.trainNum,
            name: t.name || t.routeName,
            operator: t.operator || "Amtrak",
            speed_mph: t.speed ?? t.velocity,
            heading: t.heading ?? 0,
            state: t.state,
            status: t.status,
          },
          geometry: { type: "Point" as const, coordinates: [t.lng ?? t.longitude, t.lat ?? t.latitude] },
        })).filter((f: any) =>
          Number.isFinite(f.geometry.coordinates[0]) &&
          Number.isFinite(f.geometry.coordinates[1])
        )
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-trains-live")) {
          map.addSource("crep-trains-live", { type: "geojson", data: fc, generateId: true })
          map.addLayer({
            id: "crep-trains-live-square",
            type: "circle",
            source: "crep-trains-live",
            paint: {
              // Square-ish large dot to read as distinct from aircraft / vessel.
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2, 5, 3, 8, 4.5, 12, 6, 16, 9],
              "circle-color": "#f43f5e",   // rose — unique in the palette
              "circle-opacity": 0.9,
              "circle-stroke-width": 0.8,
              "circle-stroke-color": "#ffffff",
              "circle-stroke-opacity": 0.8,
            },
          })
          map.on("mouseenter", "crep-trains-live-square", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-trains-live-square", () => { map.getCanvas().style.cursor = "" })
        } else {
          (map.getSource("crep-trains-live") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] railway live trains: ${features.length} active`)
      } catch (e: any) { console.warn("[ProposalOverlays/railwayTrains]", e.message) }
    }

    idleLoad(fetchAndPaint)
    // Re-poll every 30s while enabled
    const timer = setInterval(() => { if (enabled.railwayTrains) fetchAndPaint() }, 30_000)
    return () => clearInterval(timer)
  }, [map, enabled.railwayTrains])

  // ─── 12. Drone No-Fly Zones — FAA UAS restricted + OpenAIP airspace ────
  // Polygon layer over restricted / prohibited / special-use airspace.
  // Colored by class: CTR red, CTA orange, TRA amber, parks green. See
  // /api/oei/drone-no-fly for the backend fetch (proxies OpenAIP + FAA).
  //
  // Toggle-able — enable path attaches once, disable path flips both fill
  // + outline layers to visibility: "none".
  useEffect(() => {
    if (!map) return
    if (!enabled.droneNoFly) {
      try {
        if (map.getLayer("crep-drone-no-fly-fill")) map.setLayoutProperty("crep-drone-no-fly-fill", "visibility", "none")
        if (map.getLayer("crep-drone-no-fly-outline")) map.setLayoutProperty("crep-drone-no-fly-outline", "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.droneNoFly) {
      try {
        if (map.getLayer("crep-drone-no-fly-fill")) map.setLayoutProperty("crep-drone-no-fly-fill", "visibility", "visible")
        if (map.getLayer("crep-drone-no-fly-outline")) map.setLayoutProperty("crep-drone-no-fly-outline", "visibility", "visible")
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.droneNoFly = true

    idleLoad(async () => {
      try {
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
          map.on("mouseenter", "crep-drone-no-fly-fill", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-drone-no-fly-fill", () => { map.getCanvas().style.cursor = "" })
        } else {
          (map.getSource("crep-drone-no-fly") as any).setData(fc)
        }
        console.log(`[ProposalOverlays] drone no-fly zones: ${features.length} polygons`)
      } catch (e: any) { console.warn("[ProposalOverlays/droneNoFly]", e.message) }
    })
  }, [map, enabled.droneNoFly, bbox])

  return null
}
