/**
 * PMTiles Protocol Registration for MapLibre GL
 *
 * Registers the pmtiles:// protocol so MapLibre can load vector tiles
 * directly from .pmtiles archives (local or remote). This replaces
 * the slow Overpass API queries with pre-built tile archives for
 * power plants, transmission lines, substations, and other infrastructure.
 *
 * Usage:
 *   import { registerPMTilesProtocol } from "@/lib/crep/pmtiles-source"
 *   registerPMTilesProtocol(map)
 *
 * Then use sources like:
 *   map.addSource("power-plants", {
 *     type: "vector",
 *     url: "pmtiles://https://example.com/plants.pmtiles",
 *   })
 */

import { PMTiles, Protocol } from "pmtiles"
import type maplibregl from "maplibre-gl"

let protocol: Protocol | null = null

/**
 * Register the PMTiles protocol with MapLibre.
 * Safe to call multiple times — only registers once.
 */
export function registerPMTilesProtocol(maplibre: typeof import("maplibre-gl")) {
  if (protocol) return protocol

  protocol = new Protocol()
  maplibre.addProtocol("pmtiles", protocol.tile)
  return protocol
}

/**
 * Remove the PMTiles protocol (cleanup on unmount).
 */
export function unregisterPMTilesProtocol(maplibre: typeof import("maplibre-gl")) {
  if (!protocol) return
  maplibre.removeProtocol("pmtiles")
  protocol = null
}

/**
 * Pre-built PMTiles source URLs for infrastructure data.
 * These will be served from MINDEX or a Cloudflare R2/Supabase Storage bucket.
 * For now, using publicly available PMTiles sources where possible.
 */
export const PMTILES_SOURCES = {
  /** Global power plants from WRI Global Power Plant Database + EIA 860M */
  powerPlants: "/api/mindex/tiles/power-plants",
  /** US transmission lines from HIFLD + OSM */
  transmissionLines: "/api/mindex/tiles/transmission",
  /** US substations from HIFLD + OSM */
  substations: "/api/mindex/tiles/substations",
  /** Data centers from OSM + PeeringDB */
  datacenters: "/api/mindex/tiles/datacenters",
  /** Gas pipelines from EIA + OSM */
  gasPipelines: "/api/mindex/tiles/gas-pipelines",
  /** NASA Black Marble night lights */
  nightLights: "/api/mindex/tiles/night-lights",
} as const
