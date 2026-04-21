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
    if (!anyOn) {
      fetchAttemptedRef.current = false
      return
    }
    if (fetchAttemptedRef.current) return
    fetchAttemptedRef.current = true
    let cancelled = false
    fetch(APPROX_BOUNDARY_PATH)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (!cancelled && j) setData(j) })
      .catch(() => { /* ignore */ })
    return () => { cancelled = true }
  }, [enabled.mojavePreserve, enabled.mojaveGoffs, enabled.mojaveWilderness, enabled.mojaveClimate, enabled.mojaveINat])

  // ─── Render once data arrives ──────────────────────────────────────
  useEffect(() => {
    if (!map || !data) return
    if (typeof map.getSource !== "function") return

    const allLayerIds = [
      "mojave-boundary-fill", "mojave-boundary-line",
      "mojave-goffs-halo", "mojave-goffs-dot", "mojave-goffs-label",
      "mojave-wilderness-dot", "mojave-wilderness-label",
      "mojave-climate-dot", "mojave-climate-label",
      "mojave-inat-dot", "mojave-inat-label",
    ]

    // Visibility toggles for already-loaded layers
    const flip = (id: string, on: boolean) => {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none") } catch { /* ignore */ }
    }

    if (!loadedRef.current) {
      try {
        const beforeLabels = map.getStyle().layers.find((l: any) => l.type === "symbol")?.id

        // ── Boundary polygon (fill + dashed line) ──
        if (!map.getSource("mojave-boundary")) {
          map.addSource("mojave-boundary", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: { name: data.preserve?.unit_name || "Mojave National Preserve", unit_code: data.preserve?.unit_code || "MOJA" },
              geometry: data.preserve?.boundary_geom,
            },
          })
          map.addLayer({
            id: "mojave-boundary-fill",
            type: "fill",
            source: "mojave-boundary",
            paint: {
              "fill-color": "#ca8a04", // park amber
              // Zoom-ramped: punchier at world view so the preserve is
              // visible without needing to zoom in; eases off when the
              // user is close so fill doesn't dominate site detail.
              "fill-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0.28, 5, 0.18, 9, 0.10, 12, 0.06],
              "fill-antialias": true,
            },
          }, beforeLabels)
          map.addLayer({
            id: "mojave-boundary-line",
            type: "line",
            source: "mojave-boundary",
            paint: {
              "line-color": "#facc15",
              // Zoom-ramped line width so the outline is visible on the
              // globe (3px at z2) but doesn't go nuclear up close.
              "line-width": ["interpolate", ["linear"], ["zoom"], 2, 3, 5, 2.2, 9, 1.8, 14, 1.2],
              "line-opacity": 0.9,
              "line-dasharray": [3, 2],
            },
          }, beforeLabels)
        }

        // ── Goffs anchor marker ──
        if (!map.getSource("mojave-goffs") && data.goffs) {
          const goffsFC = {
            type: "FeatureCollection" as const,
            features: [{
              type: "Feature" as const,
              properties: { ...data.goffs },
              geometry: { type: "Point" as const, coordinates: [data.goffs.lng, data.goffs.lat] },
            }],
          }
          map.addSource("mojave-goffs", { type: "geojson", data: goffsFC })
          // Outer pulsing halo — visible at globe view so Morgan can
          // spot the project site without zooming first. 14 px halo at
          // z2 scales up to 20 px at site zoom.
          map.addLayer({
            id: "mojave-goffs-halo",
            type: "circle",
            source: "mojave-goffs",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 14, 5, 16, 10, 20],
              "circle-color": "#14b8a6",
              "circle-opacity": ["interpolate", ["linear"], ["zoom"], 2, 0.55, 5, 0.40, 10, 0.25],
              "circle-blur": 0.55,
            },
          })
          // Branded teal + cyan core — 6 px at globe, 9 px up close.
          map.addLayer({
            id: "mojave-goffs-dot",
            type: "circle",
            source: "mojave-goffs",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 5, 6, 10, 9],
              "circle-color": "#22d3ee",
              "circle-stroke-color": "#0891b2",
              "circle-stroke-width": 2,
              "circle-opacity": 1.0,
            },
          })
          map.addLayer({
            id: "mojave-goffs-label",
            type: "symbol",
            source: "mojave-goffs",
            minzoom: 6,
            layout: {
              "text-field": "Goffs · MYCOSOFT",
              "text-size": ["interpolate", ["linear"], ["zoom"], 6, 10, 12, 13],
              "text-offset": [0, 1.2],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-transform": "uppercase",
              "text-letter-spacing": 0.06,
            } as any,
            paint: {
              "text-color": "#5eead4",
              "text-halo-color": "rgba(0,0,0,0.85)",
              "text-halo-width": 1.5,
            },
          })
          map.on("click", "mojave-goffs-dot", (e: any) => {
            const p = e.features?.[0]?.properties || {}
            const c = e.lngLat
            try {
              window.dispatchEvent(new CustomEvent("crep:mojave:site-click", {
                detail: { category: "mycosoft-project", ...p, lat: c?.lat, lng: c?.lng },
              }))
            } catch { /* ignore */ }
          })
          map.on("mouseenter", "mojave-goffs-dot", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "mojave-goffs-dot", () => { map.getCanvas().style.cursor = "" })
        }

        // ── Wilderness POIs ──
        if (!map.getSource("mojave-wilderness") && Array.isArray(data.wilderness_pois)) {
          const wFC = {
            type: "FeatureCollection" as const,
            features: data.wilderness_pois.map((p: any) => ({
              type: "Feature" as const,
              properties: { ...p },
              geometry: { type: "Point" as const, coordinates: [p.lng, p.lat] },
            })),
          }
          map.addSource("mojave-wilderness", { type: "geojson", data: wFC })
          map.addLayer({
            id: "mojave-wilderness-dot",
            type: "circle",
            source: "mojave-wilderness",
            minzoom: 5,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 12, 6],
              "circle-color": "#fbbf24",
              "circle-stroke-color": "#78350f",
              "circle-stroke-width": 1,
              "circle-opacity": 0.95,
            },
          })
          map.addLayer({
            id: "mojave-wilderness-label",
            type: "symbol",
            source: "mojave-wilderness",
            minzoom: 8,
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
          map.on("click", "mojave-wilderness-dot", (e: any) => {
            const p = e.features?.[0]?.properties || {}
            const c = e.lngLat
            try {
              window.dispatchEvent(new CustomEvent("crep:mojave:site-click", {
                detail: { category: "wilderness", ...p, lat: c?.lat, lng: c?.lng },
              }))
            } catch { /* ignore */ }
          })
          map.on("mouseenter", "mojave-wilderness-dot", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "mojave-wilderness-dot", () => { map.getCanvas().style.cursor = "" })
        }

        // ── Climate stations (ASOS / RAWS / COOP) ──
        if (!map.getSource("mojave-climate") && Array.isArray(data.climate_stations)) {
          const cFC = {
            type: "FeatureCollection" as const,
            features: data.climate_stations.map((s: any) => ({
              type: "Feature" as const,
              properties: { ...s, observation_ts: s.observation?.ts || null, temp_c: s.observation?.temp_c ?? null },
              geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
            })),
          }
          map.addSource("mojave-climate", { type: "geojson", data: cFC })
          map.addLayer({
            id: "mojave-climate-dot",
            type: "circle",
            source: "mojave-climate",
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 3, 12, 7],
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
          map.addLayer({
            id: "mojave-climate-label",
            type: "symbol",
            source: "mojave-climate",
            minzoom: 8,
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
          map.on("click", "mojave-climate-dot", (e: any) => {
            const p = e.features?.[0]?.properties || {}
            const c = e.lngLat
            try {
              window.dispatchEvent(new CustomEvent("crep:mojave:site-click", {
                detail: { category: "climate", ...p, lat: c?.lat, lng: c?.lng },
              }))
            } catch { /* ignore */ }
          })
          map.on("mouseenter", "mojave-climate-dot", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "mojave-climate-dot", () => { map.getCanvas().style.cursor = "" })
        }

        // ── iNaturalist observations ──
        if (!map.getSource("mojave-inat") && Array.isArray(data.inat_observations)) {
          const iFC = {
            type: "FeatureCollection" as const,
            features: data.inat_observations.map((o: any) => ({
              type: "Feature" as const,
              properties: { ...o },
              geometry: { type: "Point" as const, coordinates: [o.lng, o.lat] },
            })),
          }
          map.addSource("mojave-inat", { type: "geojson", data: iFC })
          map.addLayer({
            id: "mojave-inat-dot",
            type: "circle",
            source: "mojave-inat",
            minzoom: 6,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2.5, 14, 5.5],
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
          map.on("click", "mojave-inat-dot", (e: any) => {
            const p = e.features?.[0]?.properties || {}
            const c = e.lngLat
            try {
              window.dispatchEvent(new CustomEvent("crep:mojave:site-click", {
                detail: { category: "inat-observation", ...p, lat: c?.lat, lng: c?.lng },
              }))
            } catch { /* ignore */ }
          })
          map.on("mouseenter", "mojave-inat-dot", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "mojave-inat-dot", () => { map.getCanvas().style.cursor = "" })
        }

        loadedRef.current = true
      } catch (e: any) {
        console.warn("[MojavePreserveLayer] render failed:", e?.message)
      }
    }

    // Apply visibility per-sub-toggle (layers persist across toggles;
    // just flip the MapLibre `visibility` layout property)
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
