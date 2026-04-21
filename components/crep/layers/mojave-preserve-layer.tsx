"use client"

/**
 * Mojave National Preserve + Goffs, CA layer — Apr 21, 2026
 *
 * Morgan: "why is there no data at goffs ca we have a project there need
 * more data ... mojave national reserve all that park data and climate
 * data and specific site nature data is needed".
 *
 * Renders:
 *   • NPS MOJA boundary polygon (fill + dashed line)
 *   • Goffs anchor marker (MYCOSOFT project site)
 *   • Wilderness POIs (Cima Dome / Kelso / Mitchell Caverns / etc)
 *   • Climate stations (KEED / KDAG / KIFP ASOS + Mitchell Caverns /
 *     Kelso Depot / Clark Mtn RAWS)
 *   • Recent iNaturalist observations (desert tortoise, Joshua tree,
 *     creosote, desert bighorn, golden eagle, Mojave yucca, etc)
 *
 * Each sub-category has its own toggle. Click handlers dispatch a
 * `crep:mojave:site-click` CustomEvent which the MojaveSiteWidget
 * listens for.
 */

import { useEffect, useRef, useState } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

interface Props {
  map: MapLibreMap | null
  enabled: {
    mojavePreserve?: boolean        // master (boundary polygon)
    mojaveGoffs?: boolean           // Goffs anchor marker
    mojaveWilderness?: boolean      // wilderness POIs
    mojaveClimate?: boolean         // ASOS/RAWS/COOP climate stations
    mojaveINat?: boolean            // iNaturalist observations
    // Apr 21, 2026 v2 expansion:
    mojaveCameras?: boolean         // HPWREN + Caltrans + NPS webcams
    mojaveBroadcast?: boolean       // AM/FM stations
    mojaveCell?: boolean            // cell towers
    mojavePower?: boolean           // substations + plants + TX
    mojaveRails?: boolean           // BNSF/UP + depots + Amtrak
    mojaveCaves?: boolean           // Mitchell Caverns, lava tubes
    mojaveGovernment?: boolean      // NPS/BLM/CBP/DoD sites
    mojaveTourism?: boolean         // landmarks, visitor centers, Route 66
    mojaveSensors?: boolean         // AQS + USGS gauges + RAWS + seismic
    mojaveHeatmap?: boolean         // fire-risk + biodiversity + aridity
  }
}

// Preload static fallback so the layer paints instantly even before
// the /api/crep/mojave response comes back — the polygon upgrade
// lands on the next paint.
const APPROX_BOUNDARY_PATH = "/api/crep/mojave"

