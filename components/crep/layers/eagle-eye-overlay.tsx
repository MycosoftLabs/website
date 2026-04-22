"use client"

/**
 * Eagle Eye Overlay — Apr 20, 2026 (Phase 1)
 *
 * Dual-plane video intelligence layer. Two sources, two distinct glyphs:
 *
 *   PERMANENT cameras  (crep-eagle-cams-*)
 *     Pulled from /api/eagle/sources (MINDEX eagle.video_sources).
 *     Registered / fixed-location feeds: Shinobi, 511 traffic, Windy,
 *     EarthCam, Webcamtaxi, NPS, USGS. Glyph: cyan diamond with live-feed
 *     pulse ring. Distinct colors per provider so at a glance you can
 *     tell a 511 traffic cam from a Windy webcam.
 *
 *   EPHEMERAL events  (crep-eagle-events-*)
 *     Pulled from /api/eagle/events (MINDEX eagle.video_events) plus
 *     /api/oei/youtube-live (live broadcast search). Short-lived (24 h
 *     default TTL). Glyph: yellow pulse ring that blinks for 90 s on
 *     first appearance, fades to a static dot. Each event has
 *     inference_confidence so the UI can badge the location tier.
 *
 * Click → window.__crep_selectAsset with type="camera" for permanent or
 * type="video_event" for ephemeral. The VideoWallWidget (separate
 * component) subscribes and opens a panel with the stream URL or embed.
 *
 * Performance guardrails:
 *   - Permanent cams: poll every 5 min (they move rarely).
 *   - Ephemeral events: poll every 60 s within 6 h time window.
 *   - LOD: permanent visible at zoom ≥ 3; ephemeral at zoom ≥ 5.
 *   - Viewport-scoped fetch via bbox.
 */

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

export interface EagleEyeEnabled {
  /** Permanent camera registry (Shinobi / 511 / Windy / EarthCam / NPS / USGS). */
  eagleEyeCameras?: boolean
  /** Ephemeral social / live-stream events. */
  eagleEyeEvents?: boolean
  /** Additional sub-toggles for permanent providers (all default true when eagleEyeCameras on). */
  eagleEyeShinobi?: boolean
  eagleEye511Traffic?: boolean
  eagleEyeWeatherCams?: boolean
  eagleEyeWebcams?: boolean
  eagleEyeNpsUsgs?: boolean
  /** Additional sub-toggles for ephemeral providers. */
  eagleEyeYoutubeLive?: boolean
  eagleEyeBluesky?: boolean
  eagleEyeMastodon?: boolean
  eagleEyeTwitch?: boolean
}

interface Props {
  map: MapLibreMap | null
  enabled: EagleEyeEnabled
  bbox?: [number, number, number, number]
}

function mapReady(map: MapLibreMap): boolean {
  return !!(map && (map as any).style && typeof map.getSource === "function")
}

const PROVIDER_COLOR: Record<string, string> = {
  shinobi: "#22d3ee",     // cyan — first-party
  "511": "#fbbf24",       // amber — traffic
  "511ga": "#fbbf24",
  "511sf": "#fbbf24",
  windy: "#60a5fa",       // sky — weather
  earthcam: "#a855f7",    // violet — public webcams
  webcamtaxi: "#a855f7",
  nps: "#22c55e",         // green — parks
  usgs: "#22c55e",
  "unifi-protect": "#38bdf8",
}

