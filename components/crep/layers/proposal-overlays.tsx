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
    /** Ocean depth shading (GEBCO 2024 WMS — low/medium detail, free). */
    bathymetry?: boolean
    /** Land hillshade from AWS Terrain Tiles (Mapzen terrarium DEM → MapLibre native hillshade). 30 m res, free, no key. */
    topography?: boolean
    /** ESRI World Imagery HD satellite basemap — Google-Earth-level detail to zoom 19, free, no key. */
    satImagery?: boolean
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
        // Apr 19, 2026 (Morgan: "need more am fm cell tower data alot
        // missing"). 5k was hitting the limit in dense viewports (NYC / LA /
        // Tokyo / San Diego urban cores). Bumped bbox fetch to 25k which
        // covers those cities fully while staying under the route-side 50k
        // hard cap. PMTiles world catalog still paints the global view.
        const res = await fetch(`/api/oei/cell-towers-global?bbox=${bbox.join(",")}&limit=25000`)
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

    // Disable path: hide bathymetry raster + the land mask. Hiding land
    // mask only matters visually when the basemap under it is different
    // from #f1f3f5 — current Positron basemap matches so this is a no-op
    // visually, but keeping the toggle atomic avoids surprise if the
    // basemap ever changes.
    if (!enabled.bathymetry) {
      try {
        if (map.getLayer("crep-bathymetry-raster")) {
          map.setLayoutProperty("crep-bathymetry-raster", "visibility", "none")
        }
        if (map.getLayer("crep-land-mask-fill")) {
          map.setLayoutProperty("crep-land-mask-fill", "visibility", "none")
        }
      } catch { /* ignore */ }
      return
    }

    // Enable path: attach once, or flip both visibilities back to visible.
    if (loadedRef.current.bathymetry) {
      try {
        if (map.getLayer("crep-bathymetry-raster")) {
          map.setLayoutProperty("crep-bathymetry-raster", "visibility", "visible")
        }
        if (map.getLayer("crep-land-mask-fill")) {
          map.setLayoutProperty("crep-land-mask-fill", "visibility", "visible")
        }
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.bathymetry = true

    // Apr 19, 2026 (Morgan: "bathymetry is on on first load live on crep
    // and its still walking over the land data that cannot happen"). Land
    // mask MUST cover bathymetry on land or the layer is broken. Previous
    // version relied on an external fetch from GitHub — slow + sometimes
    // CORS-blocked. Now: primary source is /data/crep/ne_50m_land.geojson
    // (1.6 MB, committed in-repo, always available). GitHub raw mirror is
    // the fallback only if the local file 404s.
    //
    // Z-order: mask inserts with the SAME beforeId as bathymetry so both
    // live in the same "slot" right above basemap but below point
    // markers. Second insertion goes on TOP of the first within the
    // slot → mask above bathymetry, point layers above mask. Exactly
    // what we want.
    const attachLandMask = async (beforeId: string | undefined) => {
      if (map.getSource("crep-land-mask")) return
      try {
        const URLS = [
          "/data/crep/ne_50m_land.geojson",
          "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_land.geojson",
          "https://d2ad6b4ur7yvpq.cloudfront.net/naturalearth-3.3.0/ne_110m_land.geojson",
        ]
        let data: any = null
        for (const u of URLS) {
          try {
            const r = await fetch(u, { signal: AbortSignal.timeout(15_000) })
            if (r.ok) { data = await r.json(); break }
          } catch { /* try next */ }
        }
        if (!data) {
          console.warn("[ProposalOverlays/land-mask] all land-polygon sources failed — bathymetry will cover land")
          return
        }
        if (!map.getSource("crep-land-mask")) {
          map.addSource("crep-land-mask", { type: "geojson", data })
          map.addLayer({
            id: "crep-land-mask-fill",
            type: "fill",
            source: "crep-land-mask",
            paint: {
              // Carto Positron land tone. If basemap changes in the
              // future, adjust here.
              "fill-color": "#f1f3f5",
              "fill-opacity": 1.0,
              "fill-antialias": true,
            },
          }, beforeId)  // ← same slot as bathymetry, rendered above it
          console.log(`[ProposalOverlays] land mask attached ← ${URLS[0]} (before: ${beforeId || "TOP"})`)
        }
      } catch (e: any) {
        console.warn("[ProposalOverlays/land-mask]", e.message)
      }
    }

    idleLoad(async () => {
      try {
        const srcId = "crep-bathymetry"
        // Compute beforeId ONCE — shared between bathymetry and land mask
        // so both live in the same slot with mask rendered on top of the
        // raster. Scoped outside the !getSource guard so a re-run (e.g.
        // topography toggling) still gets the mask placed correctly.
        const style = map.getStyle()
        const firstOverlay = style.layers.find((l) => l.id.startsWith("crep-") && l.id !== "crep-boundaries-country") as any
        const bathyBeforeId = firstOverlay?.id as string | undefined
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
                // Apr 19, 2026 (Morgan fix): ESRI World Ocean Base already
                // has muted land tones, so we crank opacity high for ocean
                // detail. To further suppress land contribution, drop
                // saturation slightly (makes land tones blend into the
                // basemap gray) without hurting ocean blues.
                "raster-opacity": 0.8,
                "raster-saturation": 0.25,
                "raster-brightness-min": 0.1,
              },
            },
            bathyBeforeId,
          )
        }
        // Attach the land mask RIGHT ABOVE bathymetry in the same slot.
        // Adding with the same beforeId stacks mask on top of bathymetry
        // (later addLayer calls push earlier ones down within the slot).
        await attachLandMask(bathyBeforeId)
        console.log(`[ProposalOverlays] bathymetry: EMODnet 2024 + ESRI ocean raster attached${
          map.getLayer("crep-bathymetry-raster") ? "" : " (layer missing)"
        }`)
      } catch (e: any) { console.warn("[ProposalOverlays/bathymetry]", e.message) }
    })
  }, [map, enabled.bathymetry])

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
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function")
    if (!mapReady()) return

    if (!enabled.topography) {
      try {
        if (map.getLayer("crep-topo-hillshade")) map.setLayoutProperty("crep-topo-hillshade", "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.topography) {
      try {
        if (map.getLayer("crep-topo-hillshade")) map.setLayoutProperty("crep-topo-hillshade", "visibility", "visible")
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.topography = true

    idleLoad(async () => {
      try {
        const srcId = "crep-topo-dem"
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
        console.log(`[ProposalOverlays] topography: AWS Terrain Tiles hillshade attached (DEM z0–15)`)
      } catch (e: any) { console.warn("[ProposalOverlays/topography]", e.message) }
    })
  }, [map, enabled.topography])

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
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function")
    if (!mapReady()) return

    if (!enabled.satImagery) {
      try {
        if (map.getLayer("crep-satimagery-raster")) map.setLayoutProperty("crep-satimagery-raster", "visibility", "none")
      } catch { /* ignore */ }
      return
    }
    if (loadedRef.current.satImagery) {
      try {
        if (map.getLayer("crep-satimagery-raster")) map.setLayoutProperty("crep-satimagery-raster", "visibility", "visible")
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.satImagery = true

    idleLoad(async () => {
      try {
        const srcId = "crep-satimagery"
        if (!map.getSource(srcId)) {
          map.addSource(srcId, {
            type: "raster",
            tiles: [
              "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Tiles © Esri — World Imagery (DigitalGlobe, GeoEye, i-cubed, USDA FSA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo)",
            minzoom: 0,
            maxzoom: 19,
            scheme: "xyz",
          })
          // Insert right after the basemap layer — above any basemap
          // raster but below point markers + labels.
          const style = map.getStyle()
          const firstOverlay = style.layers.find(
            (l: any) => l.id.startsWith("crep-") && !l.id.startsWith("crep-boundaries"),
          ) as any
          const beforeId = firstOverlay?.id
          map.addLayer(
            {
              id: "crep-satimagery-raster",
              type: "raster",
              source: srcId,
              layout: { visibility: "visible" },
              paint: { "raster-opacity": 1.0, "raster-fade-duration": 0 },
            },
            beforeId,
          )
        }
        console.log(`[ProposalOverlays] satellite imagery (HD): ESRI World Imagery attached, z0–19`)
      } catch (e: any) { console.warn("[ProposalOverlays/satImagery]", e.message) }
    })
  }, [map, enabled.satImagery])

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

    // Apr 19, 2026 (Morgan: "live train must be a train icon with cars of
    // length if possible animated on the track"). We load a small SVG train
    // icon into the map image registry once, then use a symbol layer with
    // icon-rotate bound to the vehicle's heading so the train points the way
    // it is moving. A second "cars" layer below draws a rose line segment
    // along the heading bearing so each train reads as "locomotive + cars".
    // Trolleys get a green hue, buses grey; commuter rail (default) stays
    // rose. Symbol layer replaces the old circle.
    const loadTrainIcon = () => {
      if ((map as any).hasImage?.("train-icon")) return
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
        if (!(map as any).hasImage?.("train-icon")) {
          try { map.addImage("train-icon", img as any, { pixelRatio: 2 }) } catch { /* ignore */ }
        }
      }
      img.src = `data:image/svg+xml;base64,${typeof btoa === "function" ? btoa(svg) : Buffer.from(svg).toString("base64")}`
    }
    loadTrainIcon()

    const fetchAndPaint = async () => {
      try {
        const res = await fetch("/api/oei/railway-live?limit=1500")
        if (!res.ok) return
        const j = await res.json()
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
          return {
            type: "Feature" as const,
            properties: {
              id: t.id || t.trainNum,
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
        if (!map.getSource("crep-trains-live")) {
          map.addSource("crep-trains-live", { type: "geojson", data: fc, generateId: true })
          map.addSource("crep-trains-live-cars", { type: "geojson", data: fcLines })
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
        } else {
          (map.getSource("crep-trains-live") as any).setData(fc)
          const lineSrc = map.getSource("crep-trains-live-cars")
          if (lineSrc) (lineSrc as any).setData(fcLines)
        }
        const byOp = (j.operators || {}) as Record<string, number>
        const ops = Object.entries(byOp).filter(([, n]) => n > 0).map(([k, n]) => `${k}:${n}`).join(" ")
        console.log(`[ProposalOverlays] railway live: ${features.length} vehicles (${ops || "—"})`)
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
