"use client"

/**
 * deck.gl Layer Components for Earth Simulator
 * 
 * Provides high-performance GPU-accelerated visualization layers:
 * - IconLayer: Entity markers (devices, species, aircraft, vessels)
 * - ScatterplotLayer: Observations and biodiversity data
 * - HeatmapLayer: Density visualization
 * - PathLayer: Track history and routes
 * - PolygonLayer: Event affected areas
 */

import { useEffect, useMemo, useCallback } from "react"
import type { Entity, Observation, Event as OEIEvent, GeoLocation } from "@/types/oei"

// =============================================================================
// TYPES
// =============================================================================

export interface DeckGLLayerData {
  entities?: Entity[]
  observations?: Observation[]
  events?: OEIEvent[]
  tracks?: TrackData[]
}

export interface TrackData {
  id: string
  name: string
  path: Array<{ longitude: number; latitude: number; timestamp: number }>
  color?: [number, number, number]
}

export interface LayerConfig {
  visible?: boolean
  opacity?: number
  pickable?: boolean
  autoHighlight?: boolean
}

export interface IconLayerConfig extends LayerConfig {
  sizeScale?: number
  getSize?: (d: Entity) => number
  getColor?: (d: Entity) => [number, number, number, number]
}

export interface ScatterplotLayerConfig extends LayerConfig {
  radiusScale?: number
  radiusMinPixels?: number
  radiusMaxPixels?: number
}

export interface HeatmapLayerConfig extends LayerConfig {
  intensity?: number
  threshold?: number
  radiusPixels?: number
  colorRange?: number[][]
}

// =============================================================================
// ICON CONFIGURATIONS
// =============================================================================

const ENTITY_ICONS: Record<string, { icon: string; color: [number, number, number, number] }> = {
  device: { icon: "📡", color: [0, 200, 255, 255] },
  species: { icon: "🍄", color: [180, 120, 60, 255] },
  aircraft: { icon: "✈️", color: [100, 100, 255, 255] },
  vessel: { icon: "🚢", color: [50, 150, 255, 255] },
  satellite: { icon: "🛰️", color: [200, 200, 200, 255] },
  weather_station: { icon: "🌡️", color: [255, 200, 0, 255] },
  sensor: { icon: "📊", color: [0, 255, 150, 255] },
  custom: { icon: "📍", color: [255, 100, 100, 255] },
}

const OBSERVATION_COLORS: Record<string, [number, number, number, number]> = {
  temperature: [255, 100, 50, 200],
  humidity: [50, 150, 255, 200],
  air_quality: [150, 200, 50, 200],
  species_observation: [180, 120, 60, 200],
  default: [150, 150, 150, 200],
}

const EVENT_COLORS: Record<string, [number, number, number, number]> = {
  weather_alert: [255, 200, 0, 200],
  earthquake: [255, 100, 0, 200],
  volcanic_activity: [255, 50, 0, 200],
  wildfire: [255, 80, 0, 200],
  tsunami_warning: [0, 100, 255, 200],
  species_observation: [100, 200, 100, 200],
  default: [100, 100, 100, 200],
}

// =============================================================================
// LAYER DATA GENERATORS
// =============================================================================

/**
 * Generate icon layer data from entities
 */
export function generateEntityIconData(entities: Entity[]): Array<{
  id: string
  position: [number, number]
  icon: string
  color: [number, number, number, number]
  size: number
  entity: Entity
}> {
  return entities
    .filter(e => e.location?.latitude && e.location?.longitude)
    .map(entity => {
      const config = ENTITY_ICONS[entity.type] || ENTITY_ICONS.custom
      return {
        id: entity.id,
        position: [entity.location!.longitude, entity.location!.latitude] as [number, number],
        icon: config.icon,
        color: config.color,
        size: entity.type === "aircraft" || entity.type === "vessel" ? 24 : 20,
        entity,
      }
    })
}

