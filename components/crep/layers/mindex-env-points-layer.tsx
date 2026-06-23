"use client"

/**
 * Earth Simulator — generic MINDEX environment HEATMAP layer (additive, default-OFF).
 *
 * Renders a MINDEX `atmos.*` point table (air-quality, weather, …) from an
 * internal-token CREP BFF as a DENSITY HEATMAP with a per-layer color ramp +
 * texture (radius/intensity), plus a small dot layer that fades in at high zoom
 * for clicks/popups. Mirrors the FIRMS heatmap so the env layers are visually
 * consistent AND each reads as distinct data over the dense fungal/event dots.
 * (Jun 23 2026 — Morgan: "mindex data should be heatmaps just like firms, each
 * with different coloring and texture.")
 *
 * Self-contained: owns its source + layers, viewport-scoped fetch on moveend +
 * a slow refresh, full teardown on disable/unmount — toggle off = byte-for-byte v1.
 *
 * NOTE: `map` is the MapLibre instance (CREPDashboardPage stores it in a
 * useState, not a ref) — callers pass `map={mapRef}`, never `mapRef.current`.
 */

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import type { Map as MapLibreMap } from "maplibre-gl"

export interface MindexEnvPopupField {
  key: string
  label: string
  suffix?: string
}

interface Props {
  map: MapLibreMap | null
  enabled: boolean
  opacity?: number
  /** BFF endpoint, e.g. "/api/crep/environment/air-quality" */
  endpoint: string
  /** Unique source id base, e.g. "crep-mindex-air" */
  idBase: string
  /** Dot color (high-zoom precision dots + popup heading). */
  color: string
  /** Heatmap color ramp — a MapLibre interpolate/heatmap-density expression. */
  heatRamp: any
  /** Per-zoom heatmap radius [z1,z3,z6,z9] — tunes the layer's "texture". */
  heatRadius?: [number, number, number, number]
  /** Per-zoom heatmap intensity [z2,z6,z10]. */
  heatIntensity?: [number, number, number]
  /** Popup heading. */
  popupTitle: string
  /** Properties to show in the popup, in order. */
  popupFields: MindexEnvPopupField[]
  /** Reveal zoom floor (default 1 — heatmap should read at globe zoom). */
  minZoom?: number
}

const REFRESH_MS = 10 * 60 * 1000

