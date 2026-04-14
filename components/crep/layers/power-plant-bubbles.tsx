"use client"

/**
 * Power Plant Bubble Layer — OpenGridWorks-style colored bubbles sized by MW
 *
 * Renders power plants as colored circles on the CREP map using deck.gl
 * ScatterplotLayer. Each plant is color-coded by fuel/technology type
 * and sized proportionally to its installed capacity (MW).
 *
 * Data flows through MINDEX for persistent caching:
 *   MINDEX PostGIS (infra.facilities / infra.power_grid) → /api/mindex/proxy/facilities → this layer
 *
 * Features:
 * - Technology color coding (Solar=amber, Nuclear=green, Gas=purple, etc.)
 * - Bubble radius = sqrt(capacity_mw) * scale factor
 * - Adjustable bubble size multiplier
 * - Click to select and show plant detail popup
 * - Zoom labels at zoom 7+ showing "Plant Name · MW"
 * - Integrates with existing deck.gl MapboxOverlay pattern
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { ScatterplotLayer, TextLayer } from "@deck.gl/layers"
import type maplibregl from "maplibre-gl"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PowerPlant {
  id: string
  name: string
  lat: number
  lng: number
  capacity_mw: number
  fuel_type: string
  status: string
  owner?: string
  entity?: string
  ba?: string
  sector?: string
  online_year?: number
  retirement_year?: number
  plant_id?: string
  source?: string // EIA, GEM, OSM
  country?: string
  state?: string
}

export interface PowerPlantLayerProps {
  map: maplibregl.Map | null
  plants: PowerPlant[]
  visible?: boolean
  bubbleScale?: number
  zoom?: number
  onPlantClick?: (plant: PowerPlant) => void
  selectedPlantId?: string | null
}

// ─── Technology Color Mapping (matches OpenGridWorks exactly) ─────────────────

/** RGB color arrays for deck.gl — [R, G, B, A] */
export const FUEL_TYPE_COLORS: Record<string, [number, number, number, number]> = {
  // Renewable
  solar:           [245, 158, 11, 200],  // amber-500
  wind:            [20, 184, 166, 200],   // teal-500
  "offshore wind": [59, 130, 246, 200],   // blue-500
  hydro:           [56, 189, 248, 200],   // sky-400
  geothermal:      [34, 197, 94, 200],    // green-500
  biomass:         [234, 179, 8, 200],    // yellow-500

  // Storage
  storage:         [244, 63, 94, 200],    // rose-500
  "pumped storage": [168, 85, 247, 200],  // purple-500
  battery:         [244, 63, 94, 200],    // rose-500

  // Thermal
  nuclear:         [74, 222, 128, 200],   // green-400
  gas:             [168, 85, 247, 200],   // purple-500
  "natural gas":   [168, 85, 247, 200],   // purple-500
  coal:            [156, 163, 175, 200],  // gray-400
  oil:             [239, 68, 68, 200],    // red-500
  petroleum:       [239, 68, 68, 200],    // red-500

  // Other
  other:           [107, 114, 128, 200],  // gray-500
  waste:           [107, 114, 128, 200],  // gray-500
  unknown:         [107, 114, 128, 200],  // gray-500
}

/** CSS color strings for UI legends */
export const FUEL_TYPE_CSS_COLORS: Record<string, string> = {
  solar: "#f59e0b",
  wind: "#14b8a6",
  "offshore wind": "#3b82f6",
  hydro: "#38bdf8",
  geothermal: "#22c55e",
  biomass: "#eab308",
  storage: "#f43f5e",
  "pumped storage": "#a855f7",
  nuclear: "#4ade80",
  gas: "#a855f7",
  "natural gas": "#a855f7",
  coal: "#9ca3af",
  oil: "#ef4444",
  other: "#6b7280",
}

function getFuelColor(fuelType: string): [number, number, number, number] {
  const key = fuelType.toLowerCase().trim()
  return FUEL_TYPE_COLORS[key] || FUEL_TYPE_COLORS.other
}

function getFuelCssColor(fuelType: string): string {
  const key = fuelType.toLowerCase().trim()
  return FUEL_TYPE_CSS_COLORS[key] || FUEL_TYPE_CSS_COLORS.other
}

// ─── Hook: returns raw deck.gl layers (merged into EntityDeckLayer's overlay) ─

/**
 * Returns an array of deck.gl layers for power plant rendering.
 * Pass the result to EntityDeckLayer's `extraLayers` prop —
 * do NOT create a separate MapboxOverlay (only one can exist per map).
 */
