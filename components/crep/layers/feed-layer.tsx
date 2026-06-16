"use client"

/**
 * Earth Simulator — generic config-driven data layer.
 *
 * Renders ONE FeedConfig: fetches /api/crep/feed/{id} (bbox-scoped or global),
 * paints it per config.render (circle | line | polygon | heat | symbol), and
 * shows a click popup of the config's props. Self-contained (owns its source +
 * layers, tears down on toggle-off). Every registry feed mounts one of these.
 */

import { useEffect, useRef } from "react"
import maplibregl from "maplibre-gl"
import type { Map as MapLibreMap } from "maplibre-gl"
import type { FeedConfig } from "@/lib/crep/feeds/registry"

interface Props {
  map: MapLibreMap | null
  config: FeedConfig
  enabled: boolean
}

export default function FeedLayer({ map, config, enabled }: Props) {
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const lastBboxRef = useRef<string>("")

  useEffect(() => {
    if (!map) return
    let cancelled = false
    const SRC = `crep-feed-${config.id}`
    const base = `crep-feed-${config.id}`
    const layerIds: string[] = []
    const clickIds: string[] = []

    const onClick = (e: any) => {
      const f = e.features?.[0]
      if (!f) return
      const rows = (config.props || [])
        .map((p) => { const v = f.properties?.[p]; return v == null || v === "" ? "" : `<div><span style="opacity:.55">${p}:</span> ${String(v).slice(0, 90)}</div>` })
        .filter(Boolean).join("")
      const html = `<div style="font:11px/1.4 system-ui,sans-serif;color:#e2e8f0;max-width:240px"><div style="color:${config.color};font-weight:600;margin-bottom:2px">${config.name}</div>${rows}</div>`
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true }).setLngLat(e.lngLat).setHTML(html).addTo(map)
    }
    const onEnter = () => { try { map.getCanvas().style.cursor = "pointer" } catch { /* */ } }
    const onLeave = () => { try { map.getCanvas().style.cursor = "" } catch { /* */ } }
    const bindClick = (id: string) => { map.on("click", id, onClick); map.on("mouseenter", id, onEnter); map.on("mouseleave", id, onLeave); clickIds.push(id) }

    const removeAll = () => {
      for (const id of clickIds) { try { map.off("click", id, onClick); map.off("mouseenter", id, onEnter); map.off("mouseleave", id, onLeave) } catch { /* */ } }
      clickIds.length = 0
      for (const id of layerIds) { try { if (map.getLayer(id)) map.removeLayer(id) } catch { /* */ } }
      layerIds.length = 0
      try { if (map.getSource(SRC)) map.removeSource(SRC) } catch { /* */ }
      lastBboxRef.current = ""
    }

    const addRenderLayers = () => {
      const r = config.render
      if (r === "line") {
        const id = `${base}-line`; layerIds.push(id)
        map.addLayer({ id, type: "line", source: SRC, paint: { "line-color": config.color, "line-width": 1.6, "line-opacity": 0.8 } })
        bindClick(id)
      } else if (r === "polygon") {
        const fid = `${base}-fill`, lid = `${base}-pline`; layerIds.push(fid, lid)
        map.addLayer({ id: fid, type: "fill", source: SRC, paint: { "fill-color": config.color, "fill-opacity": 0.14 } })
        map.addLayer({ id: lid, type: "line", source: SRC, paint: { "line-color": config.color, "line-width": 1.1, "line-opacity": 0.7 } })
        bindClick(fid)
      } else if (r === "heat") {
        const id = `${base}-heat`; layerIds.push(id)
        const wp = config.props?.[0]
        map.addLayer({ id, type: "heatmap", source: SRC, paint: {
          "heatmap-weight": wp ? ["max", 0.1, ["coalesce", ["to-number", ["get", wp]], 1]] : 1,
          "heatmap-radius": 18, "heatmap-opacity": 0.55,
          "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"], 0, "rgba(0,0,0,0)", 0.4, config.color, 1, "#ffffff"],
        } })
      } else { // circle | symbol → circle
        const id = `${base}-circle`; layerIds.push(id)
        map.addLayer({ id, type: "circle", source: SRC, paint: {
          "circle-radius": 4.5, "circle-color": config.color, "circle-opacity": 0.85,
          "circle-stroke-color": "rgba(0,0,0,0.5)", "circle-stroke-width": 0.6,
        } })
        bindClick(id)
      }
    }

    const ensure = (data: any) => {
      if (cancelled) return
      try {
        const ex = map.getSource(SRC) as any
        if (ex) { ex.setData(data); return }
        map.addSource(SRC, { type: "geojson", data })
        addRenderLayers()
      } catch (e) { console.warn(`[feed:${config.id}]`, e) }
    }

    const fetchData = async () => {
      if (cancelled || !enabled || !map) return
      if (config.bbox_scoped && (map.getZoom?.() ?? 0) < config.min_zoom) { removeAll(); return }
      let q = ""
      if (config.bbox_scoped) {
        const b = map.getBounds()
        const bbox = `${b.getWest().toFixed(3)},${b.getSouth().toFixed(3)},${b.getEast().toFixed(3)},${b.getNorth().toFixed(3)}`
        if (bbox === lastBboxRef.current) return
        lastBboxRef.current = bbox
        q = `?bbox=${encodeURIComponent(bbox)}`
      }
      try {
        const res = await fetch(`/api/crep/feed/${config.id}${q}`, { cache: "no-store" })
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled && enabled) ensure({ type: "FeatureCollection", features: data.features || [] })
      } catch { /* */ }
    }

    if (!enabled) { removeAll(); return }

    let moveT: any = 0
    let refreshT: any = 0
    const onMoveEnd = () => { clearTimeout(moveT); moveT = setTimeout(fetchData, 600) }
    if (config.bbox_scoped) map.on("moveend", onMoveEnd)
    else refreshT = setInterval(fetchData, Math.max(60, config.refresh_s || 300) * 1000)
    fetchData()

    return () => {
      cancelled = true
      clearTimeout(moveT); clearInterval(refreshT)
      try { if (config.bbox_scoped) map.off("moveend", onMoveEnd) } catch { /* */ }
      try { popupRef.current?.remove() } catch { /* */ }
      removeAll()
    }
  }, [map, enabled, config])

  return null
}
