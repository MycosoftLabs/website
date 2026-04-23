"use client"

/**
 * MycaVerifiedEntityFeed — live marker renderer — Apr 22, 2026
 *
 * Morgan: "a new navy base marker and perimeter should be added to it
 * live almost instantly after confirmed automatically that is a
 * backend agent automation etl system needed to be functional
 * globally".
 *
 * Subscribes to the SSE stream at /api/myca/entity-feed. When the
 * server publishes a newly-verified entity (from
 * /api/myca/waypoint-verify), this component adds it to a dedicated
 * MapLibre source + layer so the marker (and perimeter polygon, when
 * present) appears on the map within ~100ms of the confirmation.
 *
 * Entities persist for the session. A page reload fetches them again
 * from MINDEX via normal CREP layers (the SSE feed is a live overlay,
 * not the authoritative store).
 */

import { useEffect, useRef, useState } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"
import { ShieldCheck } from "lucide-react"

interface VerifiedEntity {
  source: string
  entity_type: string
  entity_subtype?: string | null
  name: string | null
  lat: number
  lng: number
  perimeter?: {
    type: "Polygon"
    coordinates: number[][][]
  } | null
  confidence: number
  verified_from?: Record<string, any>
  citations?: any[]
  collected_at: string
}

interface MycaVerifiedEntityFeedProps {
  map: React.RefObject<MapLibreMap | null>
}

const POINT_SOURCE = "crep-myca-verified-points"
const POLY_SOURCE = "crep-myca-verified-polygons"

