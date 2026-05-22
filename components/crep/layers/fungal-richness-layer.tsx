"use client"

/**
 * Fungal Richness Layer — May 2026
 *
 * Native MapLibre GL raster layers for AM and EcM mycorrhizal fungal richness.
 * SPUN-atlas-inspired continuous surface: blue-green (AM) / orange-red (EcM).
 *
 * Data pipeline (priority order):
 *   1. Local SPUN XYZ tiles at /data/crep/fungal/{layer}/{z}/{x}/{y}.png
 *      Drop SPUN GeoTIFF exports (converted to XYZ PNGs) into
 *      public/data/crep/fungal/{am|ecm}/ and they are served automatically.
 *   2. GBIF occurrence density tiles via /api/crep/fungal-atlas/tiles/{layer}/{z}/{x}/{y}
 *      Real observational data proxied from api.gbif.org. Available now.
 *      AM  → Glomeromycetes occurrences (taxon 7707728)
 *      EcM → Agaricomycetes occurrences (taxon 1462986, noted as proxy)
 *
 * Both layers start disabled by default per CREP all-off debug baseline.
 */

import { useEffect, useRef } from "react"
import type { Map as MapLibreMap } from "maplibre-gl"

export interface FungalRichnessLayerProps {
  map: MapLibreMap | null
  amEnabled: boolean
  ecmEnabled: boolean
  amOpacity?: number
  ecmOpacity?: number
}

const AM_SOURCE  = "fungal-am-source"
const ECM_SOURCE = "fungal-ecm-source"
const AM_LAYER   = "fungal-am-raster"
const ECM_LAYER  = "fungal-ecm-raster"

function mapReady(map: MapLibreMap): boolean {
  return !!(
    map &&
    (map as any).style &&
    typeof map.getSource === "function" &&
    (map.isStyleLoaded?.() !== false)
  )
}

function tileUrl(layer: "am" | "ecm"): string {
  // Uses Next.js route /api/crep/fungal-atlas/tiles/{layer}/{z}/{x}/{y}
  return `/api/crep/fungal-atlas/tiles/${layer}/{z}/{x}/{y}`
}

function addLayer(
  map: MapLibreMap,
  sourceId: string,
  layerId: string,
  layer: "am" | "ecm",
  opacity: number,
) {
  if (!mapReady(map)) return

  if (!map.getSource(sourceId)) {
    map.addSource(sourceId, {
      type: "raster",
      tiles: [tileUrl(layer)],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 14,
      attribution:
        layer === "am"
          ? "GBIF Glomeromycetes occurrences | SPUN Atlas"
          : "GBIF Agaricomycetes occurrences (EcM proxy) | SPUN Atlas",
    })
  }

  if (!map.getLayer(layerId)) {
    // Insert below the first symbol/label layer so fungal surface
    // doesn't obscure place names or road labels.
    const labelLayer = map
      .getStyle()
      ?.layers?.find(
        (l) => l.type === "symbol" && (l as any).layout?.["text-field"],
      )?.id

    map.addLayer(
      {
        id: layerId,
        type: "raster",
        source: sourceId,
        paint: {
          "raster-opacity": opacity,
          "raster-fade-duration": 400,
          // Slight saturation boost — GBIF tiles are vivid enough but
          // the EcM fire palette looks better with a touch of warmth.
          "raster-saturation": layer === "am" ? 0.2 : 0.15,
          "raster-brightness-min": 0.04,
        },
      },
      labelLayer,
    )
  }
}

function removeLayer(map: MapLibreMap, sourceId: string, layerId: string) {
  if (!mapReady(map)) return
  try { map.removeLayer(layerId) } catch { /* already gone */ }
  try { map.removeSource(sourceId) } catch { /* already gone */ }
}

export default function FungalRichnessLayer({
  map,
  amEnabled,
  ecmEnabled,
  amOpacity  = 0.75,
  ecmOpacity = 0.75,
}: FungalRichnessLayerProps) {
  const amMounted  = useRef(false)
  const ecmMounted = useRef(false)

  // ── AM lifecycle ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return

    if (amEnabled) {
      const tryAdd = () => {
        if (!mapReady(map)) {
          map.once("styledata", tryAdd)
          return
        }
        addLayer(map, AM_SOURCE, AM_LAYER, "am", amOpacity)
        amMounted.current = true
      }
      tryAdd()
    } else if (amMounted.current) {
      removeLayer(map, AM_SOURCE, AM_LAYER)
      amMounted.current = false
    }

    return () => {
      if (amMounted.current && map) {
        removeLayer(map, AM_SOURCE, AM_LAYER)
        amMounted.current = false
      }
    }
  }, [map, amEnabled, amOpacity])

  // ── EcM lifecycle ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return

    if (ecmEnabled) {
      const tryAdd = () => {
        if (!mapReady(map)) {
          map.once("styledata", tryAdd)
          return
        }
        addLayer(map, ECM_SOURCE, ECM_LAYER, "ecm", ecmOpacity)
        ecmMounted.current = true
      }
      tryAdd()
    } else if (ecmMounted.current) {
      removeLayer(map, ECM_SOURCE, ECM_LAYER)
      ecmMounted.current = false
    }

    return () => {
      if (ecmMounted.current && map) {
        removeLayer(map, ECM_SOURCE, ECM_LAYER)
        ecmMounted.current = false
      }
    }
  }, [map, ecmEnabled, ecmOpacity])

  return null
}
