"use client"

/**
 * Nav Channels layer (Earth Simulator — Ocean & Coastal) — Jun 15 2026
 *
 * Morgan: "more accurate locations of buoys, channels in the water."
 *
 * Renders NOAA ENC maintained navigation channels + fairways (the "channels in
 * the water") on the globe from /api/crep/ocean/channels — fill + outline + the
 * channel name along the line. Click a channel → popup with name + charted
 * maintained depth (DRVAL1). Viewport-scoped: only fetched at coastal detail
 * (zoom ≥ MIN_ZOOM) so a global view never pulls the whole coastline. Self-
 * contained (owns its sources/layers) and tears down cleanly when toggled off.
 */

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import type { Map as MapLibreMap } from "maplibre-gl"

interface Props {
  map: MapLibreMap | null
  enabled: boolean
}

const SRC = "crep-nav-channels"
const FILL = "crep-nav-channels-fill"
const LINE = "crep-nav-channels-line"
const LABEL = "crep-nav-channels-label"
const CUR_SRC = "crep-ocean-currents"
const CUR_ARROW = "crep-ocean-currents-arrow"
const CUR_LABEL = "crep-ocean-currents-label"
const MIN_ZOOM = 8 // channels/currents are local features — only paint at coastal detail

export default function NavChannelsLayer({ map, enabled }: Props) {
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const lastBboxRef = useRef<string>("")

  useEffect(() => {
    if (!map) return
    let cancelled = false

    const removeAll = () => {
      for (const id of [LABEL, LINE, FILL, CUR_LABEL, CUR_ARROW]) { try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ } }
      try { if (map.getSource(SRC)) map.removeSource(SRC) } catch { /* */ }
      try { if (map.getSource(CUR_SRC)) map.removeSource(CUR_SRC) } catch { /* */ }
      lastBboxRef.current = ""
    }

    // ── Tidal current arrows (NOAA CO-OPS): "↑" glyph rotated to the current set,
    // sized by speed, cyan=flood / amber=ebb, with a "0.9 kn flood" label. ──
    const ensureCurrents = (data: any) => {
      if (cancelled) return
      try {
        const existing = map.getSource(CUR_SRC) as any
        if (existing) { existing.setData(data); return }
        map.addSource(CUR_SRC, { type: "geojson", data })
        map.addLayer({
          id: CUR_ARROW, type: "symbol", source: CUR_SRC,
          layout: {
            "text-field": "↑",
            "text-rotate": ["coalesce", ["get", "direction_deg"], 0],
            "text-rotation-alignment": "map",
            "text-size": ["interpolate", ["linear"], ["coalesce", ["get", "velocity_knots"], 0], 0, 16, 3, 34],
            "text-allow-overlap": true,
          },
          paint: { "text-color": ["match", ["get", "phase"], "ebb", "#fbbf24", "#22d3ee"], "text-halo-color": "#04212a", "text-halo-width": 1.4 },
        })
        map.addLayer({
          id: CUR_LABEL, type: "symbol", source: CUR_SRC,
          layout: { "text-field": ["coalesce", ["get", "label"], ""], "text-size": 9, "text-offset": [0, 1.7], "text-allow-overlap": true },
          paint: { "text-color": "#a5f3fc", "text-halo-color": "#04212a", "text-halo-width": 1.2 },
        })
      } catch (e) { console.warn("[nav-channels] currents", e) }
    }
    const fetchCurrents = async () => {
      if (cancelled || !enabled || !map) return
      if ((map.getZoom?.() ?? 0) < MIN_ZOOM) return
      try {
        const res = await fetch(`/api/crep/ocean/currents`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        const features = (data.features || []).map((f: any) => ({
          ...f,
          properties: { ...f.properties, label: `${Number(f.properties?.velocity_knots ?? 0).toFixed(1)} kn ${f.properties?.phase ?? ""}`.trim() },
        }))
        if (!cancelled && enabled) ensureCurrents({ type: "FeatureCollection", features })
      } catch { /* */ }
    }

    const onChannelClick = (e: any) => {
      const f = e.features?.[0]
      if (!f) return
      const name = f.properties?.OBJNAM || "Maintained Channel"
      const depth = f.properties?.DRVAL1
      const src = f.properties?.SORDAT
      const html =
        `<div style="font:11px/1.4 system-ui,sans-serif;color:#e2e8f0;min-width:140px">` +
        `<div style="color:#67e8f9;font-weight:600;margin-bottom:2px">${name}</div>` +
        (depth != null ? `<div>Maintained depth: <b>${depth} m</b></div>` : ``) +
        (src ? `<div style="opacity:.6">Survey ${src}</div>` : ``) +
        `<div style="opacity:.6;margin-top:2px">NOAA ENC · nav channel</div></div>`
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true, className: "crep-channel-popup" })
        .setLngLat(e.lngLat)
        .setHTML(html)
        .addTo(map)
    }
    const onEnter = () => { try { map.getCanvas().style.cursor = "pointer" } catch { /* */ } }
    const onLeave = () => { try { map.getCanvas().style.cursor = "" } catch { /* */ } }

    const ensureLayers = (data: any) => {
      if (cancelled) return
      try {
        const existing = map.getSource(SRC) as any
        if (existing) { existing.setData(data); return }
        map.addSource(SRC, { type: "geojson", data })
        map.addLayer({ id: FILL, type: "fill", source: SRC, paint: { "fill-color": "#22d3ee", "fill-opacity": 0.12 } })
        map.addLayer({ id: LINE, type: "line", source: SRC, paint: { "line-color": "#22d3ee", "line-width": 1.4, "line-opacity": 0.75 } })
        map.addLayer({
          id: LABEL, type: "symbol", source: SRC,
          layout: { "text-field": ["coalesce", ["get", "OBJNAM"], "Channel"], "text-size": 10, "symbol-placement": "line", "text-max-angle": 40 },
          paint: { "text-color": "#a5f3fc", "text-halo-color": "#062c33", "text-halo-width": 1.2 },
        })
        map.on("click", FILL, onChannelClick)
        map.on("mouseenter", FILL, onEnter)
        map.on("mouseleave", FILL, onLeave)
      } catch (e) { console.warn("[nav-channels] layer", e) }
    }

    const fetchChannels = async () => {
      if (cancelled || !enabled || !map) return
      if ((map.getZoom?.() ?? 0) < MIN_ZOOM) { removeAll(); return }
      const b = map.getBounds()
      const bbox = `${b.getWest().toFixed(3)},${b.getSouth().toFixed(3)},${b.getEast().toFixed(3)},${b.getNorth().toFixed(3)}`
      if (bbox === lastBboxRef.current) return
      lastBboxRef.current = bbox
      try {
        const res = await fetch(`/api/crep/ocean/channels?bbox=${encodeURIComponent(bbox)}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && enabled) ensureLayers({ type: "FeatureCollection", features: data.features || [] })
      } catch { /* */ }
    }

    if (!enabled) { removeAll(); return }

    let t: any
    const onMoveEnd = () => { clearTimeout(t); t = setTimeout(fetchChannels, 600) }
    map.on("moveend", onMoveEnd)
    fetchChannels()
    fetchCurrents()

    return () => {
      cancelled = true
      clearTimeout(t)
      try { map.off("moveend", onMoveEnd); map.off("click", FILL, onChannelClick); map.off("mouseenter", FILL, onEnter); map.off("mouseleave", FILL, onLeave) } catch { /* */ }
      try { popupRef.current?.remove() } catch { /* */ }
      removeAll()
    }
  }, [map, enabled])

  return null
}
