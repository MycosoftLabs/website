/**
 * CREP Jurisdiction Boundary Layers — State/County/FEMA/Country borders on MapLibre
 *
 * Adds visual boundary layers to the map using the vector tile data already
 * present in the Carto basemap (OpenMapTiles schema). Also adds FEMA region
 * overlays from custom GeoJSON.
 *
 * These layers are CRITICAL for FUSARIUM defense/IC use — every piece of
 * intelligence must be anchored to its jurisdiction.
 *
 * Layers added:
 *   crep-boundaries-country    — Country borders (admin_level=2), always visible
 *   crep-boundaries-state      — State/province borders (admin_level=4), zoom 3+
 *   crep-boundaries-county     — County/district borders (admin_level=6), zoom 7+
 *   crep-fema-regions-fill     — FEMA region shading (10 regions)
 *   crep-fema-regions-line     — FEMA region borders
 *   crep-fema-labels           — FEMA region labels at center
 */

import { FEMA_REGIONS, type FemaRegion } from "./geo-regions"

/** FEMA region colors — muted so they don't overwhelm infrastructure layers */
const FEMA_COLORS: Record<number, string> = {
  1:  "#3b82f680", // blue
  2:  "#ef444480", // red
  3:  "#f59e0b80", // amber
  4:  "#22c55e80", // green
  5:  "#a855f780", // purple
  6:  "#ec489980", // pink
  7:  "#14b8a680", // teal
  8:  "#f9731680", // orange
  9:  "#06b6d480", // cyan
  10: "#8b5cf680", // violet
}

const FEMA_BORDER_COLORS: Record<number, string> = {
  1:  "#3b82f6", 2:  "#ef4444", 3:  "#f59e0b", 4:  "#22c55e", 5:  "#a855f7",
  6:  "#ec4899", 7:  "#14b8a6", 8:  "#f97316", 9:  "#06b6d4", 10: "#8b5cf6",
}

/**
 * Build a simple polygon from a FEMA region's bounding box.
 * Not state-accurate but provides visual jurisdictional grouping.
 */
function femaRegionToFeature(fema: FemaRegion) {
  const { north, south, east, west } = fema
  return {
    type: "Feature" as const,
    properties: {
      id: fema.id,
      name: fema.name,
      regionNumber: fema.regionNumber,
      hqCity: fema.hqCity,
      states: fema.states.join(", "),
      color: FEMA_COLORS[fema.regionNumber] || "#ffffff40",
      borderColor: FEMA_BORDER_COLORS[fema.regionNumber] || "#ffffff",
    },
    geometry: {
      type: "Polygon" as const,
      coordinates: [[
        [west, south],
        [east, south],
        [east, north],
        [west, north],
        [west, south],
      ]],
    },
  }
}

/** Build FEMA region label points at center of each region */
function femaRegionLabels() {
  return FEMA_REGIONS.map(f => ({
    type: "Feature" as const,
    properties: {
      name: `FEMA ${f.regionNumber}`,
      detail: `${f.hqCity}\n${f.states.join(", ")}`,
      regionNumber: f.regionNumber,
    },
    geometry: {
      type: "Point" as const,
      coordinates: [
        (f.east + f.west) / 2,
        (f.north + f.south) / 2,
      ],
    },
  }))
}

/**
 * Find the vector tile source name in the current map style.
 * Carto basemaps use "carto" but others may differ.
 */
function findVectorSource(map: any): string | null {
  const style = map.getStyle()
  if (!style?.sources) return null
  for (const [name, source] of Object.entries(style.sources)) {
    if ((source as any).type === "vector") return name
  }
  return null
}

/**
 * Add all jurisdiction boundary layers to the map.
 * Call this after map style has loaded.
 */