/**
 * Generate scatterplot data from observations
 */
export function generateObservationScatterData(observations: Observation[]): Array<{
  id: string
  position: [number, number]
  radius: number
  color: [number, number, number, number]
  observation: Observation
}> {
  return observations
    .filter(o => o.location?.latitude && o.location?.longitude)
    .map(obs => ({
      id: obs.id,
      position: [obs.location!.longitude, obs.location!.latitude] as [number, number],
      radius: Math.max(5, Math.min(20, (obs.value || 1) / 10)),
      color: OBSERVATION_COLORS[obs.type] || OBSERVATION_COLORS.default,
      observation: obs,
    }))
}

/**
 * Generate heatmap data from observations
 */
export function generateHeatmapData(observations: Observation[]): Array<{
  position: [number, number]
  weight: number
}> {
  return observations
    .filter(o => o.location?.latitude && o.location?.longitude)
    .map(obs => ({
      position: [obs.location!.longitude, obs.location!.latitude] as [number, number],
      weight: obs.value || 1,
    }))
}

/**
 * Generate polygon data from events with affected areas
 */
export function generateEventPolygonData(events: OEIEvent[]): Array<{
  id: string
  polygon: number[][]
  color: [number, number, number, number]
  event: OEIEvent
}> {
  return events
    .filter(e => e.affectedArea)
    .map(event => {
      const area = event.affectedArea!
      // Create a simple rectangle from bounds
      const polygon = [
        [area.west, area.south],
        [area.east, area.south],
        [area.east, area.north],
        [area.west, area.north],
        [area.west, area.south], // Close the polygon
      ]
      return {
        id: event.id,
        polygon,
        color: EVENT_COLORS[event.type] || EVENT_COLORS.default,
        event,
      }
    })
}

/**
 * Generate path data from tracks
 */
export function generatePathData(tracks: TrackData[]): Array<{
  id: string
  path: [number, number][]
  color: [number, number, number]
  name: string
}> {
  return tracks.map(track => ({
    id: track.id,
    path: track.path.map(p => [p.longitude, p.latitude] as [number, number]),
    color: track.color || [100, 150, 255],
    name: track.name,
  }))
}

// =============================================================================
// LAYER CONFIGURATIONS
// =============================================================================

/**
 * Create configuration object for entity icon layer
 */
export function createEntityIconLayerConfig(config?: IconLayerConfig) {
  return {
    id: "entity-icons",
    data: [],
    pickable: config?.pickable ?? true,
    autoHighlight: config?.autoHighlight ?? true,
    visible: config?.visible ?? true,
    opacity: config?.opacity ?? 1,
    sizeScale: config?.sizeScale ?? 1,
    getPosition: (d: { position: [number, number] }) => d.position,
    getSize: config?.getSize ?? (() => 24),
    getColor: (d: { color: [number, number, number, number] }) => d.color,
  }
}

/**
 * Create configuration object for observation scatterplot layer
 */
export function createObservationScatterLayerConfig(config?: ScatterplotLayerConfig) {
  return {
    id: "observation-scatter",
    data: [],
    pickable: config?.pickable ?? true,
    visible: config?.visible ?? true,
    opacity: config?.opacity ?? 0.8,
    stroked: true,
    filled: true,
    radiusScale: config?.radiusScale ?? 1,
    radiusMinPixels: config?.radiusMinPixels ?? 3,
    radiusMaxPixels: config?.radiusMaxPixels ?? 30,
    lineWidthMinPixels: 1,
    getPosition: (d: { position: [number, number] }) => d.position,
    getRadius: (d: { radius: number }) => d.radius,
    getFillColor: (d: { color: [number, number, number, number] }) => d.color,
    getLineColor: [255, 255, 255, 150],
  }
}

/**
 * Create configuration object for heatmap layer
 */
