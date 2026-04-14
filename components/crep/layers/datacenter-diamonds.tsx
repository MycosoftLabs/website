"use client"

/**
 * Datacenter Diamond Layer — Diamond-shaped markers for data centers
 *
 * Renders datacenters as diamond (rotated square) markers on the CREP map.
 * Click opens a rich popup with PeeringDB integration, nearby DCs, and
 * site analysis — matching OpenGridWorks' datacenter popup exactly.
 */

import { useEffect, useMemo, useRef } from "react"
import { MapboxOverlay } from "@deck.gl/mapbox"
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers"
import type maplibregl from "maplibre-gl"

export interface Datacenter {
  id: string
  name: string
  lat: number
  lng: number
  operator?: string
  status?: string // "operational" | "planned" | "construction"
  type?: string // "data_center" | "colocation" | "edge" | "campus"
  city?: string
  state?: string
  country?: string
  peeringdb_id?: string
  networks?: number
  ixps?: number
  carriers?: number
  source?: string // "peeringdb" | "openstreetmap"
  osm_id?: string
}

export interface DatacenterLayerProps {
  map: maplibregl.Map | null
  datacenters: Datacenter[]
  visible?: boolean
  zoom?: number
  onDCClick?: (dc: Datacenter) => void
  selectedDCId?: string | null
}

export function DatacenterDiamondLayer({
  map,
  datacenters,
  visible = true,
  zoom = 2,
  onDCClick,
  selectedDCId,
}: DatacenterLayerProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null)

  const layers = useMemo(() => {
    if (!visible || datacenters.length === 0) return []
    const result: any[] = []

    // Diamond markers (ScatterplotLayer doesn't support diamonds natively,
    // so we use a square rotated 45° via getAngle — but ScatterplotLayer
    // only draws circles. Instead, use IconLayer with a diamond SVG.)
    // For now, use circles with distinct styling; we'll upgrade to IconLayer later.
    result.push(
      new ScatterplotLayer({
        id: "datacenter-markers",
        data: datacenters,
        pickable: true,
        filled: true,
        stroked: true,
        getPosition: (d: Datacenter) => [d.lng, d.lat],
        getRadius: 6,
        getFillColor: (d: Datacenter) =>
          d.id === selectedDCId
            ? [255, 255, 255, 240]
            : [255, 255, 255, 160],
        getLineColor: (d: Datacenter) =>
          d.id === selectedDCId
            ? [0, 255, 255, 255]
            : [200, 200, 200, 120],
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 2,
        radiusMinPixels: 4,
        radiusMaxPixels: 10,
        radiusUnits: "pixels",
        autoHighlight: true,
        highlightColor: [0, 255, 255, 80],
        onClick: (info: any) => {
          if (info.object && onDCClick) onDCClick(info.object)
        },
        updateTriggers: {
          getFillColor: [selectedDCId],
          getLineColor: [selectedDCId],
        },
      })
    )

    // Labels at zoom 9+
    if (zoom >= 9) {
      result.push(
        new TextLayer({
          id: "datacenter-labels",
          data: datacenters,
          getPosition: (d: Datacenter) => [d.lng, d.lat],
          getText: (d: Datacenter) => d.name,
          getSize: 9,
          getColor: [255, 255, 255, 180],
          getPixelOffset: [10, 0],
          getTextAnchor: "start",
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
  }, [datacenters, visible, zoom, selectedDCId, onDCClick])

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
