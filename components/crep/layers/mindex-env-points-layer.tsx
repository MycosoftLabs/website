"use client"

/**
 * Earth Simulator — generic MINDEX environment points layer (additive, default-OFF).
 *
 * A parameterized glow+dot circle layer fed by an internal-token CREP BFF that
 * proxies a MINDEX `atmos.*` / `earth.*` point table (air-quality, weather, …).
 * Self-contained: owns its source + two layers, viewport-scoped fetch on moveend
 * + a slow periodic refresh, and full teardown on disable/unmount — so with the
 * toggle off the globe is byte-for-byte identical to v1.
 *
 * Static circles (no animation) keep it FPS-safe. Fails open / empty: when the
 * upstream table has no rows (e.g. air_quality before its ETL keys land) it
 * renders nothing — honest empty state, no mock data.
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
  /** Dot/glow color. */
  color: string
  /** Popup heading. */
  popupTitle: string
  /** Properties to show in the popup, in order. */
  popupFields: MindexEnvPopupField[]
  /** Reveal zoom floor (default 2). */
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
  popupTitle,
  popupFields,
  minZoom = 2,
}: Props) {
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const lastBboxRef = useRef<string>("")

  useEffect(() => {
    if (!map) return
    let cancelled = false
    const SRC = idBase
    const GLOW = `${idBase}-glow`
    const DOT = `${idBase}-dot`

    const onClick = (e: any) => {
      const p = e.features?.[0]?.properties
      if (!p) return
      const rows = popupFields
        .map((f) => {
          const v = p[f.key]
          if (v == null || v === "") return ""
          return `<div><span style="opacity:.55">${f.label}:</span> ${String(v).slice(0, 60)}${f.suffix || ""}</div>`
        })
        .filter(Boolean)
        .join("")
      const html =
        `<div style="font:11px/1.4 system-ui,sans-serif;color:#e2e8f0;max-width:230px">` +
        `<div style="color:${color};font-weight:600;margin-bottom:2px">${p.stationName || popupTitle}</div>` +
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
      for (const id of [DOT, GLOW]) { try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ } }
      try { if (map.getSource(SRC)) map.removeSource(SRC) } catch { /* */ }
      lastBboxRef.current = ""
    }

    const ensureLayers = (data: any) => {
      if (cancelled) return
      try {
        const ex = map.getSource(SRC) as any
        if (ex?.setData) { ex.setData(data); return }
        map.addSource(SRC, { type: "geojson", data })
        map.addLayer({
          id: GLOW,
          type: "circle",
          source: SRC,
          minzoom: minZoom,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 9, 12, 16],
            "circle-color": color,
            "circle-opacity": 0.25,
            "circle-blur": 0.9,
          },
        })
        map.addLayer({
          id: DOT,
          type: "circle",
          source: SRC,
          minzoom: minZoom,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 4, 12, 6],
            "circle-color": color,
            "circle-opacity": opacity,
            "circle-stroke-width": 1,
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
    try { if (map.getLayer(`${idBase}-dot`)) map.setPaintProperty(`${idBase}-dot`, "circle-opacity", opacity) } catch { /* */ }
  }, [map, enabled, opacity, idBase])

  return null
}
