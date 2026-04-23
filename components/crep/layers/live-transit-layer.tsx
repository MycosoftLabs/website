"use client"

/**
 * Live Transit Layer — Apr 23, 2026
 *
 * Morgan: "compete with google maps live traffic public transportation".
 * Morgan (urgent): "i also do not see any trains rendering moving on any
 * tracks iun any city".
 *
 * Renders live vehicle positions from every transit agency we connect to
 * (MTA, WMATA, BART, MBTA, 511 SF Bay, CTA, TriMet, MARTA, Amtrak, SEPTA,
 * Metrolink, DART) as MapLibre native circle layers. Polls
 * `/api/transit/all?bbox=...` every 15 s with the current viewport.
 *
 * Separate layers per vehicle_type so we can color + size each independently:
 *   subway   — bright blue, small dot
 *   rail     — cyan, slightly larger
 *   bus      — green, small dot
 *   tram     — emerald, small dot
 *   ferry    — indigo, slightly larger
 *   other    — gray, small dot
 *
 * The hover popup shows: agency, route_short_name, vehicle_id, occupancy,
 * current_status, last-seen age.
 */

import { useEffect, useRef } from "react"
import type maplibregl from "maplibre-gl"

const SOURCE_ID = "crep-live-transit"
const TYPE_COLORS: Record<string, string> = {
  subway: "#3b82f6",   // blue-500
  rail: "#06b6d4",     // cyan-500
  bus: "#10b981",      // emerald-500
  tram: "#14b8a6",     // teal-500
  ferry: "#6366f1",    // indigo-500
  other: "#9ca3af",    // gray-400
}

interface Props {
  map: maplibregl.Map | null
  visible: boolean
  bbox?: [number, number, number, number] | null
  /** ms between polls. Default 15_000 */
  pollMs?: number
  onSelect?: (props: any) => void
}