export function createHeatmapLayerConfig(config?: HeatmapLayerConfig) {
  return {
    id: "observation-heatmap",
    data: [],
    visible: config?.visible ?? true,
    opacity: config?.opacity ?? 0.6,
    intensity: config?.intensity ?? 1,
    threshold: config?.threshold ?? 0.05,
    radiusPixels: config?.radiusPixels ?? 30,
    colorRange: config?.colorRange ?? [
      [1, 152, 189],
      [73, 227, 206],
      [216, 254, 181],
      [254, 237, 177],
      [254, 173, 84],
      [209, 55, 78],
    ],
    getPosition: (d: { position: [number, number] }) => d.position,
    getWeight: (d: { weight: number }) => d.weight,
    aggregation: "SUM",
  }
}

/**
 * Create configuration object for event polygon layer
 */
export function createEventPolygonLayerConfig(config?: LayerConfig) {
  return {
    id: "event-polygons",
    data: [],
    pickable: config?.pickable ?? true,
    visible: config?.visible ?? true,
    opacity: config?.opacity ?? 0.3,
    stroked: true,
    filled: true,
    extruded: false,
    wireframe: true,
    lineWidthMinPixels: 2,
    getPolygon: (d: { polygon: number[][] }) => d.polygon,
    getFillColor: (d: { color: [number, number, number, number] }) => d.color,
    getLineColor: (d: { color: [number, number, number, number] }) => 
      [d.color[0], d.color[1], d.color[2], 255] as [number, number, number, number],
  }
}

/**
 * Create configuration object for track path layer
 */
export function createTrackPathLayerConfig(config?: LayerConfig) {
  return {
    id: "track-paths",
    data: [],
    pickable: config?.pickable ?? true,
    visible: config?.visible ?? true,
    opacity: config?.opacity ?? 0.8,
    widthScale: 1,
    widthMinPixels: 2,
    widthMaxPixels: 10,
    rounded: true,
    getPath: (d: { path: [number, number][] }) => d.path,
    getColor: (d: { color: [number, number, number] }) => d.color,
    getWidth: 3,
  }
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Calculate viewport bounds from a list of coordinates
 */
export function calculateBounds(
  locations: Array<{ latitude: number; longitude: number }>
): { north: number; south: number; east: number; west: number } | null {
  if (locations.length === 0) return null

  let north = -90
  let south = 90
  let east = -180
  let west = 180

  for (const loc of locations) {
    north = Math.max(north, loc.latitude)
    south = Math.min(south, loc.latitude)
    east = Math.max(east, loc.longitude)
    west = Math.min(west, loc.longitude)
  }

  return { north, south, east, west }
}

/**
 * Get center point from bounds
 */
export function getCenterFromBounds(bounds: { north: number; south: number; east: number; west: number }): {
  latitude: number
  longitude: number
} {
  return {
    latitude: (bounds.north + bounds.south) / 2,
    longitude: (bounds.east + bounds.west) / 2,
  }
}

/**
 * Color interpolation for gradients
 */
export function interpolateColor(
  value: number,
  min: number,
  max: number,
  colorScale: [number, number, number][] = [
    [0, 100, 255],   // Blue (cold/low)
    [0, 255, 100],   // Green
    [255, 255, 0],   // Yellow
    [255, 150, 0],   // Orange
    [255, 0, 0],     // Red (hot/high)
  ]
): [number, number, number] {
  const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)))
  const index = normalizedValue * (colorScale.length - 1)
  const lowerIndex = Math.floor(index)
  const upperIndex = Math.ceil(index)
  const t = index - lowerIndex

  if (lowerIndex === upperIndex) {
    return colorScale[lowerIndex]
  }

  const lower = colorScale[lowerIndex]
  const upper = colorScale[upperIndex]

  return [
    Math.round(lower[0] + (upper[0] - lower[0]) * t),
    Math.round(lower[1] + (upper[1] - lower[1]) * t),
    Math.round(lower[2] + (upper[2] - lower[2]) * t),
  ]
}
