"use client"

import { useEffect, useRef } from "react"
import maplibregl, { type Map as MapLibreMap } from "maplibre-gl"
import { isParticulateFeature } from "@/lib/fusarium/aerosol/shared-earth-contracts"

type MapLike = MapLibreMap | { current: MapLibreMap | null } | null | undefined

interface AerosolParticulateLayerProps {
  map: MapLike
  visible: boolean
}

function resolveMap(m: MapLike): MapLibreMap | null {
  if (m && typeof (m as MapLibreMap).getStyle === "function") return m as MapLibreMap
  const fromRef = m && typeof m === "object" && "current" in m
    ? (m as { current?: MapLibreMap | null }).current
    : null
  if (fromRef && typeof fromRef.getStyle === "function") return fromRef
  if (typeof window !== "undefined") {
    const globalMap = (window as unknown as { __crep_map?: MapLibreMap }).__crep_map
    if (globalMap && typeof globalMap.getStyle === "function") return globalMap
  }
  return null
}

const SOURCE_ID = "fusarium-aerosol-particulate"
const HEAT_LAYER_ID = `${SOURCE_ID}-heat`
const DOT_LAYER_ID = `${SOURCE_ID}-dot`
const ENDPOINT = "/api/crep/environment/air-quality"
const AIRNOW_ENDPOINT = "/api/crep/airnow/bbox"

/**
 * Aerosol-only PM filter over Earth Simulator's existing MINDEX air-quality
 * contract. It does not create a second data source: the filter reads the same
 * shared BFF and withholds every feature that does not explicitly name PM2.5,
 * PM10, particulate, or dust in the source-preserved summary.
 */