export default function MojavePreserveLayer({ map, enabled }: Props) {
  const loadedRef = useRef(false)
  const [data, setData] = useState<any | null>(null)
  const fetchAttemptedRef = useRef(false)
  // Apr 21, 2026 (Morgan: "nothing in goffs is loading"). React 18
  // strict-mode double-mount was flipping a per-effect `let cancelled =
  // false` → true via synthetic unmount BEFORE the 9 s fetch resolved.
  // When data finally arrived, `if (!cancelled)` discarded it and
  // setData never ran — console logged "data received" but component
  // state never updated and the render effect never saw data=true.
  //
  // Fix: track mount with a ref that only flips on TRUE unmount (via
  // a separate [] effect). The fetch-effect cleanup is removed — we
  // check mountedRef inside the resolve instead.
  const mountedRef = useRef(true)
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false }
  }, [])

  // ─── Fetch Mojave aggregate once when any sub-toggle is on ─────────
  useEffect(() => {
    const anyOn =
      enabled.mojavePreserve ||
      enabled.mojaveGoffs ||
      enabled.mojaveWilderness ||
      enabled.mojaveClimate ||
      enabled.mojaveINat ||
      enabled.mojaveCameras ||
      enabled.mojaveBroadcast ||
      enabled.mojaveCell ||
      enabled.mojavePower ||
      enabled.mojaveRails ||
      enabled.mojaveCaves ||
      enabled.mojaveGovernment ||
      enabled.mojaveTourism ||
      enabled.mojaveSensors ||
      enabled.mojaveHeatmap
    console.log("[MojavePreserveLayer] fetch effect fired, anyOn=", anyOn, "enabled=", enabled, "fetchAttempted=", fetchAttemptedRef.current)
    if (!anyOn) {
      fetchAttemptedRef.current = false
      return
    }
    // Apr 21, 2026 (Morgan: "do that" re: refresh cadence). 6 h interval
    // to pick up fresh ASOS climate observations (NWS api.weather.gov
    // updates every ~20 min) + iNat preload cache warmups. Skips
    // refresh on hidden tabs.
    const doFetch = (label: string) => {
      if (typeof document !== "undefined" && document.hidden && label !== "initial") return
      console.log(`[MojavePreserveLayer] ${label} fetch /api/crep/mojave ...`)
      fetch(APPROX_BOUNDARY_PATH)
        .then((r) => {
          console.log(`[MojavePreserveLayer] ${label} response:`, r.status)
          return r.ok ? r.json() : null
        })
        .then((j) => {
          console.log(`[MojavePreserveLayer] ${label} data:`, j ? `source=${j.source} wilderness=${j.wilderness_pois?.length} climate_live=${(j.climate_stations||[]).filter((s:any)=>s.observation).length}/${j.climate_stations?.length}` : "null")
          if (mountedRef.current && j) setData(j)
        })
        .catch((e) => { console.warn(`[MojavePreserveLayer] ${label} fetch failed:`, e?.message) })
    }

    if (!fetchAttemptedRef.current) {
      fetchAttemptedRef.current = true
      doFetch("initial")
    }
    const iv = setInterval(() => doFetch("refresh"), 6 * 60 * 60 * 1000)
    return () => { clearInterval(iv) }
  }, [
    enabled.mojavePreserve, enabled.mojaveGoffs, enabled.mojaveWilderness,
    enabled.mojaveClimate, enabled.mojaveINat,
    enabled.mojaveCameras, enabled.mojaveBroadcast, enabled.mojaveCell,
    enabled.mojavePower, enabled.mojaveRails, enabled.mojaveCaves,
    enabled.mojaveGovernment, enabled.mojaveTourism, enabled.mojaveSensors,
    enabled.mojaveHeatmap,
  ])

  // ─── Render once data arrives ──────────────────────────────────────
  useEffect(() => {
    console.log("[MojavePreserveLayer] render effect fired, map=", !!map, "data=", !!data, "loadedRef=", loadedRef.current)
    if (!map || !data) return
    if (typeof map.getSource !== "function") return
    console.log("[MojavePreserveLayer] beginning render — preserve boundary type:", data.preserve?.boundary_geom?.type, "wilderness:", data.wilderness_pois?.length)

    // Apr 21, 2026 (Morgan: "nothing in goffs is loading"). Previously
    // the whole render block was one big try/catch with a loadedRef
    // guard — if ANY addLayer threw mid-way we'd bail early AND set the
    // guard such that subsequent fast-refresh remounts skipped the
    // whole thing forever. Now every addSource/addLayer is independent
    // and per-layer-guarded with getSource/getLayer — safe to re-run
    // on every HMR remount without losing data or accumulating listeners.
    const safeAddSource = (id: string, spec: any) => {
      try {
        if (map.getSource(id)) return true
        map.addSource(id, spec)
        return true
      } catch (e: any) {
        console.warn(`[MojavePreserveLayer] addSource(${id}) failed:`, e?.message)
        return false
      }
    }
    const safeAddLayer = (spec: any, beforeId?: string) => {
      try {
        if (map.getLayer(spec.id)) return true
        map.addLayer(spec, beforeId)
        return true
      } catch (e: any) {
        console.warn(`[MojavePreserveLayer] addLayer(${spec.id}) failed:`, e?.message)
        return false
      }
    }
    // Click handlers bind once per layer id; a window-level flag stops
    // re-binding on HMR remounts (otherwise each refresh adds another
    // handler to the same layer → click fires 5× after 5 HMRs).
    const bindOnce = (layerId: string, category: string) => {
      const key = `__crep_mojave_bound_${layerId}`
      if ((window as any)[key]) return
      ;(window as any)[key] = true
      map.on("click", layerId, (e: any) => {
        const p = e.features?.[0]?.properties || {}
        const c = e.lngLat
        try {
          window.dispatchEvent(new CustomEvent("crep:mojave:site-click", {
            detail: { category, ...p, lat: c?.lat, lng: c?.lng },
          }))
        } catch { /* ignore */ }
      })
      map.on("mouseenter", layerId, () => { try { map.getCanvas().style.cursor = "pointer" } catch {} })
      map.on("mouseleave", layerId, () => { try { map.getCanvas().style.cursor = "" } catch {} })
    }

    const beforeLabels = (() => {
      try { return map.getStyle().layers.find((l: any) => l.type === "symbol")?.id } catch { return undefined }
    })()

    // Apr 22, 2026 (Morgan: "icons overlaying eachother all over the map
    // in goffs ... makes selection impossible and corrupted"). Previous
    // 1.5 m jitter was invisible at z10-12 (sub-pixel). Bumped to ~65 m
    // visual spread so e.g. Mitchell Caverns' 4 co-located dots (NPS HQ
    // + RAWS weather + cave + tourism) visibly fan out. Applied to ALL
    // Goffs categories below, not just sensors+cameras+tourism.
    const jitter = (id: string, lng: number, lat: number): [number, number] => {
      let h = 0
      for (let i = 0; i < (id || "").length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
      const ux = ((h & 0xff) / 255 - 0.5)
      const uy = (((h >> 8) & 0xff) / 255 - 0.5)
      const dx = ux * 0.0006
      const dy = uy * 0.0006
      return [lng + dx, lat + dy]
    }

    // ── Boundary polygon (fill + dashed line) ──
    if (safeAddSource("mojave-boundary", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: { name: data.preserve?.unit_name || "Mojave National Preserve", unit_code: data.preserve?.unit_code || "MOJA" },
        geometry: data.preserve?.boundary_geom,
      },
    })) {
      safeAddLayer({
        id: "mojave-boundary-fill",
        type: "fill",
        source: "mojave-boundary",
        paint: {
          "fill-color": "#ca8a04",
          "fill-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0.35, 5, 0.22, 9, 0.12, 12, 0.06],
          "fill-antialias": true,
        },
      }, beforeLabels)
      safeAddLayer({
        id: "mojave-boundary-line",
        type: "line",
        source: "mojave-boundary",
        paint: {
          "line-color": "#facc15",
          "line-width": ["interpolate", ["linear"], ["zoom"], 2, 3, 5, 2.4, 9, 1.8, 14, 1.2],
          "line-opacity": 0.95,
          "line-dasharray": [3, 2],
        },
      }, beforeLabels)
    }

    // ── Goffs anchor marker — PROMINENT so it's unmissable at world view ──
    if (data.goffs && safeAddSource("mojave-goffs", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: { ...data.goffs },
          geometry: { type: "Point", coordinates: [data.goffs.lng, data.goffs.lat] },
        }],
      },
    })) {
      // Apr 21 (Morgan: "nothing in goffs is loading"). Bumped everything
      // bigger + brighter so a tab glance at the globe spots it without
      // a zoom. Two layered halos now so the marker has a visible ring
      // even over brighter basemaps.
      safeAddLayer({
        id: "mojave-goffs-halo",
        type: "circle",
        source: "mojave-goffs",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 18, 4, 22, 10, 28],
          "circle-color": "#14b8a6",
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 1, 0.70, 4, 0.50, 10, 0.30],
          "circle-blur": 0.45,
        },
      })
      safeAddLayer({
        id: "mojave-goffs-dot",
        type: "circle",
        source: "mojave-goffs",
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 1, 8, 5, 9, 10, 12],
          "circle-color": "#22d3ee",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2.5,
          "circle-opacity": 1.0,
        },
      })
      safeAddLayer({
        id: "mojave-goffs-label",
        type: "symbol",
        source: "mojave-goffs",
        minzoom: 3,
        layout: {
          "text-field": "GOFFS · MYCOSOFT",
          "text-size": ["interpolate", ["linear"], ["zoom"], 3, 11, 10, 14],
          "text-offset": [0, 1.4],
          "text-anchor": "top",
          "text-allow-overlap": true,
          "text-letter-spacing": 0.08,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        } as any,
        paint: {
          "text-color": "#ecfeff",
          "text-halo-color": "#0891b2",
          "text-halo-width": 2.2,
          "text-halo-blur": 0.3,
        },
      })
      bindOnce("mojave-goffs-dot", "mycosoft-project")
    }

    // ── Wilderness POIs ──
    if (Array.isArray(data.wilderness_pois) && safeAddSource("mojave-wilderness", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: data.wilderness_pois.map((p: any) => {
          const [jx, jy] = jitter(p.id, p.lng, p.lat)
          return { type: "Feature", properties: { ...p }, geometry: { type: "Point", coordinates: [jx, jy] } }
        }),
      },
    })) {
      safeAddLayer({
        id: "mojave-wilderness-dot",
        type: "circle",
        source: "mojave-wilderness",
        minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 7],
          "circle-color": "#fbbf24",
          "circle-stroke-color": "#78350f",
          "circle-stroke-width": 1.2,
          "circle-opacity": 0.95,
        },
      })
      safeAddLayer({
        id: "mojave-wilderness-label",
        type: "symbol",
        source: "mojave-wilderness",
        minzoom: 7,
        layout: {
          "text-field": ["get", "name"],
          "text-size": 10,
          "text-offset": [0, 0.9],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-optional": true,
        } as any,
        paint: {
          "text-color": "#fde68a",
          "text-halo-color": "rgba(0,0,0,0.85)",
          "text-halo-width": 1.3,
        },
      })
      bindOnce("mojave-wilderness-dot", "wilderness")
    }

    // ── Climate stations ──
    if (Array.isArray(data.climate_stations) && safeAddSource("mojave-climate", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: data.climate_stations.map((s: any) => {
          const [jx, jy] = jitter(s.id, s.lng, s.lat)
          return { type: "Feature", properties: { ...s, observation_ts: s.observation?.ts || null, temp_c: s.observation?.temp_c ?? null }, geometry: { type: "Point", coordinates: [jx, jy] } }
        }),
      },
    })) {
      safeAddLayer({
        id: "mojave-climate-dot",
        type: "circle",
        source: "mojave-climate",
        minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 7],
          "circle-color": [
            "match", ["get", "category"],
            "asos", "#06b6d4",
            "raws", "#f97316",
            "coop", "#a78bfa",
            "#94a3b8",
          ],
          "circle-stroke-color": "#0b1220",
          "circle-stroke-width": 1.4,
          "circle-opacity": 0.95,
        },
      })
      safeAddLayer({
        id: "mojave-climate-label",
        type: "symbol",
        source: "mojave-climate",
        minzoom: 7,
        layout: {
          "text-field": ["get", "id"],
          "text-size": 10,
          "text-offset": [0, 0.9],
          "text-anchor": "top",
          "text-allow-overlap": false,
          "text-optional": true,
        } as any,
        paint: {
          "text-color": "#ecfeff",
          "text-halo-color": "rgba(0,0,0,0.85)",
          "text-halo-width": 1.3,
        },
      })
      bindOnce("mojave-climate-dot", "climate")
    }

    // ── iNaturalist observations ──
    if (Array.isArray(data.inat_observations) && data.inat_observations.length > 0 && safeAddSource("mojave-inat", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: data.inat_observations.map((o: any) => {
          const [jx, jy] = jitter(String(o.id || `${o.lat}-${o.lng}`), o.lng, o.lat)
          return { type: "Feature", properties: { ...o }, geometry: { type: "Point", coordinates: [jx, jy] } }
        }),
      },
    })) {
      safeAddLayer({
        id: "mojave-inat-dot",
        type: "circle",
        source: "mojave-inat",
        minzoom: 5,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 14, 6],
          "circle-color": [
            "match", ["get", "iconic_taxon"],
            "Plantae",   "#84cc16",
            "Reptilia",  "#eab308",
            "Aves",      "#38bdf8",
            "Mammalia",  "#f43f5e",
            "Insecta",   "#a78bfa",
            "#22c55e",
          ],
          "circle-stroke-color": "#052e16",
          "circle-stroke-width": 0.8,
          "circle-opacity": 0.92,
        },
      })
      bindOnce("mojave-inat-dot", "inat-observation")
    }

    // ──────────────────────────────────────────────────────────────────
    // Apr 21, 2026 v2 expansion: 9 new sub-layer categories + heatmap
    // overlay. Each defensively guarded by array-presence + safeAdd*
    // — any single layer can fail without cascading.
    // ──────────────────────────────────────────────────────────────────

    // ── CAMERAS ──
    if (Array.isArray(data.cameras) && data.cameras.length > 0 && safeAddSource("mojave-cameras", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.cameras.map((c: any) => { const [jx, jy] = jitter(c.id, c.lng, c.lat); return { type: "Feature", properties: { ...c }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "mojave-cameras-dot", type: "circle", source: "mojave-cameras", minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 7],
          "circle-color": [ "match", ["get", "provider"], "hpwren", "#ef4444", "alertwildfire", "#f97316", "caltrans", "#06b6d4", "nps", "#84cc16", "windy", "#a855f7", "#67e8f9" ],
          "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("mojave-cameras-dot", "camera")
    }

    // ── BROADCAST (AM/FM) ──
    if (Array.isArray(data.broadcast) && data.broadcast.length > 0 && safeAddSource("mojave-broadcast", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.broadcast.map((b: any) => ({ type: "Feature", properties: { ...b }, geometry: { type: "Point", coordinates: [b.lng, b.lat] } })) },
    })) {
      safeAddLayer({
        id: "mojave-broadcast-dot", type: "circle", source: "mojave-broadcast", minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 12, 6],
          "circle-color": ["match", ["get", "band"], "am", "#a855f7", "fm", "#8b5cf6", "tv", "#7c3aed", "#8b5cf6"],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.2, "circle-opacity": 0.9,
        },
      })
      bindOnce("mojave-broadcast-dot", "broadcast")
    }

    // ── CELL TOWERS ──
    if (Array.isArray(data.cell_towers) && data.cell_towers.length > 0 && safeAddSource("mojave-cell", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.cell_towers.map((c: any) => ({ type: "Feature", properties: { ...c }, geometry: { type: "Point", coordinates: [c.lng, c.lat] } })) },
    })) {
      safeAddLayer({
        id: "mojave-cell-dot", type: "circle", source: "mojave-cell", minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 12, 6],
          "circle-color": ["match", ["get", "carrier"], "Verizon", "#ef4444", "AT&T", "#3b82f6", "T-Mobile", "#ec4899", "FirstNet", "#22c55e", "#a855f7"],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.0, "circle-opacity": 0.9,
        },
      })
      bindOnce("mojave-cell-dot", "cell")
    }

    // ── POWER INFRASTRUCTURE ──
    if (Array.isArray(data.power) && data.power.length > 0 && safeAddSource("mojave-power", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.power.map((p: any) => ({ type: "Feature", properties: { ...p }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })) },
    })) {
      safeAddLayer({
        id: "mojave-power-dot", type: "circle", source: "mojave-power", minzoom: 3,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["capacity_mw"], 0, 4, 100, 5, 500, 7, 2000, 10],
          "circle-color": [ "match", ["get", "kind"], "solar", "#facc15", "wind", "#22d3ee", "coal-retired", "#78350f", "substation", "#fbbf24", "hvdc", "#a855f7", "#fbbf24" ],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("mojave-power-dot", "power")
    }

    // ── RAILS ──
    if (Array.isArray(data.rails) && data.rails.length > 0 && safeAddSource("mojave-rails", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.rails.map((r: any) => ({ type: "Feature", properties: { ...r }, geometry: { type: "Point", coordinates: [r.lng, r.lat] } })) },
    })) {
      safeAddLayer({
        id: "mojave-rails-dot", type: "circle", source: "mojave-rails", minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 7],
          "circle-color": "#a1a1aa", "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("mojave-rails-dot", "rail")
    }

    // ── CAVES ──
    if (Array.isArray(data.caves) && data.caves.length > 0 && safeAddSource("mojave-caves", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.caves.map((c: any) => ({ type: "Feature", properties: { ...c }, geometry: { type: "Point", coordinates: [c.lng, c.lat] } })) },
    })) {
      safeAddLayer({
        id: "mojave-caves-dot", type: "circle", source: "mojave-caves", minzoom: 5,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 4, 12, 7],
          "circle-color": "#78350f", "circle-stroke-color": "#f59e0b", "circle-stroke-width": 1.4, "circle-opacity": 0.92,
        },
      })
      bindOnce("mojave-caves-dot", "cave")
    }

    // ── GOVERNMENT ──
    if (Array.isArray(data.government) && data.government.length > 0 && safeAddSource("mojave-gov", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.government.map((g: any) => ({ type: "Feature", properties: { ...g }, geometry: { type: "Point", coordinates: [g.lng, g.lat] } })) },
    })) {
      safeAddLayer({
        id: "mojave-gov-dot", type: "circle", source: "mojave-gov", minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 7],
          "circle-color": [ "match", ["get", "agency"], "NPS", "#84cc16", "BLM", "#f59e0b", "CBP", "#3b82f6", "US Army", "#78350f", "USAF", "#0ea5e9", "USGS", "#14b8a6", "FAA", "#a855f7", "#7dd3fc" ],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("mojave-gov-dot", "government")
    }

    // ── TOURISM ──
    if (Array.isArray(data.tourism) && data.tourism.length > 0 && safeAddSource("mojave-tourism", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.tourism.map((t: any) => { const [jx, jy] = jitter(t.id, t.lng, t.lat); return { type: "Feature", properties: { ...t }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "mojave-tourism-dot", type: "circle", source: "mojave-tourism", minzoom: 5,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 12, 6],
          "circle-color": "#f9a8d4", "circle-stroke-color": "#831843", "circle-stroke-width": 1.2, "circle-opacity": 0.9,
        },
      })
      bindOnce("mojave-tourism-dot", "tourism")
    }

    // ── SENSORS ──
    if (Array.isArray(data.sensors) && data.sensors.length > 0 && safeAddSource("mojave-sensors", {
      type: "geojson",
      data: { type: "FeatureCollection", features: data.sensors.map((s: any) => { const [jx, jy] = jitter(s.id, s.lng, s.lat); return { type: "Feature", properties: { ...s }, geometry: { type: "Point", coordinates: [jx, jy] } } }) },
    })) {
      safeAddLayer({
        id: "mojave-sensors-dot", type: "circle", source: "mojave-sensors", minzoom: 4,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 7],
          "circle-color": [ "match", ["get", "kind"], "aqi", "#ef4444", "streamflow", "#0ea5e9", "weather", "#f59e0b", "wildlife", "#84cc16", "snow", "#ffffff", "seismic", "#a855f7", "light", "#fbbf24", "solar", "#eab308", "#06b6d4" ],
          "circle-stroke-color": "#0b1220", "circle-stroke-width": 1.4, "circle-opacity": 0.95,
        },
      })
      bindOnce("mojave-sensors-dot", "sensor")
    }

    // ── HEATMAPS (fire-risk + biodiversity + aridity combined) ──
    if (data.heatmaps && safeAddSource("mojave-heatmap", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          ...(data.heatmaps.fireRisk || []).map((p: any) => ({ type: "Feature", properties: { kind: "fire", intensity: p.intensity, label: p.label }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
          ...(data.heatmaps.biodiversity || []).map((p: any) => ({ type: "Feature", properties: { kind: "biodiversity", intensity: p.intensity, label: p.label }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
          ...(data.heatmaps.aridity || []).map((p: any) => ({ type: "Feature", properties: { kind: "aridity", intensity: p.intensity, label: p.label }, geometry: { type: "Point", coordinates: [p.lng, p.lat] } })),
        ],
      },
    })) {
      // Apr 21, 2026 (Morgan: "all projects having wierd heat map
      // circles around projects that are fake and when zoomed out they
      // are large"). Hard minzoom:9 so heatmaps only paint when user
      // is actually zoomed to the preserve, not on the globe. Also
      // capped radius much tighter so they don't balloon.
      safeAddLayer({
        id: "mojave-heatmap-layer", type: "heatmap", source: "mojave-heatmap", minzoom: 9, maxzoom: 14,
        paint: {
          "heatmap-weight": ["interpolate", ["linear"], ["get", "intensity"], 0, 0, 1, 0.6],
          "heatmap-intensity": 0.8,
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0,    "rgba(0, 0, 0, 0)",
            0.25, "rgba(34, 197, 94, 0.35)",     // green (biodiversity, subtle)
            0.55, "rgba(250, 204, 21, 0.45)",    // yellow
            0.80, "rgba(249, 115, 22, 0.55)",    // orange (fire-risk medium)
            0.95, "rgba(239, 68, 68, 0.65)",     // red (high)
          ],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 9, 18, 12, 34, 14, 48],
          "heatmap-opacity": 0.55,
        },
      }, beforeLabels)
    }

    loadedRef.current = true
    console.log("[MojavePreserveLayer] render complete — layers added (incl. v2 expansion)")

    // Visibility toggles — apply regardless of whether layers were just
    // added or already present (HMR case).
    const flip = (id: string, on: boolean) => {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none") } catch { /* ignore */ }
    }
    flip("mojave-boundary-fill",       !!enabled.mojavePreserve)
    flip("mojave-boundary-line",       !!enabled.mojavePreserve)
    flip("mojave-goffs-halo",          !!enabled.mojaveGoffs)
    flip("mojave-goffs-dot",           !!enabled.mojaveGoffs)
    flip("mojave-goffs-label",         !!enabled.mojaveGoffs)
    flip("mojave-wilderness-dot",      !!enabled.mojaveWilderness)
    flip("mojave-wilderness-label",    !!enabled.mojaveWilderness)
    flip("mojave-climate-dot",         !!enabled.mojaveClimate)
    flip("mojave-climate-label",       !!enabled.mojaveClimate)
    flip("mojave-inat-dot",            !!enabled.mojaveINat)
    // v2 expansion:
    flip("mojave-cameras-dot",   !!enabled.mojaveCameras)
    flip("mojave-broadcast-dot", !!enabled.mojaveBroadcast)
    flip("mojave-cell-dot",      !!enabled.mojaveCell)
    flip("mojave-power-dot",     !!enabled.mojavePower)
    flip("mojave-rails-dot",     !!enabled.mojaveRails)
    flip("mojave-caves-dot",     !!enabled.mojaveCaves)
    flip("mojave-gov-dot",       !!enabled.mojaveGovernment)
    flip("mojave-tourism-dot",   !!enabled.mojaveTourism)
    flip("mojave-sensors-dot",   !!enabled.mojaveSensors)
    flip("mojave-heatmap-layer", !!enabled.mojaveHeatmap)

    return () => {
      // Nothing — we want sources to persist across prop changes.
    }
  }, [
    map, data,
    enabled.mojavePreserve, enabled.mojaveGoffs, enabled.mojaveWilderness,
    enabled.mojaveClimate, enabled.mojaveINat,
    enabled.mojaveCameras, enabled.mojaveBroadcast, enabled.mojaveCell,
    enabled.mojavePower, enabled.mojaveRails, enabled.mojaveCaves,
    enabled.mojaveGovernment, enabled.mojaveTourism, enabled.mojaveSensors,
    enabled.mojaveHeatmap,
  ])

  return null
}
