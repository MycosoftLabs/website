"use client"

/**
 * Live AQI Layer — Apr 23, 2026
 *
 * Morgan: "all aqi live feeds not working fix them".
 *
 * The AirNow endpoint /api/crep/airnow/bbox?bbox=w,s,e,n returns every
 * AirNow monitor inside the viewport with its current reading as GeoJSON
 * FeatureCollection. This layer polls that endpoint on pan/zoom (debounced
 * 800 ms) and paints each monitor as a circle colored by AQI category
 * (1-6 EPA scale, green→maroon). Click → fire a window event the
 * LiveAQIWidget subscribes to.
 *
 * Requires AIRNOW_API_KEY on the server. If the key isn't set the endpoint
 * returns 501; the layer silently stays empty.
 *
 * MapLibre native (not DOM markers) — scales to thousands of monitors
 * nationally without DOM pressure.
 */

import { useEffect, useRef } from "react"
import type maplibregl from "maplibre-gl"

const SOURCE_ID = "crep-live-aqi"
const DOT_LAYER_ID = "crep-live-aqi-dot"
const GLOW_LAYER_ID = "crep-live-aqi-glow"

/**
 * EPA AQI color ramp keyed on `aqi_category_number` (1-6).
 * Matches AirNow's public AQI color chart.
 */
const AQI_COLORS: Record<number, string> = {
  1: "#00e400", // Good
  2: "#ffff00", // Moderate
  3: "#ff7e00", // Unhealthy for Sensitive
  4: "#ff0000", // Unhealthy
  5: "#8f3f97", // Very Unhealthy
  6: "#7e0023", // Hazardous
}

interface Props {
  map: maplibregl.Map | null
  visible: boolean
  bbox?: [number, number, number, number] | null
  /** Debounce window before issuing a fetch after pan/zoom. Default 800 ms. */
  debounceMs?: number
  /** Polling cadence when bbox stable. Default 300_000 (5 min — AirNow updates hourly). */
  pollMs?: number
}