export function AerosolParticulateLayer({ map: mapLike, visible }: AerosolParticulateLayerProps) {
  const popupRef = useRef<maplibregl.Popup | null>(null)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    let debounceTimer = 0
    let attached: MapLibreMap | null = null
    let poll: ReturnType<typeof setInterval> | null = null
    let detach = () => {}

    const tryAttach = () => {
      if (cancelled || attached) return
      const resolved = resolveMap(mapLike)
      if (!resolved) return
      attached = resolved
      if (poll) {
        clearInterval(poll)
        poll = null
      }
      start(resolved)
    }

    const start = (map: MapLibreMap) => {

    const escapeHtml = (value: unknown) => String(value).replace(/[&<>"']/g, (character) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character] as string
    ))
    const remove = () => {
      try { map.off("click", DOT_LAYER_ID, onClick) } catch { /* layer may not exist */ }
      try { if (map.getLayer(DOT_LAYER_ID)) map.removeLayer(DOT_LAYER_ID) } catch { /* style teardown */ }
      try { if (map.getLayer(HEAT_LAYER_ID)) map.removeLayer(HEAT_LAYER_ID) } catch { /* style teardown */ }
      try { if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID) } catch { /* style teardown */ }
      popupRef.current?.remove()
      popupRef.current = null
    }
    const onClick = (event: any) => {
      const properties = event.features?.[0]?.properties
      if (!properties) return
      popupRef.current?.remove()
      popupRef.current = new maplibregl.Popup({ closeButton: true, closeOnClick: true })
        .setLngLat(event.lngLat)
        .setHTML(
          `<div style="font:11px/1.45 system-ui,sans-serif;color:#e2e8f0;max-width:240px">` +
          `<div style="color:#ffc46b;font-weight:700;margin-bottom:3px">${escapeHtml(properties.stationName || "Particulate monitor")}</div>` +
          `<div>${escapeHtml(properties.summary || "Explicit particulate reading")}</div>` +
          `<div style="opacity:.6">source: ${escapeHtml(properties.source || "MINDEX")}</div>` +
          (properties.measuredAt ? `<div style="opacity:.6">measured: ${escapeHtml(properties.measuredAt)}</div>` : "") +
          `</div>`,
        )
        .addTo(map)
    }
    const install = (features: unknown[]) => {
      if (cancelled) return
      const data = { type: "FeatureCollection", features: features.filter(isParticulateFeature) }
      const existing = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
      if (existing) {
        existing.setData(data as GeoJSON.FeatureCollection)
        return
      }
      map.addSource(SOURCE_ID, { type: "geojson", data: data as GeoJSON.FeatureCollection })
      map.addLayer({
        id: HEAT_LAYER_ID,
        type: "heatmap",
        source: SOURCE_ID,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 1, 0.55, 6, 1.7, 10, 2.5],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 1, 8, 6, 30, 10, 56],
          "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 5, 0.76, 9, 0.32],
          "heatmap-color": [
            "interpolate", ["linear"], ["heatmap-density"],
            0, "rgba(0,0,0,0)",
            0.2, "rgba(255,226,139,0.36)",
            0.48, "rgba(255,176,75,0.62)",
            0.74, "rgba(247,111,62,0.82)",
            1, "rgba(190,46,46,0.94)",
          ],
        },
      })
      map.addLayer({
        id: DOT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        minzoom: 6,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 2, 10, 5, 13, 7],
          "circle-color": "#ffc46b",
          "circle-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 8, 0.92],
          "circle-stroke-width": 0.7,
          "circle-stroke-color": "rgba(255,255,255,0.75)",
        },
      })
      map.on("click", DOT_LAYER_ID, onClick)
    }
    const normalizeAirNow = (features: unknown[]) => features.map((feature) => {
      const row = (feature && typeof feature === "object" ? feature : {}) as { properties?: Record<string, unknown>; geometry?: unknown }
      const properties = row.properties && typeof row.properties === "object" ? row.properties : {}
      const parameter = typeof properties.parameter === "string" ? properties.parameter : "PM"
      const aqi = properties.aqi != null ? ` AQI ${properties.aqi}` : ""
      return {
        ...row,
        properties: {
          ...properties,
          stationName: properties.name ?? properties.stationName,
          summary: `${parameter}${aqi}`,
          source: "airnow",
          measuredAt: properties.observed_at ?? properties.measuredAt,
        },
      }
    })
    const read = async () => {
      if (!visible || cancelled) return
      try {
        const bounds = map.getBounds()
        const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
          .map((value) => value.toFixed(3))
          .join(",")
        const response = await fetch(`${ENDPOINT}?bbox=${encodeURIComponent(bbox)}&limit=2000`, {
          cache: "default",
          credentials: "same-origin",
        })
        if (!response.ok || cancelled) return
        const body = await response.json()
        if (!Array.isArray(body?.features)) return
        const mindexPm = body.features.filter(isParticulateFeature)
        if (mindexPm.length > 0) {
          install(mindexPm)
          return
        }
        // Same AirNow BFF the aerosol readiness rail already uses. Empty MINDEX
        // AQ is no-data, not unbound — draw AirNow PM when that read has features.
        const airnow = await fetch(`${AIRNOW_ENDPOINT}?bbox=${encodeURIComponent(bbox)}&parameters=PM25,PM10`, {
          cache: "default",
          credentials: "same-origin",
        })
        if (!airnow.ok || cancelled) {
          install([])
          return
        }
        const airBody = await airnow.json()
        const airFeatures = Array.isArray(airBody?.features) ? normalizeAirNow(airBody.features) : []
        install(airFeatures.filter(isParticulateFeature))
      } catch {
        // The readiness rail remains the source of truth; retain no replacement data.
      }
    }
    const onMoveEnd = () => {
      window.clearTimeout(debounceTimer)
      debounceTimer = window.setTimeout(() => void read(), 600)
    }
    const onStyleLoad = () => void read()

    map.on("moveend", onMoveEnd)
    map.on("style.load", onStyleLoad)
    if (map.isStyleLoaded()) void read()
    const refreshTimer = window.setInterval(() => void read(), 10 * 60 * 1000)
    detach = () => {
      cancelled = true
      window.clearTimeout(debounceTimer)
      window.clearInterval(refreshTimer)
      try { map.off("moveend", onMoveEnd) } catch { /* map teardown */ }
      try { map.off("style.load", onStyleLoad) } catch { /* map teardown */ }
      remove()
    }
    }

    tryAttach()
    if (!attached) poll = setInterval(tryAttach, 200)

    return () => {
      cancelled = true
      if (poll) clearInterval(poll)
      detach()
    }
  }, [mapLike, visible])

  return null
}