export function addJurisdictionLayers(map: any, options?: {
  showCountry?: boolean
  showState?: boolean
  showCounty?: boolean
  showFema?: boolean
  showFemaLabels?: boolean
}) {
  const opts = {
    showCountry: true,
    showState: true,
    showCounty: true,
    showFema: true,
    showFemaLabels: true,
    ...options,
  }

  const vectorSource = findVectorSource(map)

  // Helper: safe add source/layer
  const safeAdd = (sourceId: string, sourceSpec: any) => {
    try {
      if (map.getSource(sourceId)) {
        (map.getSource(sourceId) as any).setData?.(sourceSpec.data)
      } else {
        map.addSource(sourceId, sourceSpec)
      }
    } catch (e: any) {
      console.warn(`[CREP/Jurisdiction] Source ${sourceId}:`, e.message)
    }
  }

  const safeLayer = (spec: any) => {
    try {
      if (map.getLayer(spec.id)) map.removeLayer(spec.id)
      map.addLayer(spec)
    } catch (e: any) {
      console.warn(`[CREP/Jurisdiction] Layer ${spec.id}:`, e.message)
    }
  }

  // ── Vector tile boundary layers (from Carto basemap) ──
  if (vectorSource) {
    // Country borders — always visible, thick dashed line
    if (opts.showCountry) {
      safeLayer({
        id: "crep-boundaries-country",
        type: "line",
        source: vectorSource,
        "source-layer": "boundary",
        filter: ["all", ["==", "admin_level", 2], ["!=", "maritime", 1]],
        paint: {
          "line-color": "#4ade80",
          "line-width": ["interpolate", ["linear"], ["zoom"], 1, 0.8, 4, 1.5, 8, 2.5],
          "line-opacity": 0.6,
          "line-dasharray": [4, 2],
        },
        minzoom: 1,
      })
    }

    // State/province borders — visible at zoom 3+
    if (opts.showState) {
      safeLayer({
        id: "crep-boundaries-state",
        type: "line",
        source: vectorSource,
        "source-layer": "boundary",
        filter: ["all", ["==", "admin_level", 4], ["!=", "maritime", 1]],
        paint: {
          "line-color": "#60a5fa",
          "line-width": ["interpolate", ["linear"], ["zoom"], 3, 0.5, 6, 1, 10, 1.5],
          "line-opacity": 0.45,
          "line-dasharray": [3, 2],
        },
        minzoom: 3,
      })
    }

    // County/district borders — visible at zoom 7+
    if (opts.showCounty) {
      safeLayer({
        id: "crep-boundaries-county",
        type: "line",
        source: vectorSource,
        "source-layer": "boundary",
        filter: ["all",
          ["any", ["==", "admin_level", 6], ["==", "admin_level", 8]],
          ["!=", "maritime", 1],
        ],
        paint: {
          "line-color": "#a78bfa",
          "line-width": 0.5,
          "line-opacity": 0.3,
          "line-dasharray": [2, 2],
        },
        minzoom: 7,
      })
    }
  } else {
    console.warn("[CREP/Jurisdiction] No vector tile source found — boundary layers unavailable. Base style may not include boundary data.")
  }

  // ── FEMA Region overlay (custom GeoJSON) ──
  if (opts.showFema) {
    const femaFeatures = FEMA_REGIONS.map(femaRegionToFeature)
    safeAdd("crep-fema-regions", {
      type: "geojson",
      data: { type: "FeatureCollection", features: femaFeatures },
    })

    // Semi-transparent fill
    safeLayer({
      id: "crep-fema-regions-fill",
      type: "fill",
      source: "crep-fema-regions",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": ["interpolate", ["linear"], ["zoom"], 3, 0.08, 6, 0.04, 10, 0.02],
      },
      minzoom: 3,
      maxzoom: 10,
    })

    // Border lines
    safeLayer({
      id: "crep-fema-regions-line",
      type: "line",
      source: "crep-fema-regions",
      paint: {
        "line-color": ["get", "borderColor"],
        "line-width": ["interpolate", ["linear"], ["zoom"], 3, 1, 6, 2, 10, 2.5],
        "line-opacity": 0.5,
        "line-dasharray": [6, 3],
      },
      minzoom: 3,
    })

    // Click handler for FEMA regions
    map.on("click", "crep-fema-regions-fill", (e: any) => {
      const props = e.features?.[0]?.properties
      if (props?.name) {
        // Show a minimal popup with FEMA region info
        console.log(`[CREP/FEMA] Clicked: ${props.name} — HQ: ${props.hqCity}, States: ${props.states}`)
      }
    })
    map.on("mouseenter", "crep-fema-regions-fill", () => { map.getCanvas().style.cursor = "pointer" })
    map.on("mouseleave", "crep-fema-regions-fill", () => { map.getCanvas().style.cursor = "" })
  }

  // ── FEMA Region labels ──
  if (opts.showFemaLabels) {
    const labels = femaRegionLabels()
    safeAdd("crep-fema-labels", {
      type: "geojson",
      data: { type: "FeatureCollection", features: labels },
    })

    safeLayer({
      id: "crep-fema-labels-text",
      type: "symbol",
      source: "crep-fema-labels",
      layout: {
        "text-field": ["get", "name"],
        "text-size": ["interpolate", ["linear"], ["zoom"], 3, 10, 6, 14, 10, 16],
        "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        "text-anchor": "center",
        "text-allow-overlap": false,
      },
      paint: {
        "text-color": "#ffffff",
        "text-opacity": 0.7,
        "text-halo-color": "#000000",
        "text-halo-width": 1.5,
      },
      minzoom: 3,
      maxzoom: 8,
    })
  }

  console.log("[CREP/Jurisdiction] Boundary layers added — country/state/county/FEMA")
}

/**
 * Toggle visibility of a jurisdiction layer group.
 */
export function toggleJurisdictionLayer(
  map: any,
  group: "country" | "state" | "county" | "fema",
  visible: boolean
) {
  const layerMap: Record<string, string[]> = {
    country: ["crep-boundaries-country"],
    state: ["crep-boundaries-state"],
    county: ["crep-boundaries-county"],
    fema: ["crep-fema-regions-fill", "crep-fema-regions-line", "crep-fema-labels-text"],
  }

  const layers = layerMap[group] || []
  for (const id of layers) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", visible ? "visible" : "none")
    }
  }
}

/**
 * Remove all jurisdiction layers from the map.
 */
export function removeJurisdictionLayers(map: any) {
  const layerIds = [
    "crep-boundaries-country",
    "crep-boundaries-state",
    "crep-boundaries-county",
    "crep-fema-regions-fill",
    "crep-fema-regions-line",
    "crep-fema-labels-text",
  ]
  const sourceIds = ["crep-fema-regions", "crep-fema-labels"]

  for (const id of layerIds) {
    try { if (map.getLayer(id)) map.removeLayer(id) } catch {}
  }
  for (const id of sourceIds) {
    try { if (map.getSource(id)) map.removeSource(id) } catch {}
  }
}
