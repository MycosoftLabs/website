"use client"

/**
 * Earth Simulator — MINDEX FIRMS wildfire layer (additive, default-OFF).
 *
 * Renders NASA FIRMS VIIRS thermal detections from MINDEX `earth.wildfires`
 * (via the internal-token BFF `/api/crep/environment/wildfires`) as a static
 * glow + dot circle stack. Self-contained: owns its source + two layers,
 * viewport-scoped fetch on moveend + a slow periodic refresh, and full
 * teardown on disable/unmount — so with the toggle off the globe is
 * byte-for-byte identical to v1.
 *
 * Intentionally NOT animated. The BlueSite `FireLayer` paints ~5 animated
 * features per fire on a 60fps rAF loop; FIRMS is dense (~1530 globally), so
 * a single static circle per detection is the FPS-safe choice (static GeoJSON
 * circles are GPU-cheap — the prior FPS work targeted per-frame JS movers,
 * not static circle layers).
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
const GLOW = "crep-mindex-firms-glow"
const DOT = "crep-mindex-firms-dot"
// FIRMS dots are meaningless sub-pixel specks at full-globe zoom; reveal from
// near-continent scale up. (The default Earth Sim view opens at ~z3.)
const MIN_ZOOM = 2
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
      if (!p) return
      let when = ""
      try { if (p.detectedAt) when = new Date(p.detectedAt).toUTCString() } catch { /* */ }
      const html =
        `<div style="font:11px/1.4 system-ui,sans-serif;color:#e2e8f0;max-width:230px">` +
        `<div style="color:#fb923c;font-weight:600;margin-bottom:2px">${p.name || "FIRMS detection"}</div>` +
        (when ? `<div><span style="opacity:.55">detected:</span> ${when}</div>` : "") +
        `<div><span style="opacity:.55">source:</span> ${p.source || "firms"}</div>` +
        (p.severity ? `<div><span style="opacity:.55">severity:</span> ${p.severity}</div>` : "") +
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
          minzoom: MIN_ZOOM,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 8, 9, 12, 16],
            "circle-color": "#fb923c",
            "circle-opacity": 0.25,
            "circle-blur": 0.9,
          },
        })
        map.addLayer({
          id: DOT,
          type: "circle",
          source: SRC,
          minzoom: MIN_ZOOM,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2, 8, 4, 12, 6],
            "circle-color": "#fb923c",
            "circle-opacity": 0.9,
            "circle-stroke-width": 1,
            "circle-stroke-color": "rgba(255,255,255,0.7)",
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
  }, [map, enabled])

  // Opacity follows the layer's opacity slider without re-fetching.
  useEffect(() => {
    if (!map || !enabled) return
    try { if (map.getLayer(DOT)) map.setPaintProperty(DOT, "circle-opacity", opacity) } catch { /* */ }
  }, [map, enabled, opacity])

  return null
}
