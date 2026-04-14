"use client"

/**
 * Substation Marker Layer — Voltage-tier circle markers with labels
 *
 * Renders substations as circles on the CREP map, sized and colored
 * by voltage tier. Labels appear at zoom 9+.
 */

import { useEffect, useMemo, useRef } from "react"
import { MapboxOverlay } from "@deck.gl/mapbox"
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers"
import type maplibregl from "maplibre-gl"

export interface Substation {
  id: string
  name: string
  lat: number
  lng: number
  voltage_kv: number
  status?: string
  operator?: string
  source?: string // HIFLD, OSM
}

export interface SubstationLayerProps {
  map: maplibregl.Map | null
  substations: Substation[]
  visible?: boolean
  zoom?: number
  enabledTiers?: Set<string>
  onSubstationClick?: (sub: Substation) => void
  selectedSubId?: string | null
}

export interface VoltageTier {
  id: string
  label: string
  minKV: number
  maxKV: number
  color: [number, number, number, number]
  cssColor: string
  radius: number
}

export const SUBSTATION_TIERS: VoltageTier[] = [
  { id: "500+",    label: "500+ kV",    minKV: 500, maxKV: Infinity, color: [255, 255, 255, 200], cssColor: "#ffffff", radius: 8 },
  { id: "345-499", label: "345-499 kV", minKV: 345, maxKV: 499,     color: [34, 211, 238, 180],  cssColor: "#22d3ee", radius: 7 },
  { id: "230-344", label: "230-344 kV", minKV: 230, maxKV: 344,     color: [96, 165, 250, 180],  cssColor: "#60a5fa", radius: 6 },
  { id: "100-229", label: "100-229 kV", minKV: 100, maxKV: 229,     color: [168, 85, 247, 160],  cssColor: "#a855f7", radius: 5 },
  { id: "31-99",   label: "31-99 kV",   minKV: 31,  maxKV: 99,      color: [156, 163, 175, 140], cssColor: "#9ca3af", radius: 4 },
  { id: "<31",     label: "<31 kV",     minKV: 0,   maxKV: 30,      color: [107, 114, 128, 120], cssColor: "#6b7280", radius: 3 },
]

function getSubTier(kv: number): VoltageTier {
  for (const t of SUBSTATION_TIERS) {
    if (kv >= t.minKV && kv <= t.maxKV) return t
  }
  return SUBSTATION_TIERS[SUBSTATION_TIERS.length - 1]
}

export const ALL_SUB_TIER_IDS = new Set(SUBSTATION_TIERS.map((t) => t.id))

export function SubstationMarkerLayer({
  map,
  substations,
  visible = true,
  zoom = 2,
  enabledTiers = ALL_SUB_TIER_IDS,
  onSubstationClick,
  selectedSubId,
}: SubstationLayerProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null)

  const filtered = useMemo(() => {
    if (!visible) return []
    return substations.filter((s) => enabledTiers.has(getSubTier(s.voltage_kv).id))
  }, [substations, visible, enabledTiers])

  const layers = useMemo(() => {
    if (filtered.length === 0) return []
    const result: any[] = []

    result.push(
      new ScatterplotLayer({
        id: "substation-markers",
        data: filtered,
        pickable: true,
        filled: true,
        stroked: true,
        getPosition: (d: Substation) => [d.lng, d.lat],
        getRadius: (d: Substation) => getSubTier(d.voltage_kv).radius,
        getFillColor: (d: Substation) =>
          d.id === selectedSubId
            ? [255, 255, 255, 240]
            : getSubTier(d.voltage_kv).color,
        getLineColor: [0, 0, 0, 120],
        lineWidthMinPixels: 1,
        radiusMinPixels: 2,
        radiusMaxPixels: 12,
        radiusUnits: "pixels",
        autoHighlight: true,
        highlightColor: [255, 255, 255, 80],
        onClick: (info: any) => {
          if (info.object && onSubstationClick) onSubstationClick(info.object)
        },
        updateTriggers: { getFillColor: [selectedSubId] },
      })
    )

    if (zoom >= 9) {
      const labeled = filtered.filter((s) => s.voltage_kv >= (zoom >= 11 ? 0 : 100))
      result.push(
        new TextLayer({
          id: "substation-labels",
          data: labeled,
          getPosition: (d: Substation) => [d.lng, d.lat],
          getText: (d: Substation) => `${d.name} · ${d.voltage_kv} kV`,
          getSize: 9,
          getColor: [200, 200, 200, 180],
          getPixelOffset: [0, -14],
          getTextAnchor: "middle",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 500,
          outlineWidth: 2,
          outlineColor: [0, 0, 0, 200],
          billboard: false,
          sizeUnits: "pixels",
          pickable: false,
        })
      )
    }

    return result
  }, [filtered, zoom, selectedSubId, onSubstationClick])

  useEffect(() => {
    if (!map) return
    if (!overlayRef.current) {
      overlayRef.current = new MapboxOverlay({ interleaved: false, layers })
      map.addControl(overlayRef.current as any)
    } else {
      overlayRef.current.setProps({ layers })
    }
    return () => {
      if (overlayRef.current && map) {
        try { map.removeControl(overlayRef.current as any) } catch {}
        overlayRef.current = null
      }
    }
  }, [map])

  useEffect(() => {
    if (overlayRef.current) overlayRef.current.setProps({ layers })
  }, [layers])

  return null
}