export function LiveTransitLayer({ map, visible, bbox, pollMs = 15_000, onSelect }: Props) {
  const selectRef = useRef(onSelect)
  useEffect(() => { selectRef.current = onSelect }, [onSelect])

  // ── source + layers once map is ready ──────────────────────────────
  useEffect(() => {
    if (!map) return
    const emptyFC: GeoJSON.FeatureCollection = { type: "FeatureCollection", features: [] }

    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) return
      map.addSource(SOURCE_ID, { type: "geojson", data: emptyFC })

      // ── Halo glow (below dots) ────────────────────────────────────
      map.addLayer({
        id: `${SOURCE_ID}-glow`, type: "circle", source: SOURCE_ID,
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            4, 2, 8, 4, 12, 8, 16, 14,
          ],
          "circle-color": [
            "match", ["coalesce", ["get", "vehicle_type"], "other"],
            "subway", TYPE_COLORS.subway,
            "rail", TYPE_COLORS.rail,
            "bus", TYPE_COLORS.bus,
            "tram", TYPE_COLORS.tram,
            "ferry", TYPE_COLORS.ferry,
            TYPE_COLORS.other,
          ],
          "circle-opacity": 0.25,
          "circle-blur": 0.9,
        },
      })

      // ── Solid dot ─────────────────────────────────────────────────
      map.addLayer({
        id: `${SOURCE_ID}-dot`, type: "circle", source: SOURCE_ID,
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            4, 1.5, 8, 2.5, 12, 4, 16, 7,
          ],
          "circle-color": [
            "match", ["coalesce", ["get", "vehicle_type"], "other"],
            "subway", TYPE_COLORS.subway,
            "rail", TYPE_COLORS.rail,
            "bus", TYPE_COLORS.bus,
            "tram", TYPE_COLORS.tram,
            "ferry", TYPE_COLORS.ferry,
            TYPE_COLORS.other,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1,
          "circle-opacity": 1,
        },
      })

      // Click → bubble up to parent so it can open the vehicle widget
      map.on("click", `${SOURCE_ID}-dot`, (e: any) => {
        const f = e.features?.[0]
        if (f && selectRef.current) selectRef.current(f.properties)
      })
      map.on("mouseenter", `${SOURCE_ID}-dot`, () => { map.getCanvas().style.cursor = "pointer" })
      map.on("mouseleave", `${SOURCE_ID}-dot`, () => { map.getCanvas().style.cursor = "" })
    }

    // Apr 23, 2026 — robust readiness: `isStyleLoaded()` can return false
    // even when the map is fully interactive (e.g. during incremental
    // style diffs). `once("load")` never fires if the "load" event
    // already passed before we attached. Try both styledata + load +
    // idle events so whichever fires first wins, then one immediate
    // attempt in case all three already fired.
    let fired = false
    const once = () => { if (fired) return; fired = true; addLayers() }
    if ((map as any).isStyleLoaded?.()) once()
    map.once("load", once)
    map.once("styledata", once)
    map.once("idle", once)
    // Immediate attempt — addLayers is idempotent (guarded by getSource)
    try { once() } catch { /* map not ready yet, handlers will catch */ }

    return () => {
      try {
        if (map.getLayer(`${SOURCE_ID}-dot`)) map.removeLayer(`${SOURCE_ID}-dot`)
        if (map.getLayer(`${SOURCE_ID}-glow`)) map.removeLayer(`${SOURCE_ID}-glow`)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch { /* torn down */ }
    }
  }, [map])

  // ── visibility toggle ─────────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const apply = () => {
      const v = visible ? "visible" : "none"
      for (const id of [`${SOURCE_ID}-dot`, `${SOURCE_ID}-glow`]) {
        try { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", v) } catch {}
      }
    }
    if ((map as any).isStyleLoaded?.()) apply()
    else map.once("load", apply)
  }, [map, visible])

  // ── poll /api/transit/all ─────────────────────────────────────────
  useEffect(() => {
    if (!map || !visible) return
    let cancelled = false
    let intervalId: any = null
    // Apr 23, 2026 — Morgan (browser audit after PR #119 deployed):
    // source "crep-live-transit" exists, /api/transit/all returns 3047 MTA
    // vehicles for NYC bbox, but window.__crep_last_transit_count stayed
    // undefined. That means the poll's try-block never reached the write.
    //
    // Likely race: `poll()` fires on mount BEFORE the add-layers effect
    // (same component, different useEffect) actually creates the source.
    // Previously we silently `return` when source is missing — permanent
    // data loss if the source spawns *after* poll's first tick and before
    // the 15s interval wraps. Worse: the silent `catch{}` hid every
    // fetch / JSON / setData error too.
    //
    // New contract:
    //   • `poll()` retries every 500 ms until the source exists (up to 30s)
    //   • Any thrown error logs [CREP/LiveTransit] and counts toward a
    //     breaker so we don't spam devtools if the endpoint is dead.
    //   • Success writes window.__crep_last_transit_count + logs the first
    //     successful paint count.
    const bboxStr = bbox ? bbox.join(",") : ""
    const errCountRef = { v: 0 }
    let firstLogged = false

    const waitForSource = async (timeoutMs = 30_000): Promise<maplibregl.GeoJSONSource | null> => {
      const start = Date.now()
      while (Date.now() - start < timeoutMs) {
        if (cancelled) return null
        const s = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
        if (s) return s
        await new Promise((r) => setTimeout(r, 500))
      }
      return null
    }

    const poll = async () => {
      if (cancelled) return
      try {
        const url = `/api/transit/all${bboxStr ? `?bbox=${encodeURIComponent(bboxStr)}` : ""}`
        const r = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" })
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        const j = await r.json()
        if (cancelled) return
        const src = await waitForSource()
        if (!src) throw new Error("source 'crep-live-transit' never appeared")
        src.setData({
          type: "FeatureCollection",
          features: Array.isArray(j?.features) ? j.features : [],
        })
        errCountRef.v = 0
        const n = j?.vehicles_total ?? j?.features?.length ?? 0
        if (typeof window !== "undefined") {
          ;(window as any).__crep_last_transit_count = n
        }
        if (!firstLogged) {
          firstLogged = true
          // eslint-disable-next-line no-console
          console.log(`[CREP/LiveTransit] first paint: ${n} vehicles (bbox=${bboxStr || "global"})`)
        }
      } catch (e) {
        errCountRef.v++
        if (errCountRef.v <= 3) {
          // eslint-disable-next-line no-console
          console.warn(`[CREP/LiveTransit] poll ${errCountRef.v}:`, (e as Error)?.message)
        }
      }
    }

    poll()
    intervalId = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return
      poll()
    }, pollMs)

    return () => { cancelled = true; if (intervalId) clearInterval(intervalId) }
  }, [map, visible, bbox, pollMs])

  return null
}