export default function MycaVerifiedEntityFeed({ map }: MycaVerifiedEntityFeedProps) {
  const [entities, setEntities] = useState<VerifiedEntity[]>([])
  const esRef = useRef<EventSource | null>(null)
  const [toast, setToast] = useState<{ name: string; type: string; at: number } | null>(null)

  // Open SSE connection
  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") return
    const es = new EventSource("/api/myca/entity-feed")
    esRef.current = es

    es.addEventListener("entity", (ev: MessageEvent) => {
      try {
        const data = JSON.parse(ev.data) as VerifiedEntity
        setEntities((prev) => {
          // Dedup by name+coords (server may replay on reconnect)
          const key = `${data.name}|${data.lat.toFixed(4)},${data.lng.toFixed(4)}`
          if (prev.some((e) => `${e.name}|${e.lat.toFixed(4)},${e.lng.toFixed(4)}` === key)) return prev
          return [...prev, data]
        })
        setToast({ name: data.name || "New entity", type: data.entity_type, at: Date.now() })
      } catch { /* ignore malformed */ }
    })

    es.addEventListener("hello", (ev: MessageEvent) => {
      try {
        const d = JSON.parse(ev.data)
        console.log(`[CREP/MYCA] entity-feed connected (subscriber_count=${d.subscriber_count})`)
      } catch { /* ignore */ }
    })

    es.onerror = () => {
      // Browser will auto-retry with exponential backoff; we just log.
      console.warn("[CREP/MYCA] entity-feed dropped — retrying")
    }

    return () => {
      try { es.close() } catch { /* ignore */ }
      esRef.current = null
    }
  }, [])

  // Auto-dismiss toast after 5 s
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 5_000)
    return () => clearTimeout(id)
  }, [toast])

  // Push verified entities onto the map
  useEffect(() => {
    const m = map?.current
    if (!m || typeof m.getSource !== "function") return

    const pointFC = {
      type: "FeatureCollection" as const,
      features: entities.map((e) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [e.lng, e.lat] },
        properties: {
          name: e.name,
          entity_type: e.entity_type,
          entity_subtype: e.entity_subtype,
          confidence: e.confidence,
          verified_from_waypoint: e.verified_from?.waypoint_id,
        },
      })),
    }
    const polyFC = {
      type: "FeatureCollection" as const,
      features: entities
        .filter((e) => e.perimeter?.coordinates?.length)
        .map((e) => ({
          type: "Feature" as const,
          geometry: e.perimeter!,
          properties: {
            name: e.name,
            entity_type: e.entity_type,
            confidence: e.confidence,
          },
        })),
    }

    const ensureSrc = (id: string, data: any) => {
      try {
        const existing = m.getSource(id)
        if (existing) (existing as any).setData(data)
        else m.addSource(id, { type: "geojson", data })
      } catch { /* HMR */ }
    }
    const ensureLayer = (spec: any) => {
      try { if (!m.getLayer(spec.id)) m.addLayer(spec) } catch { /* HMR */ }
    }

    ensureSrc(POINT_SOURCE, pointFC)
    ensureSrc(POLY_SOURCE, polyFC)
    ensureLayer({
      id: "crep-myca-verified-perimeter-fill",
      type: "fill",
      source: POLY_SOURCE,
      paint: {
        "fill-color": "#10b981",
        "fill-opacity": 0.15,
      },
    })
    ensureLayer({
      id: "crep-myca-verified-perimeter-outline",
      type: "line",
      source: POLY_SOURCE,
      paint: {
        "line-color": "#10b981",
        "line-width": 2,
        "line-opacity": 0.9,
        "line-dasharray": [2, 1],
      },
    })
    ensureLayer({
      id: "crep-myca-verified-pulse",
      type: "circle",
      source: POINT_SOURCE,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 10, 12, 22],
        "circle-color": "#10b981",
        "circle-opacity": 0.2,
        "circle-blur": 0.8,
      },
    })
    ensureLayer({
      id: "crep-myca-verified-dot",
      type: "circle",
      source: POINT_SOURCE,
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 4, 4, 12, 8],
        "circle-color": "#10b981",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#064e3b",
      },
    })
    ensureLayer({
      id: "crep-myca-verified-label",
      type: "symbol",
      source: POINT_SOURCE,
      minzoom: 7,
      layout: {
        "text-field": ["get", "name"],
        "text-size": 10,
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
      },
      paint: {
        "text-color": "#10b981",
        "text-halo-color": "#0b1220",
        "text-halo-width": 1.5,
      },
    })

    // Click → open InfraAsset panel via __crep_selectAsset
    const onClick = (e: any) => {
      const f = e.features?.[0]
      if (!f) return
      const p = f.properties || {}
      const hook = (window as any).__crep_selectAsset
      if (typeof hook !== "function") return
      hook({
        type: p.entity_type,
        id: `myca-${p.entity_type}-${e.lngLat.lat.toFixed(5)}-${e.lngLat.lng.toFixed(5)}`,
        name: p.name,
        lat: e.lngLat.lat,
        lng: e.lngLat.lng,
        properties: {
          verified_by: "MYCA waypoint-verify",
          confidence: p.confidence,
          entity_subtype: p.entity_subtype,
          verified_from_waypoint: p.verified_from_waypoint,
        },
      })
    }
    m.on("click", "crep-myca-verified-dot", onClick)

    return () => {
      try { m.off("click", "crep-myca-verified-dot", onClick) } catch { /* ignore */ }
    }
  }, [map, entities])

  // Render a small notification when a new entity is verified.
  if (!toast) return null
  return (
    <div className="fixed top-4 right-4 z-[10001] pointer-events-none">
      <div className="bg-emerald-900/80 border border-emerald-400/50 rounded-lg px-3 py-2 shadow-2xl backdrop-blur flex items-start gap-2 max-w-xs pointer-events-auto">
        <ShieldCheck className="w-4 h-4 text-emerald-200 mt-0.5 shrink-0" />
        <div className="min-w-0">
          <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-emerald-200">MYCA verified</div>
          <div className="text-xs text-white font-semibold truncate">{toast.name}</div>
          <div className="text-[10px] text-emerald-300 font-mono">{toast.type} — added live</div>
        </div>
      </div>
    </div>
  )
}
