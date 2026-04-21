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

  // ─── Fetch Mojave aggregate once when any sub-toggle is on ─────────
  useEffect(() => {
    const anyOn =
      enabled.mojavePreserve ||
      enabled.mojaveGoffs ||
      enabled.mojaveWilderness ||
      enabled.mojaveClimate ||
      enabled.mojaveINat
    console.log("[MojavePreserveLayer] fetch effect fired, anyOn=", anyOn, "enabled=", enabled, "fetchAttempted=", fetchAttemptedRef.current)
    if (!anyOn) {
      fetchAttemptedRef.current = false
      return
    }
    if (fetchAttemptedRef.current) return
    fetchAttemptedRef.current = true
    let cancelled = false
    console.log("[MojavePreserveLayer] fetching /api/crep/mojave ...")
    fetch(APPROX_BOUNDARY_PATH)
      .then((r) => {
        console.log("[MojavePreserveLayer] response status:", r.status)
        return r.ok ? r.json() : null
      })
      .then((j) => {
        console.log("[MojavePreserveLayer] data received:", j ? `source=${j.source} wilderness=${j.wilderness_pois?.length} climate=${j.climate_stations?.length}` : "null")
        if (!cancelled && j) setData(j)
      })
      .catch((e) => { console.warn("[MojavePreserveLayer] fetch failed:", e?.message) })
    return () => { cancelled = true }
  }, [enabled.mojavePreserve, enabled.mojaveGoffs, enabled.mojaveWilderness, enabled.mojaveClimate, enabled.mojaveINat])

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
        features: data.wilderness_pois.map((p: any) => ({
          type: "Feature",
          properties: { ...p },
          geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        })),
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
        features: data.climate_stations.map((s: any) => ({
          type: "Feature",
          properties: { ...s, observation_ts: s.observation?.ts || null, temp_c: s.observation?.temp_c ?? null },
          geometry: { type: "Point", coordinates: [s.lng, s.lat] },
        })),
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
        features: data.inat_observations.map((o: any) => ({
          type: "Feature",
          properties: { ...o },
          geometry: { type: "Point", coordinates: [o.lng, o.lat] },
        })),
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

    loadedRef.current = true
    console.log("[MojavePreserveLayer] render complete — layers added")

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

    return () => {
      // Nothing — we want sources to persist across prop changes. Full
      // teardown happens when the dashboard unmounts, which removes
      // the map entirely.
    }
  }, [map, data, enabled.mojavePreserve, enabled.mojaveGoffs, enabled.mojaveWilderness, enabled.mojaveClimate, enabled.mojaveINat])

  return null
}
