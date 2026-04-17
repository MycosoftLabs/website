"use client"

/**
 * Sun ↔ Earth Impact Layer
 *
 * Renders live solar-event earthspots on the globe:
 *   • Subsolar point (yellow dot + dayside hemisphere polygon)
 *   • Active flares (red glowing polygon on dayside, sized by class)
 *   • CME arrival footprints (magenta ring on impact hemisphere)
 *   • Auroral ovals (green rings at north + south poles, radius by power)
 *   • Correlation lines (dashed) from complex active regions to each
 *     active tropical cyclone — hypothesis overlay
 *
 * Polls /api/oei/sun-earth-correlation every 60 s.
 */

import { useEffect, useRef, useState } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

interface Props {
  map: MapLibreMap | null
  enabled: boolean
  showCorrelationLines?: boolean
}

const SRC_EARTHSPOT = "crep-sun-earthspots"
const SRC_FOOTPRINT = "crep-sun-footprints"
const SRC_CORRELATION = "crep-sun-correlation-lines"

export default function SunEarthImpactLayer({ map, enabled, showCorrelationLines = true }: Props) {
  const addedRef = useRef(false)
  const intervalRef = useRef<any>(null)
  const [, setTick] = useState(0)

  useEffect(() => {
    if (!map) return
    const mapReady = () => !!(map && (map as any).style && typeof map.getSource === "function")

    const pull = async () => {
      if (!mapReady()) return
      try {
        const res = await fetch("/api/oei/sun-earth-correlation", { cache: "no-store" })
        if (!res.ok) return
        const d = await res.json()

        const pointFeats: any[] = (d.earthspots || []).map((e: any) => ({
          type: "Feature",
          properties: {
            id: e.id, kind: e.kind, label: e.label, intensity: e.intensity,
            region: e.sourceRegion, timestamp: e.timestamp,
          },
          geometry: { type: "Point", coordinates: [e.lng, e.lat] },
        }))
        const polyFeats: any[] = (d.earthspots || [])
          .filter((e: any) => e.footprint && e.footprint.length >= 3)
          .map((e: any) => ({
            type: "Feature",
            properties: { id: e.id, kind: e.kind, intensity: e.intensity, label: e.label },
            geometry: { type: "Polygon", coordinates: [e.footprint] },
          }))

        const corrFeats: any[] = (d.correlationLines || []).map((l: any) => ({
          type: "Feature",
          properties: {
            id: l.id, solarRegion: l.solarRegion, cycloneId: l.cycloneId,
            disclaimer: "hypothesis overlay",
          },
          geometry: {
            type: "LineString",
            coordinates: [
              [l.sunspotProjection.lng, l.sunspotProjection.lat],
              [l.cycloneLocation.lng, l.cycloneLocation.lat],
            ],
          },
        }))

        const setOrAdd = (id: string, data: any) => {
          const src = map.getSource(id) as any
          if (src?.setData) src.setData(data)
          else map.addSource(id, { type: "geojson", data })
        }

        if (enabled) {
          setOrAdd(SRC_FOOTPRINT, { type: "FeatureCollection", features: polyFeats })
          setOrAdd(SRC_EARTHSPOT, { type: "FeatureCollection", features: pointFeats })
          setOrAdd(SRC_CORRELATION, { type: "FeatureCollection", features: showCorrelationLines ? corrFeats : [] })

          // Footprint fills — flare on lit hemisphere + aurora ovals at poles
          if (!map.getLayer("crep-sun-footprint-fill")) {
            map.addLayer({
              id: "crep-sun-footprint-fill", type: "fill", source: SRC_FOOTPRINT,
              paint: {
                "fill-color": [
                  "match", ["get", "kind"],
                  "sub-solar", "#fde68a",
                  "flare-dayside", "#ef4444",
                  "cme-arrival", "#d946ef",
                  "aurora-oval-north", "#4ade80",
                  "aurora-oval-south", "#4ade80",
                  "#fbbf24",
                ],
                "fill-opacity": ["interpolate", ["linear"], ["get", "intensity"], 0, 0.05, 1, 0.35],
              },
            })
            map.addLayer({
              id: "crep-sun-footprint-line", type: "line", source: SRC_FOOTPRINT,
              paint: {
                "line-color": [
                  "match", ["get", "kind"],
                  "sub-solar", "#fbbf24",
                  "flare-dayside", "#dc2626",
                  "cme-arrival", "#c026d3",
                  "aurora-oval-north", "#22c55e",
                  "aurora-oval-south", "#22c55e",
                  "#fbbf24",
                ],
                "line-width": 1.5, "line-opacity": 0.7, "line-dasharray": [2, 2],
              },
            })
          }

          // Earthspot bullseye (points)
          if (!map.getLayer("crep-sun-earthspot-dot")) {
            map.addLayer({
              id: "crep-sun-earthspot-glow", type: "circle", source: SRC_EARTHSPOT,
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["get", "intensity"], 0, 8, 1, 30],
                "circle-color": [
                  "match", ["get", "kind"],
                  "sub-solar", "#fde68a",
                  "flare-dayside", "#ef4444",
                  "cme-arrival", "#d946ef",
                  "aurora-oval-north", "#4ade80",
                  "aurora-oval-south", "#4ade80",
                  "#fbbf24",
                ],
                "circle-opacity": 0.35, "circle-blur": 1.1,
              },
            })
            map.addLayer({
              id: "crep-sun-earthspot-dot", type: "circle", source: SRC_EARTHSPOT,
              paint: {
                "circle-radius": ["interpolate", ["linear"], ["get", "intensity"], 0, 3, 1, 8],
                "circle-color": [
                  "match", ["get", "kind"],
                  "sub-solar", "#fbbf24",
                  "flare-dayside", "#dc2626",
                  "cme-arrival", "#c026d3",
                  "aurora-oval-north", "#16a34a",
                  "aurora-oval-south", "#16a34a",
                  "#fde68a",
                ],
                "circle-opacity": 1, "circle-stroke-width": 1, "circle-stroke-color": "#ffffff",
              },
            })
            // Click → show popup from data attributes
            map.on("click", "crep-sun-earthspot-dot", (e: any) => {
              const p = e.features?.[0]?.properties
              if (!p) return
              import("maplibre-gl").then((ml) => {
                new ml.default.Popup({ offset: 12 })
                  .setLngLat(e.lngLat)
                  .setHTML(`<div style="font-family:system-ui;font-size:12px;max-width:240px">
                    <strong style="color:#fbbf24">${p.label}</strong><br/>
                    <span style="color:#9ca3af">kind: ${p.kind}</span><br/>
                    ${p.region ? `<span style="color:#9ca3af">AR: ${p.region}</span><br/>` : ""}
                    <span style="color:#9ca3af">${new Date(p.timestamp).toLocaleString()}</span>
                  </div>`).addTo(map)
              })
            })
          }

          // Correlation lines
          if (!map.getLayer("crep-sun-correlation-line")) {
            map.addLayer({
              id: "crep-sun-correlation-line", type: "line", source: SRC_CORRELATION,
              paint: {
                "line-color": "#a855f7",
                "line-width": 1.2, "line-opacity": 0.5, "line-dasharray": [4, 4],
              },
            })
          }

          addedRef.current = true
        } else if (!enabled && addedRef.current) {
          for (const id of [
            "crep-sun-correlation-line",
            "crep-sun-earthspot-dot", "crep-sun-earthspot-glow",
            "crep-sun-footprint-line", "crep-sun-footprint-fill",
          ]) try { if (map.getLayer(id)) map.removeLayer(id) } catch {}
          for (const id of [SRC_CORRELATION, SRC_EARTHSPOT, SRC_FOOTPRINT])
            try { if (map.getSource(id)) map.removeSource(id) } catch {}
          addedRef.current = false
        }
      } catch (e: any) {
        console.warn("[SunEarthImpactLayer]", e.message)
      }
    }

    pull()
    intervalRef.current = setInterval(pull, 60_000)
    const tickHandle = setInterval(() => setTick((t) => t + 1), 30_000) // re-render subsolar marker every 30s
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      clearInterval(tickHandle)
      if (!(map as any)?.style) return
      for (const id of [
        "crep-sun-correlation-line",
        "crep-sun-earthspot-dot", "crep-sun-earthspot-glow",
        "crep-sun-footprint-line", "crep-sun-footprint-fill",
      ]) try { if (map.getLayer(id)) map.removeLayer(id) } catch {}
      for (const id of [SRC_CORRELATION, SRC_EARTHSPOT, SRC_FOOTPRINT])
        try { if (map.getSource(id)) map.removeSource(id) } catch {}
      addedRef.current = false
    }
  }, [map, enabled, showCorrelationLines])

  return null
}