export function usePowerPlantLayers({
  plants,
  visible = true,
  bubbleScale = 1.0,
  zoom = 2,
  onPlantClick,
  selectedPlantId,
}: Omit<PowerPlantLayerProps, "map">): any[] {
  return useMemo(() => {
    if (!visible || plants.length === 0) return []

    const result: any[] = []

    // ── Bubble layer ──────────────────────────────────────────────────────
    result.push(
      new ScatterplotLayer({
        id: "power-plant-bubbles",
        data: plants,
        pickable: true,
        filled: true,
        stroked: true,
        getPosition: (d: PowerPlant) => [d.lng, d.lat],
        getRadius: (d: PowerPlant) => {
          // Radius proportional to sqrt of capacity for area-proportional sizing
          const base = Math.sqrt(Math.max(d.capacity_mw, 1)) * 80
          return base * bubbleScale
        },
        getFillColor: (d: PowerPlant) => {
          if (d.id === selectedPlantId) {
            return [255, 255, 255, 240] // White highlight for selected
          }
          return getFuelColor(d.fuel_type)
        },
        getLineColor: (d: PowerPlant) => {
          if (d.id === selectedPlantId) {
            return [0, 255, 255, 255] // Cyan border for selected
          }
          const [r, g, b] = getFuelColor(d.fuel_type)
          return [r, g, b, 120] // Subtle border matching fill
        },
        lineWidthMinPixels: 1,
        lineWidthMaxPixels: 2,
        radiusMinPixels: 3,
        radiusMaxPixels: 200,
        radiusUnits: "meters",
        opacity: 0.85,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 80],
        onClick: (info: any) => {
          if (info.object && onPlantClick) {
            onPlantClick(info.object)
          }
        },
        updateTriggers: {
          getFillColor: [selectedPlantId],
          getLineColor: [selectedPlantId],
          getRadius: [bubbleScale],
        },
      })
    )

    // ── Text labels at zoom 7+ ──────────────────────────────────────────
    if (zoom >= 7) {
      // Only label plants > 50MW at zoom 7-9, all plants at zoom 10+
      const labelThreshold = zoom >= 10 ? 0 : zoom >= 9 ? 10 : 50
      const labeledPlants = plants.filter((p) => p.capacity_mw >= labelThreshold)

      result.push(
        new TextLayer({
          id: "power-plant-labels",
          data: labeledPlants,
          getPosition: (d: PowerPlant) => [d.lng, d.lat],
          getText: (d: PowerPlant) => {
            const mw = d.capacity_mw >= 1000
              ? `${(d.capacity_mw / 1000).toFixed(1)} GW`
              : `${Math.round(d.capacity_mw)} MW`
            return `${d.name} · ${mw}`
          },
          getSize: zoom >= 10 ? 12 : 10,
          getColor: [255, 255, 255, 200],
          getAngle: 0,
          getTextAnchor: "start",
          getAlignmentBaseline: "center",
          getPixelOffset: [12, 0],
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
  }, [plants, visible, bubbleScale, zoom, selectedPlantId, onPlantClick])
}

/** @deprecated Use usePowerPlantLayers hook + EntityDeckLayer.extraLayers instead */
export function PowerPlantBubbleLayer(_props: PowerPlantLayerProps) {
  console.warn("[PowerPlantBubbleLayer] Deprecated — use usePowerPlantLayers hook instead")
  return null
}

// ─── Utility: Compute viewport statistics ────────────────────────────────────

export interface PlantStats {
  totalPlants: number
  totalCapacityGW: number
  byFuelType: { fuel: string; count: number; capacityGW: number; color: string }[]
}

/**
 * Compute OpenGridWorks-style statistics from a list of power plants.
 * Used by the viewport-reactive left panel.
 */
export function computePlantStats(plants: PowerPlant[]): PlantStats {
  const byFuel = new Map<string, { count: number; capacityMW: number }>()

  for (const plant of plants) {
    const key = plant.fuel_type.toLowerCase().trim()
    const existing = byFuel.get(key) || { count: 0, capacityMW: 0 }
    existing.count += 1
    existing.capacityMW += plant.capacity_mw
    byFuel.set(key, existing)
  }

  const byFuelType = Array.from(byFuel.entries())
    .map(([fuel, { count, capacityMW }]) => ({
      fuel: fuel.charAt(0).toUpperCase() + fuel.slice(1),
      count,
      capacityGW: +(capacityMW / 1000).toFixed(1),
      color: getFuelCssColor(fuel),
    }))
    .sort((a, b) => b.capacityGW - a.capacityGW)

  const totalCapacityMW = plants.reduce((sum, p) => sum + p.capacity_mw, 0)

  return {
    totalPlants: plants.length,
    totalCapacityGW: +(totalCapacityMW / 1000).toFixed(1),
    byFuelType,
  }
}
