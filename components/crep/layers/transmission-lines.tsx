"use client"

/**
 * Transmission Line Layer — Voltage-class colored lines with inline labels
 *
 * Renders transmission lines on the CREP map using deck.gl PathLayer.
 * Lines are color-coded and thickness-scaled by voltage class, matching
 * OpenGridWorks' visual style exactly.
 *
 * Voltage classes:
 *   735kV+    → white, thick
 *   500-734kV → cyan, thick
 *   345-499kV → blue, medium
 *   230-344kV → purple, medium
 *   100-229kV → magenta, thin
 *   31-99kV   → pink, thin
 *   <31kV     → dim pink, very thin
 *
 * Features:
 * - Click-to-highlight entire circuit
 * - Inline voltage labels at zoom 7+
 * - Toggleable per-voltage-class visibility
 */

import { useEffect, useMemo, useRef } from "react"
import { MapboxOverlay } from "@deck.gl/mapbox"
import { PathLayer, TextLayer } from "@deck.gl/layers"
import type maplibregl from "maplibre-gl"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TransmissionLine {
  id: string
  name?: string
  voltage_kv: number
  path: [number, number][] // [[lng, lat], ...]
  operator?: string
  status?: string // "operating" | "planned" | "construction"
  source?: string
  circuit_id?: string
  length_km?: number
}

export interface TransmissionLineLayerProps {
  map: maplibregl.Map | null
  lines: TransmissionLine[]
  visible?: boolean
  zoom?: number
  /** Which voltage classes to show */
  enabledClasses?: Set<string>
  /** Currently highlighted circuit ID */
  highlightedCircuit?: string | null
  onLineClick?: (line: TransmissionLine) => void
}

// ─── Voltage Class Definitions ────────────────────────────────────────────────

export interface VoltageClass {
  id: string
  label: string
  minKV: number
  maxKV: number
  color: [number, number, number, number]
  cssColor: string
  width: number // base width in pixels
}

export const VOLTAGE_CLASSES: VoltageClass[] = [
  { id: "735+",    label: "735kV+",    minKV: 735, maxKV: Infinity, color: [255, 255, 255, 220], cssColor: "#ffffff", width: 4 },
  { id: "500-734", label: "500-734kV", minKV: 500, maxKV: 734,     color: [34, 211, 238, 200],  cssColor: "#22d3ee", width: 3.5 },
  { id: "345-499", label: "345-499kV", minKV: 345, maxKV: 499,     color: [96, 165, 250, 200],  cssColor: "#60a5fa", width: 3 },
  { id: "230-344", label: "230-344kV", minKV: 230, maxKV: 344,     color: [168, 85, 247, 200],  cssColor: "#a855f7", width: 2.5 },
  { id: "100-229", label: "100-229kV", minKV: 100, maxKV: 229,     color: [236, 72, 153, 200],  cssColor: "#ec4899", width: 2 },
  { id: "31-99",   label: "31-99kV",   minKV: 31,  maxKV: 99,      color: [251, 146, 60, 180],  cssColor: "#fb923c", width: 1.5 },
  { id: "<31",     label: "<31kV",     minKV: 0,   maxKV: 30,      color: [251, 146, 60, 100],  cssColor: "#fb923c80", width: 1 },
]

export function getVoltageClass(kv: number): VoltageClass {
  for (const vc of VOLTAGE_CLASSES) {
    if (kv >= vc.minKV && kv <= vc.maxKV) return vc
  }
  return VOLTAGE_CLASSES[VOLTAGE_CLASSES.length - 1]
}

export const ALL_VOLTAGE_CLASS_IDS = new Set(VOLTAGE_CLASSES.map((vc) => vc.id))

// ─── Component ────────────────────────────────────────────────────────────────

export function TransmissionLineLayer({
  map,
  lines,
  visible = true,
  zoom = 2,
  enabledClasses = ALL_VOLTAGE_CLASS_IDS,
  highlightedCircuit,
  onLineClick,
}: TransmissionLineLayerProps) {
  const overlayRef = useRef<MapboxOverlay | null>(null)

  // Filter lines by enabled voltage classes
  const filteredLines = useMemo(() => {
    if (!visible) return []
    return lines.filter((line) => {
      const vc = getVoltageClass(line.voltage_kv)
      return enabledClasses.has(vc.id)
    })
  }, [lines, visible, enabledClasses])

  const layers = useMemo(() => {
    if (filteredLines.length === 0) return []

    const result: any[] = []

    // ── Line paths ────────────────────────────────────────────────────────
    result.push(
      new PathLayer({
        id: "transmission-lines",
        data: filteredLines,
        getPath: (d: TransmissionLine) => d.path,
        getColor: (d: TransmissionLine) => {
          if (highlightedCircuit && d.circuit_id === highlightedCircuit) {
            return [255, 255, 0, 255] // Yellow highlight
          }
          return getVoltageClass(d.voltage_kv).color
        },
        getWidth: (d: TransmissionLine) => {
          if (highlightedCircuit && d.circuit_id === highlightedCircuit) {
            return getVoltageClass(d.voltage_kv).width * 2.5
          }
          return getVoltageClass(d.voltage_kv).width
        },
        widthUnits: "pixels",
        widthMinPixels: 1,
        widthMaxPixels: 12,
        pickable: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 60],
        jointRounded: true,
        capRounded: true,
        onClick: (info: any) => {
          if (info.object && onLineClick) {
            onLineClick(info.object)
          }
        },
        updateTriggers: {
          getColor: [highlightedCircuit],
          getWidth: [highlightedCircuit],
        },
      })
    )

    // ── Voltage labels at zoom 7+ ─────────────────────────────────────────
    if (zoom >= 7) {
      // Place labels at midpoint of each line
      const labelData = filteredLines
        .filter((line) => line.path.length >= 2 && line.voltage_kv >= 100)
        .map((line) => {
          const midIdx = Math.floor(line.path.length / 2)
          const midpoint = line.path[midIdx]
          return {
            ...line,
            labelPosition: midpoint,
          }
        })

      result.push(
        new TextLayer({
          id: "transmission-labels",
          data: labelData,
          getPosition: (d: any) => d.labelPosition,
          getText: (d: any) => {
            const kv = d.voltage_kv
            if (d.name) return `${d.name} · ${kv} kV`
            return `${kv} kV`
          },
          getSize: 10,
          getColor: (d: any) => {
            const vc = getVoltageClass(d.voltage_kv)
            return [...vc.color.slice(0, 3), 220] as [number, number, number, number]
          },
          getAngle: 0,
          getTextAnchor: "middle",
          getAlignmentBaseline: "center",
          fontFamily: "Inter, system-ui, sans-serif",
          fontWeight: 600,
          outlineWidth: 3,
          outlineColor: [0, 0, 0, 220],
          billboard: false,
          sizeUnits: "pixels",
          pickable: false,
        })
      )
    }

    return result
  }, [filteredLines, zoom, highlightedCircuit, onLineClick])

  // ── Overlay lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return

    if (!overlayRef.current) {
      overlayRef.current = new MapboxOverlay({
        interleaved: false,
        layers,
      })
      map.addControl(overlayRef.current as any)
    } else {
      overlayRef.current.setProps({ layers })
    }

    return () => {
      if (overlayRef.current && map) {
        try {
          map.removeControl(overlayRef.current as any)
        } catch {}
        overlayRef.current = null
      }
    }
  }, [map])

  useEffect(() => {
    if (overlayRef.current) {
      overlayRef.current.setProps({ layers })
    }
  }, [layers])

  return null
}
