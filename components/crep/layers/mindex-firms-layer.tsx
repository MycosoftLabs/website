"use client"

/**
 * Earth Simulator — MINDEX FIRMS wildfire layer (additive, default-OFF).
 *
 * Renders NASA FIRMS VIIRS thermal detections from MINDEX `earth.wildfires`
 * (via the internal-token BFF `/api/crep/environment/wildfires`) as a **density
 * heatmap** (fire color ramp) — the right viz for raw FIRMS, which are thin
 * thermal-anomaly pixels with no per-point intensity/name. Individual detections
 * fade in only at high zoom for precision (the heatmap blurs as you zoom in).
 *
 * Self-contained: owns its source + layers, viewport-scoped fetch on moveend +
 * a slow periodic refresh, full teardown on disable/unmount — so with the toggle
 * off the globe is byte-for-byte v1.
 *
 * NOTE: `map` is the MapLibre instance (CREPDashboardPage stores it in a
 * useState, not a ref) — callers pass `map={mapRef}`, never `mapRef.current`.
 *
 * Backend gap (Cursor): FIRMS rows currently carry no FRP / confidence /
 * brightness / satellite — when the ETL stores those, weight the heatmap by FRP
 * and enrich the popup. Data is also a stale April load, not a live feed.
 */

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import type { Map as MapLibreMap } from "maplibre-gl"

interface Props {
  map: MapLibreMap | null
  enabled: boolean
  opacity?: number
}

const SRC = "crep-mindex-firms"
const HEAT = "crep-mindex-firms-heat"
const DOT = "crep-mindex-firms-dot"
// VIIRS refreshes on a multi-hour orbital cadence — a slow refresh is plenty.
const REFRESH_MS = 10 * 60 * 1000

export default function MindexFirmsLayer({ map, enabled, opacity = 0.85 }: Props) {
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const lastBboxRef = useRef<string>("")

  // Lifecycle: create source + layers when enabled, tear down when not.
  useEffect(() => {
    if (!map) return
    let cancelled = false

    const onClick = (e: any) => {
      const p = e.features?.[0]?.properties
      const lngLat = e.lngLat
      let when = ""
      try { if (p?.detectedAt) when = new Date(p.detectedAt).toUTCString() } catch { /* */ }
      const html =
        `<div style="font:11px/1.4 system-ui,sans-serif;color:#e2e8f0;max-width:220px">` +
        `<div style="color:#ff7a1f;font-weight:600;margin-bottom:2px">NASA FIRMS · thermal anomaly</div>` +
        `<div><span style="opacity:.55">satellite:</span> VIIRS</div>` +
        (when ? `<div><span style="opacity:.55">detected:</span> ${when}</div>` : "") +
        `<div><span style="opacity:.55">location:</span> ${lngLat.lat.toFixed(3)}, ${lngLat.lng.toFixed(3)}</div>` +
        `</div>`
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(lngLat)
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

    const ensureLayers = (data: any) => {
      if (cancelled) return
      try {
        const ex = map.getSource(SRC) as any
        if (ex?.setData) { ex.setData(data); return }
        map.addSource(SRC, { type: "geojson", data })
        // Density heatmap (primary) — fire color ramp; fades out as points fade in.
        map.addLayer({
          id: HEAT,
          type: "heatmap",
          source: SRC,
          paint: {
            // Uniform weight (no FRP yet); switch to ["get","frp"] when the ETL stores it.
            "heatmap-weight": 1,
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 2, 0.7, 6, 2, 10, 3],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 5, 3, 12, 6, 26, 9, 48],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 6.5, 0.85 * opacity, 9, 0.3 * opacity],
            "heatmap-color": [
              "interpolate", ["linear"], ["heatmap-density"],
              0, "rgba(0,0,0,0)",
              0.15, "rgba(255,221,51,0.5)",
              0.4, "rgba(255,140,0,0.72)",
              0.7, "rgba(255,60,0,0.86)",
              1, "rgba(255,20,0,0.96)",
            ],
          },
        })
        // Individual detections — fade in at high zoom (heatmap blurs there).
        map.addLayer({
          id: DOT,
          type: "circle",
          source: SRC,
          minzoom: 6,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 4, 13, 6],
            "circle-color": "#ff5a1f",
            "circle-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 8, opacity],
            "circle-stroke-width": 0.5,
            "circle-stroke-color": "rgba(255,255,255,0.6)",
          },
        })
        map.on("click", DOT, onClick)
        map.on("mouseenter", DOT, onEnter)
        map.on("mouseleave", DOT, onLeave)
      } catch (e) { console.warn("[mindex-firms]", e) }
    }

    const fetchData = async (force = false) => {
      if (cancelled || !enabled || !map) return
      try {
        const b = map.getBounds()
        const bbox = `${b.getWest().toFixed(3)},${b.getSouth().toFixed(3)},${b.getEast().toFixed(3)},${b.getNorth().toFixed(3)}`
        if (!force && bbox === lastBboxRef.current) return
        lastBboxRef.current = bbox
        const res = await fetch(
          `/api/crep/environment/wildfires?bbox=${encodeURIComponent(bbox)}&limit=2000`,
          { cache: "default" },
        )
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
  }, [map, enabled, opacity])

  return null
}