export default function MindexEnvPointsLayer({
  map,
  enabled,
  opacity = 0.85,
  endpoint,
  idBase,
  color,
  heatRamp,
  heatRadius = [6, 14, 28, 50],
  heatIntensity = [0.6, 1.4, 2.2],
  popupTitle,
  popupFields,
  minZoom = 1,
}: Props) {
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const lastBboxRef = useRef<string>("")

  useEffect(() => {
    if (!map) return
    let cancelled = false
    const SRC = idBase
    const HEAT = `${idBase}-heat`
    const DOT = `${idBase}-dot`

    // HTML-escape EVERY interpolated value: popup content is upstream MINDEX data
    // (OpenAQ/AirNow/OSM station names, sources, summaries) injected via setHTML —
    // escape to prevent DOM XSS. (Jun 23 2026 — PR #230 security review.)
    const esc = (s: unknown) =>
      String(s).replace(/[&<>"']/g, (c) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string),
      )
    const onClick = (e: any) => {
      const p = e.features?.[0]?.properties
      if (!p) return
      const rows = popupFields
        .map((f) => {
          const v = p[f.key]
          if (v == null || v === "") return ""
          return `<div><span style="opacity:.55">${esc(f.label)}:</span> ${esc(String(v).slice(0, 60))}${esc(f.suffix || "")}</div>`
        })
        .filter(Boolean)
        .join("")
      const html =
        `<div style="font:11px/1.4 system-ui,sans-serif;color:#e2e8f0;max-width:230px">` +
        `<div style="color:${esc(color)};font-weight:600;margin-bottom:2px">${esc(p.stationName || popupTitle)}</div>` +
        rows +
        `</div>`
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map)
    }
    const onEnter = () => { try { map.getCanvas().style.cursor = "pointer" } catch { /* */ } }
    const onLeave = () => { try { map.getCanvas().style.cursor = "" } catch { /* */ } }

    const removeAll = () => {
      try { map.off("click", DOT, onClick); map.off("mouseenter", DOT, onEnter); map.off("mouseleave", DOT, onLeave) } catch { /* */ }
      for (const id of [DOT, HEAT]) { try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ } }
      try { if (map.getSource(SRC)) map.removeSource(SRC) } catch { /* */ }
      lastBboxRef.current = ""
    }

    const heatOpacity = (o: number): any => ["interpolate", ["linear"], ["zoom"], 6.5, 0.9 * o, 9.5, 0.4 * o]

    const ensureLayers = (data: any) => {
      if (cancelled) return
      try {
        const ex = map.getSource(SRC) as any
        if (ex?.setData) { ex.setData(data); return }
        map.addSource(SRC, { type: "geojson", data })
        // Density heatmap (primary) — per-layer color ramp + texture so air vs
        // weather vs FIRMS each read distinctly. Fades out as the dots fade in.
        map.addLayer({
          id: HEAT,
          type: "heatmap",
          source: SRC,
          minzoom: minZoom,
          paint: {
            "heatmap-weight": 1,
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 2, heatIntensity[0], 6, heatIntensity[1], 10, heatIntensity[2]],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, heatRadius[0], 3, heatRadius[1], 6, heatRadius[2], 9, heatRadius[3]],
            "heatmap-opacity": heatOpacity(opacity),
            "heatmap-color": heatRamp,
          },
        })
        // Precision dots — fade in at high zoom (heatmap blurs there); carry the
        // popup + win the click-pick over underlying military bases (the dot id is
        // registered in clickPickLayerPriority).
        map.addLayer({
          id: DOT,
          type: "circle",
          source: SRC,
          minzoom: 6,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 4, 13, 6],
            "circle-color": color,
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 8, opacity],
            "circle-stroke-width": 0.6,
            "circle-stroke-color": "rgba(255,255,255,0.7)",
          },
        })
        map.on("click", DOT, onClick)
        map.on("mouseenter", DOT, onEnter)
        map.on("mouseleave", DOT, onLeave)
      } catch (e) { console.warn(`[${idBase}]`, e) }
    }

    const fetchData = async (force = false) => {
      if (cancelled || !enabled || !map) return
      try {
        const b = map.getBounds()
        const bbox = `${b.getWest().toFixed(3)},${b.getSouth().toFixed(3)},${b.getEast().toFixed(3)},${b.getNorth().toFixed(3)}`
        if (!force && bbox === lastBboxRef.current) return
        lastBboxRef.current = bbox
        const res = await fetch(`${endpoint}?bbox=${encodeURIComponent(bbox)}&limit=2000`, { cache: "default" })
        if (!res.ok || cancelled || !enabled) return
        const fc = await res.json()
        ensureLayers({ type: "FeatureCollection", features: Array.isArray(fc?.features) ? fc.features : [] })
      } catch { /* fail open: keep prior data, no error surfaced */ }
    }

    if (!enabled) { removeAll(); return }

    let moveT: any = 0
    const onMoveEnd = () => { clearTimeout(moveT); moveT = setTimeout(() => fetchData(false), 600) }
    map.on("moveend", onMoveEnd)
    const refreshT = setInterval(() => fetchData(true), REFRESH_MS)
    fetchData(true)

    return () => {
      cancelled = true
      clearTimeout(moveT)
      clearInterval(refreshT)
      try { map.off("moveend", onMoveEnd) } catch { /* */ }
      try { popupRef.current?.remove() } catch { /* */ }
      removeAll()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled, endpoint, idBase, color, minZoom])

  // Opacity follows the layer's opacity slider without re-fetching.
  useEffect(() => {
    if (!map || !enabled) return
    try {
      if (map.getLayer(`${idBase}-heat`)) {
        map.setPaintProperty(`${idBase}-heat`, "heatmap-opacity", ["interpolate", ["linear"], ["zoom"], 6.5, 0.9 * opacity, 9.5, 0.4 * opacity] as any)
      }
      if (map.getLayer(`${idBase}-dot`)) {
        map.setPaintProperty(`${idBase}-dot`, "circle-opacity", ["interpolate", ["linear"], ["zoom"], 6, 0, 8, opacity] as any)
      }
    } catch { /* */ }
  }, [map, enabled, opacity, idBase])

  return null
}