export function LiveAqiLayer({ map, visible, bbox, debounceMs = 800, pollMs = 300_000 }: Props) {
  // ── source + layers once map is ready ─────────────────────────────
  useEffect(() => {
    if (!map) return
    const emptyFC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] }

    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) return
      map.addSource(SOURCE_ID, { type: "geojson", data: emptyFC })

      // Glow halo (below dots).
      map.addLayer({
        id: GLOW_LAYER_ID, type: "circle", source: SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 8, 8, 12, 14, 16, 22],
          "circle-color": [
            "match", ["coalesce", ["to-number", ["get", "aqi_category_number"]], 1],
            1, AQI_COLORS[1], 2, AQI_COLORS[2], 3, AQI_COLORS[3],
            4, AQI_COLORS[4], 5, AQI_COLORS[5], 6, AQI_COLORS[6],
            AQI_COLORS[1],
          ],
          "circle-opacity": 0.25,
          "circle-blur": 0.9,
        },
      })

      // Solid dot.
      map.addLayer({
        id: DOT_LAYER_ID, type: "circle", source: SOURCE_ID,
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 2, 8, 4, 12, 7, 16, 11],
          "circle-color": [
            "match", ["coalesce", ["to-number", ["get", "aqi_category_number"]], 1],
            1, AQI_COLORS[1], 2, AQI_COLORS[2], 3, AQI_COLORS[3],
            4, AQI_COLORS[4], 5, AQI_COLORS[5], 6, AQI_COLORS[6],
            AQI_COLORS[1],
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": 0.95,
        },
      })

      // Click → dispatch event so the infra-detail widget can render the
      // existing LiveAQIWidget next to the marker (same pattern as the
      // other click handlers). Fallback: __crep_selectAsset so the generic
      // widget can open the monitor metadata even without the AQI widget.
      map.on("click", DOT_LAYER_ID, (e: any) => {
        const f = e.features?.[0]
        if (!f) return
        const p = f.properties || {}
        const [lng, lat] = (f.geometry?.coordinates || [e.lngLat?.lng, e.lngLat?.lat]) as [number, number]
        try {
          window.dispatchEvent(new CustomEvent("crep:airnow:monitor-click", { detail: { ...p, lat, lng } }))
        } catch { /* ignore */ }
        const hook = (window as any).__crep_selectAsset
        if (typeof hook === "function") {
          hook({
            type: "aqi_monitor",
            id: p.id,
            name: p.name || "AQI monitor",
            lat, lng,
            properties: p,
          })
        }
      })
      map.on("mouseenter", DOT_LAYER_ID, () => { map.getCanvas().style.cursor = "pointer" })
      map.on("mouseleave", DOT_LAYER_ID, () => { map.getCanvas().style.cursor = "" })
    }

    // Race-style readiness (same pattern as LiveTransitLayer to survive
    // the case where the `load` event already fired before mount).
    let fired = false
    const once = () => { if (fired) return; fired = true; addLayers() }
    if ((map as any).isStyleLoaded?.()) once()
    map.once("load", once)
    map.once("styledata", once)
    map.once("idle", once)
    try { once() } catch { /* map not ready yet, event handlers cover it */ }

    return () => {
      try {
        if (map.getLayer(DOT_LAYER_ID)) map.removeLayer(DOT_LAYER_ID)
        if (map.getLayer(GLOW_LAYER_ID)) map.removeLayer(GLOW_LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch { /* torn down */ }
    }
  }, [map])

  // ── visibility toggle ─────────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const apply = () => {
      const v = visible ? "visible" : "none"
      for (const id of [DOT_LAYER_ID, GLOW_LAYER_ID]) {
        try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v) } catch { /* ignore */ }
      }
    }
    if ((map as any).isStyleLoaded?.()) apply()
    else map.once("load", apply)
  }, [map, visible])

  // ── bbox fetch (debounced) + periodic refresh ────────────────────
  const lastBboxRef = useRef<string>("")
  const timerRef = useRef<any>(null)
  useEffect(() => {
    if (!map || !visible) return
    let cancelled = false
    let intervalId: any = null
    let firstLogged = false

    const waitForSource = async (timeoutMs = 15_000): Promise<maplibregl.GeoJSONSource | null> => {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        if (cancelled) return null
        const s = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
        if (s) return s
        await new Promise((r) => setTimeout(r, 300))
      }
      return null
    }

    const poll = async () => {
      if (cancelled) return
      if (typeof document !== "undefined" && document.hidden) return
      if (!bbox) return
      const bboxStr = bbox.join(",")
      try {
        const res = await fetch(`/api/crep/airnow/bbox?bbox=${encodeURIComponent(bboxStr)}`, {
          signal: AbortSignal.timeout(10_000),
          cache: "no-store",
        })
        if (res.status === 501) {
          // Server says AIRNOW_API_KEY not configured — stop polling.
          cancelled = true
          if (intervalId) clearInterval(intervalId)
          // eslint-disable-next-line no-console
          console.warn("[CREP/AQI] AIRNOW_API_KEY not configured on server — AQI layer inert.")
          return
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const fc = await res.json()
        if (cancelled) return
        const src = await waitForSource()
        if (!src) return
        src.setData({
          type: "FeatureCollection",
          features: Array.isArray(fc?.features) ? fc.features : [],
        })
        if (!firstLogged) {
          firstLogged = true
          // eslint-disable-next-line no-console
          console.log(`[CREP/AQI] first paint: ${fc?.monitor_count ?? fc?.features?.length ?? 0} monitors (bbox=${bboxStr})`)
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[CREP/AQI] poll failed:", (e as Error)?.message)
      }
    }

    // Debounced bbox-change fetch + periodic refresh while bbox stable.
    const bboxKey = bbox ? bbox.map((n) => n.toFixed(2)).join(",") : ""
    if (bboxKey !== lastBboxRef.current) {
      lastBboxRef.current = bboxKey
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => { poll() }, debounceMs)
    }
    intervalId = setInterval(() => { if (!cancelled) poll() }, pollMs)

    return () => {
      cancelled = true
      if (intervalId) clearInterval(intervalId)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [map, visible, bbox, debounceMs, pollMs])

  return null
}