export default function EagleEyeOverlay({ map, enabled, bbox }: Props) {
  const loadedRef = useRef<{ cams?: boolean; events?: boolean }>({})
  const camsTimerRef = useRef<any>(null)
  const eventsTimerRef = useRef<any>(null)

  // ─── Permanent camera plane ─────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const ids = ["crep-eagle-cams-halo", "crep-eagle-cams-core", "crep-eagle-cams-label"]
    if (!enabled.eagleEyeCameras) {
      try {
        for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none")
      } catch { /* ignore */ }
      if (camsTimerRef.current) { clearInterval(camsTimerRef.current); camsTimerRef.current = null }
      return
    }
    if (loadedRef.current.cams) {
      try {
        for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible")
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.cams = true

    // Apr 22, 2026 — Morgan: "cameras are PERMANENT assets ... the icon
    // of camera should be hard coded in map unless update shows its gone".
    // First mount: paint the baked registry geojson (instant — 10s of ms,
    // ~3 900 cameras with id + provider + lat/lng + stream_url snapshot).
    // Then API delta for stream_url changes + new cameras only.
    const paintFromSources = (sources: any[]) => {
      const providerFilter = (p: string): boolean => {
        if (p === "shinobi") return enabled.eagleEyeShinobi !== false
        if (p.startsWith("511")) return enabled.eagleEye511Traffic !== false
        if (p === "windy") return enabled.eagleEyeWeatherCams !== false
        if (p === "earthcam" || p === "webcamtaxi") return enabled.eagleEyeWebcams !== false
        if (p === "nps" || p === "usgs") return enabled.eagleEyeNpsUsgs !== false
        return true
      }
      const features = (sources || [])
        .filter((s: any) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && providerFilter(s.provider || ""))
        .map((s: any) => ({
          type: "Feature" as const,
          properties: {
            id: s.id,
            provider: s.provider,
            kind: s.kind,
            name: s.name,
            stream_url: s.stream_url,
            embed_url: s.embed_url,
            // Apr 22, 2026 — Morgan: "only some caltrans working". ~44 % of
            // Caltrans cams have stream_url:null but DO have media_url (the
            // auto-refreshing JPG snapshot). VideoWallWidget's thumbnail
            // path picks these up ONLY if media_url travels with the click.
            media_url: s.media_url,
            status: s.source_status ?? s.status,
            color: PROVIDER_COLOR[s.provider] || "#22d3ee",
          },
          geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
        }))
      return { type: "FeatureCollection" as const, features }
    }

    const paintBakedRegistry = async (): Promise<boolean> => {
      try {
        const r = await fetch("/data/crep/eagle-cameras-registry.geojson", { cache: "force-cache" })
        if (!r.ok) return false
        const gj = await r.json()
        // Reuse paintFromSources by projecting registry feature props
        // (id, provider, lat, lng, stream_url, ...) into the same shape.
        const srcLike = (gj.features || []).map((f: any) => ({
          id: f.properties?.id,
          provider: f.properties?.provider,
          kind: f.properties?.kind,
          stream_url: f.properties?.stream_url,
          embed_url: f.properties?.embed_url,
          source_status: f.properties?.status,
          lat: f.geometry?.coordinates?.[1],
          lng: f.geometry?.coordinates?.[0],
        }))
        const fc = paintFromSources(srcLike)
        if (fc.features.length === 0) return false
        if (!map.getSource("crep-eagle-cams")) {
          // Source + layers will be created by the main fetch block below;
          // push data into a pending slot that the creator picks up.
          ;(map as any).__crepEaglePendingFc = fc
        } else {
          ;(map.getSource("crep-eagle-cams") as any).setData(fc)
        }
        console.log(`[EagleEye] ${fc.features.length} cameras painted from baked registry (bake timestamp: ${gj.baked_at || "unknown"})`)
        return true
      } catch (e: any) {
        console.warn("[EagleEye] baked registry load failed:", e?.message)
        return false
      }
    }

    const fetchAndPaint = async () => {
      if (typeof document !== "undefined" && document.hidden) return
      try {
        // Apr 22, 2026 v2 — baked registry is the instant path. If it
        // paints, the API fetch becomes a DELTA call (pick up new cams,
        // stream_url changes, offline status). If registry is missing
        // (fresh clone without `npm run etl:bake-cameras`), fall back to
        // the prior fast-then-full API fan-out.
        const bakedPainted = !loadedRef.current.cams && await paintBakedRegistry()
        // After baked paint: use full mode so API deltas include Caltrans
        // + Shinobi. Without baked: use fast-then-full for first mount.
        const fastMode = !loadedRef.current.cams && !bakedPainted
        const bboxBase = bbox ? `bbox=${bbox.join(",")}&limit=10000` : "limit=10000"
        const bboxParam = `?${bboxBase}${fastMode ? "&fast=1" : ""}`
        if (fastMode) {
          setTimeout(() => {
            if (typeof document !== "undefined" && document.hidden) return
            fetchAndPaint().catch(() => { /* ignore */ })
          }, 4_000)
        }
        const res = await fetch(`/api/eagle/sources${bboxParam}`)
        if (!res.ok) return
        const j = await res.json()
        const providerFilter = (p: string): boolean => {
          if (p === "shinobi") return enabled.eagleEyeShinobi !== false
          if (p.startsWith("511")) return enabled.eagleEye511Traffic !== false
          if (p === "windy") return enabled.eagleEyeWeatherCams !== false
          if (p === "earthcam" || p === "webcamtaxi") return enabled.eagleEyeWebcams !== false
          if (p === "nps" || p === "usgs") return enabled.eagleEyeNpsUsgs !== false
          return true
        }
        const features = (j.sources || [])
          .filter((s: any) => Number.isFinite(s.lat) && Number.isFinite(s.lng) && providerFilter(s.provider || ""))
          .map((s: any) => ({
            type: "Feature" as const,
            properties: {
              id: s.id,
              provider: s.provider,
              kind: s.kind,
              stream_url: s.stream_url,
              embed_url: s.embed_url,
              status: s.source_status,
              color: PROVIDER_COLOR[s.provider] || "#22d3ee",
            },
            geometry: { type: "Point" as const, coordinates: [s.lng, s.lat] },
          }))
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-eagle-cams")) {
          map.addSource("crep-eagle-cams", { type: "geojson", data: fc, generateId: true })
          map.addLayer({
            id: "crep-eagle-cams-halo",
            type: "circle",
            source: "crep-eagle-cams",
            minzoom: 3,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 5, 8, 8, 13, 12],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.28,
              "circle-blur": 1.0,
            },
          })
          map.addLayer({
            id: "crep-eagle-cams-core",
            type: "circle",
            source: "crep-eagle-cams",
            minzoom: 3,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 2.2, 8, 3.8, 13, 6.5],
              "circle-color": ["get", "color"],
              "circle-opacity": 0.95,
              "circle-stroke-width": 1.2,
              "circle-stroke-color": "#0b1220",
              "circle-stroke-opacity": 0.9,
            },
          })
          map.addLayer({
            id: "crep-eagle-cams-label",
            type: "symbol",
            source: "crep-eagle-cams",
            minzoom: 10,
            layout: {
              "text-field": ["get", "provider"],
              "text-size": ["interpolate", ["linear"], ["zoom"], 10, 9, 15, 11],
              "text-offset": [0, 1.0],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-optional": true,
              "text-transform": "uppercase",
              "text-letter-spacing": 0.06,
            } as any,
            paint: {
              "text-color": "#ffffff",
              "text-halo-color": "rgba(0,0,0,0.8)",
              "text-halo-width": 1.3,
            },
          })
          map.on("click", "crep-eagle-cams-core", (e: any) => {
            const f = e.features?.[0]
            if (!f) return
            const p = f.properties || {}
            const c = e.lngLat
            try {
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") {
                hook({
                  type: "camera",
                  id: p.id,
                  name: `${p.provider} camera`,
                  lat: c?.lat ?? 0,
                  lng: c?.lng ?? 0,
                  properties: p,
                })
              }
            } catch { /* ignore */ }
            try {
              window.dispatchEvent(new CustomEvent("crep:eagle:camera-click", { detail: { ...p, lat: c?.lat, lng: c?.lng } }))
            } catch { /* ignore */ }
          })
          map.on("mouseenter", "crep-eagle-cams-core", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-eagle-cams-core", () => { map.getCanvas().style.cursor = "" })
          console.log(`[EagleEye] ${features.length} permanent cameras loaded (by provider: ${JSON.stringify(j.by_provider || {})})`)
        } else {
          (map.getSource("crep-eagle-cams") as any).setData(fc)
        }
        // Broadcast counts for Intel Feed panel subscribers.
        try {
          ;(window as any).__crep_eagle_camera_counts = j.by_provider || {}
          window.dispatchEvent(new CustomEvent("crep:eagle:camera-counts", {
            detail: { total: features.length, by_provider: j.by_provider || {} },
          }))
        } catch { /* ignore */ }
      } catch (e: any) { console.warn("[EagleEye/cams]", e?.message) }
    }

    fetchAndPaint()
    camsTimerRef.current = setInterval(fetchAndPaint, 300_000) // 5 min
    return () => {
      if (camsTimerRef.current) { clearInterval(camsTimerRef.current); camsTimerRef.current = null }
    }
  }, [
    map,
    enabled.eagleEyeCameras,
    enabled.eagleEyeShinobi,
    enabled.eagleEye511Traffic,
    enabled.eagleEyeWeatherCams,
    enabled.eagleEyeWebcams,
    enabled.eagleEyeNpsUsgs,
    bbox,
  ])

  // ─── Ephemeral event plane ──────────────────────────────────────────
  useEffect(() => {
    if (!map) return
    const ids = ["crep-eagle-events-pulse", "crep-eagle-events-core", "crep-eagle-events-label"]
    if (!enabled.eagleEyeEvents) {
      try {
        for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "none")
      } catch { /* ignore */ }
      if (eventsTimerRef.current) { clearInterval(eventsTimerRef.current); eventsTimerRef.current = null }
      return
    }
    if (loadedRef.current.events) {
      try {
        for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", "visible")
      } catch { /* ignore */ }
      return
    }
    loadedRef.current.events = true

    const fetchAndPaint = async () => {
      // Apr 20, 2026 perf: events tick every 60 s and fire 4 parallel
      // fetches (MINDEX + YouTube + Bluesky + Mastodon). Skip the whole
      // fan-out while the tab is backgrounded.
      if (typeof document !== "undefined" && document.hidden) return
      try {
        const bboxParam = bbox ? `&bbox=${bbox.join(",")}` : ""
        const bboxQ = bbox ? `?bbox=${bbox.join(",")}` : ""
        // Apr 20, 2026 (Phase 3a): union MINDEX ephemeral events +
        // YouTube Live + Bluesky + Mastodon video posts. Each connector
        // returns its own confidence tier; no rescaling here so the
        // overlay's color ramp (0.8+ native, 0.5-0.8 platform, <0.5
        // text/OCR/visual) renders correctly per tier.
        const hoursBack = (window as any).__crep_eagle_time_window?.hoursBack ?? 6
        const [mindexRes, ytRes, blueskyRes, mastodonRes] = await Promise.all([
          fetch(`/api/eagle/events?hoursBack=${hoursBack}&limit=5000${bboxParam}`).catch(() => null),
          enabled.eagleEyeYoutubeLive !== false && bbox
            ? fetch(`/api/oei/youtube-live?bbox=${bbox.join(",")}&maxResults=50`).catch(() => null)
            : Promise.resolve(null),
          enabled.eagleEyeBluesky !== false
            ? fetch(`/api/eagle/connectors/bluesky${bboxQ}`).catch(() => null)
            : Promise.resolve(null),
          enabled.eagleEyeMastodon !== false
            ? fetch(`/api/eagle/connectors/mastodon${bboxQ}`).catch(() => null)
            : Promise.resolve(null),
        ])
        const features: any[] = []
        // MINDEX ephemeral events
        if (mindexRes?.ok) {
          const j = await mindexRes.json()
          for (const e of j.events || []) {
            if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue
            features.push({
              type: "Feature",
              properties: {
                id: e.id,
                provider: e.provider || "mindex-ephemeral",
                observed_at: e.observed_at,
                confidence: e.inference_confidence ?? 0.5,
                thumbnail: e.thumbnail_url,
                title: e.text_context?.slice(0, 80),
              },
              geometry: { type: "Point", coordinates: [e.lng, e.lat] },
            })
          }
        }
        // YouTube Live
        if (ytRes?.ok) {
          const j = await ytRes.json()
          for (const v of j.live || []) {
            if (!Number.isFinite(v.lat) || !Number.isFinite(v.lng)) continue
            features.push({
              type: "Feature",
              properties: {
                id: v.id,
                provider: "youtube-live",
                observed_at: v.publishedAt,
                confidence: v.location_confidence ?? 0.45,
                thumbnail: v.thumbnailUrl,
                title: v.title?.slice(0, 80),
                embed_url: v.embedUrl,
              },
              geometry: { type: "Point", coordinates: [v.lng, v.lat] },
            })
          }
        }
        // Bluesky video posts with inferred locations
        if (blueskyRes?.ok) {
          const j = await blueskyRes.json()
          for (const e of j.events || []) {
            if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue
            features.push({
              type: "Feature",
              properties: {
                id: e.id,
                provider: "bluesky",
                observed_at: e.observed_at,
                confidence: e.inference_confidence ?? 0.3,
                thumbnail: e.thumbnail_url,
                title: e.text_context?.slice(0, 80),
                embed_url: e.embed_url,
              },
              geometry: { type: "Point", coordinates: [e.lng, e.lat] },
            })
          }
        }
        // Mastodon video posts
        if (mastodonRes?.ok) {
          const j = await mastodonRes.json()
          for (const e of j.events || []) {
            if (!Number.isFinite(e.lat) || !Number.isFinite(e.lng)) continue
            features.push({
              type: "Feature",
              properties: {
                id: e.id,
                provider: "mastodon",
                observed_at: e.observed_at,
                confidence: e.inference_confidence ?? 0.3,
                thumbnail: e.thumbnail_url,
                title: e.text_context?.slice(0, 80),
                embed_url: e.embed_url,
                video_url: e.video_url,
              },
              geometry: { type: "Point", coordinates: [e.lng, e.lat] },
            })
          }
        }
        const fc = { type: "FeatureCollection" as const, features }
        if (!map.getSource("crep-eagle-events")) {
          map.addSource("crep-eagle-events", { type: "geojson", data: fc, generateId: true })
          // Pulsing outer ring (yellow for fresh events)
          map.addLayer({
            id: "crep-eagle-events-pulse",
            type: "circle",
            source: "crep-eagle-events",
            minzoom: 5,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 6, 10, 10, 16, 18],
              "circle-color": "#fbbf24",
              "circle-opacity": 0.25,
              "circle-blur": 1.0,
            },
          })
          // Core dot — color ramp by location_confidence tier
          map.addLayer({
            id: "crep-eagle-events-core",
            type: "circle",
            source: "crep-eagle-events",
            minzoom: 5,
            paint: {
              "circle-radius": ["interpolate", ["linear"], ["zoom"], 5, 3, 10, 4.5, 16, 7],
              "circle-color": [
                "case",
                [">=", ["coalesce", ["get", "confidence"], 0], 0.8], "#facc15",  // native: bright yellow
                [">=", ["coalesce", ["get", "confidence"], 0], 0.5], "#f59e0b",  // platform place: amber
                "#fb923c",  // text/OCR/visual: orange (lower confidence)
              ],
              "circle-opacity": 0.95,
              "circle-stroke-width": 1.0,
              "circle-stroke-color": "#7c2d12",
            },
          })
          map.addLayer({
            id: "crep-eagle-events-label",
            type: "symbol",
            source: "crep-eagle-events",
            minzoom: 11,
            layout: {
              "text-field": ["get", "title"],
              "text-size": 10,
              "text-offset": [0, 1.0],
              "text-anchor": "top",
              "text-allow-overlap": false,
              "text-optional": true,
              "text-max-width": 10,
            } as any,
            paint: {
              "text-color": "#fde68a",
              "text-halo-color": "rgba(0,0,0,0.8)",
              "text-halo-width": 1.3,
            },
          })
          map.on("click", "crep-eagle-events-core", (e: any) => {
            const f = e.features?.[0]
            if (!f) return
            const p = f.properties || {}
            const c = e.lngLat
            try {
              const hook = (window as any).__crep_selectAsset
              if (typeof hook === "function") {
                hook({
                  type: "video_event",
                  id: p.id,
                  name: p.title || `${p.provider} clip`,
                  lat: c?.lat ?? 0,
                  lng: c?.lng ?? 0,
                  properties: p,
                })
              }
            } catch { /* ignore */ }
            try {
              window.dispatchEvent(new CustomEvent("crep:eagle:event-click", { detail: { ...p, lat: c?.lat, lng: c?.lng } }))
            } catch { /* ignore */ }
          })
          map.on("mouseenter", "crep-eagle-events-core", () => { map.getCanvas().style.cursor = "pointer" })
          map.on("mouseleave", "crep-eagle-events-core", () => { map.getCanvas().style.cursor = "" })
          console.log(`[EagleEye] ${features.length} ephemeral events loaded (MINDEX + YouTube + Bluesky + Mastodon)`)
        } else {
          (map.getSource("crep-eagle-events") as any).setData(fc)
        }
        // Broadcast counts for Intel Feed panel subscribers.
        try {
          const countByProvider: Record<string, number> = {}
          for (const f of features) {
            const p = (f as any).properties?.provider || "unknown"
            countByProvider[p] = (countByProvider[p] || 0) + 1
          }
          ;(window as any).__crep_eagle_event_counts = countByProvider
          window.dispatchEvent(new CustomEvent("crep:eagle:event-counts", {
            detail: { total: features.length, by_provider: countByProvider },
          }))
        } catch { /* ignore */ }
      } catch (e: any) { console.warn("[EagleEye/events]", e?.message) }
    }

    fetchAndPaint()
    eventsTimerRef.current = setInterval(fetchAndPaint, 60_000) // 60 s
    return () => {
      if (eventsTimerRef.current) { clearInterval(eventsTimerRef.current); eventsTimerRef.current = null }
    }
  }, [
    map,
    enabled.eagleEyeEvents,
    enabled.eagleEyeYoutubeLive,
    bbox,
  ])

  return null
}
