/**
 * CREP Infrastructure Highlight — OpenGridWorks-style selection glow
 *
 * When a user clicks on any infrastructure asset (cable, plant, substation,
 * TX line, cell tower), it lights up with a bright glow effect — matching
 * exactly what OpenGridWorks does.
 *
 * Architecture:
 *   - Separate highlight source/layer per geometry type (point vs line)
 *   - Point highlight: Large bright circle with animated pulse ring
 *   - Line highlight: Thick bright line with glow-shadow underneath
 *   - Highlight layer sits above all other infra layers
 */

/** Infrastructure layer IDs used in CREPDashboardClient */
const INFRA_POINT_LAYERS = ["crep-plants-circle", "crep-subs-circle", "crep-celltowers-circle"]
const INFRA_LINE_LAYERS = ["crep-cables-line", "crep-txlines-line"]

/** All infra layer IDs */
export const ALL_INFRA_LAYERS = [...INFRA_POINT_LAYERS, ...INFRA_LINE_LAYERS]

/**
 * Initialize highlight layers on the map.
 * Call this once after all infra layers are loaded.
 */
export function initHighlightLayers(map: any) {
  // ── Point highlight (for plants, substations, cell towers) ──
  try {
    if (!map.getSource("crep-highlight-point")) {
      map.addSource("crep-highlight-point", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })
    }
  } catch {}

  // Outer glow ring
  try {
    if (map.getLayer("crep-highlight-point-glow")) map.removeLayer("crep-highlight-point-glow")
    map.addLayer({
      id: "crep-highlight-point-glow",
      type: "circle",
      source: "crep-highlight-point",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 18, 8, 28, 14, 40],
        "circle-color": "transparent",
        "circle-stroke-width": 3,
        "circle-stroke-color": "#00ffff",
        "circle-opacity": 0.9,
        "circle-stroke-opacity": 0.8,
      },
    })
  } catch (e: any) {
    console.warn("[CREP/Highlight] Point glow layer:", e.message)
  }

  // Inner bright circle
  try {
    if (map.getLayer("crep-highlight-point-inner")) map.removeLayer("crep-highlight-point-inner")
    map.addLayer({
      id: "crep-highlight-point-inner",
      type: "circle",
      source: "crep-highlight-point",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 8, 8, 14, 14, 22],
        "circle-color": "#00ffff",
        "circle-opacity": 0.4,
        "circle-stroke-width": 2,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.9,
      },
    })
  } catch (e: any) {
    console.warn("[CREP/Highlight] Point inner layer:", e.message)
  }

  // ── Line highlight (for cables, TX lines) ──
  try {
    if (!map.getSource("crep-highlight-line")) {
      map.addSource("crep-highlight-line", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      })
    }
  } catch {}

  // Outer glow (thick, semi-transparent)
  try {
    if (map.getLayer("crep-highlight-line-glow")) map.removeLayer("crep-highlight-line-glow")
    map.addLayer({
      id: "crep-highlight-line-glow",
      type: "line",
      source: "crep-highlight-line",
      paint: {
        "line-color": "#00ffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 8, 6, 14, 12, 20],
        "line-opacity": 0.3,
        "line-blur": 6,
      },
    })
  } catch (e: any) {
    console.warn("[CREP/Highlight] Line glow layer:", e.message)
  }

  // Inner bright line
  try {
    if (map.getLayer("crep-highlight-line-inner")) map.removeLayer("crep-highlight-line-inner")
    map.addLayer({
      id: "crep-highlight-line-inner",
      type: "line",
      source: "crep-highlight-line",
      paint: {
        "line-color": "#ffffff",
        "line-width": ["interpolate", ["linear"], ["zoom"], 1, 3, 6, 5, 12, 7],
        "line-opacity": 0.9,
      },
    })
  } catch (e: any) {
    console.warn("[CREP/Highlight] Line inner layer:", e.message)
  }

  console.log("[CREP/Highlight] Highlight layers initialized")
}

/**
 * Highlight a point feature (plant, substation, cell tower).
 */
export function highlightPoint(map: any, lng: number, lat: number, properties?: Record<string, any>) {
  clearHighlight(map)
  try {
    const source = map.getSource("crep-highlight-point")
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: properties || {},
          geometry: { type: "Point", coordinates: [lng, lat] },
        }],
      })
    }
  } catch (e: any) {
    console.warn("[CREP/Highlight] highlightPoint:", e.message)
  }
}

/**
 * Highlight a line feature (cable, TX line).
 * Pass the full GeoJSON geometry to highlight the entire line.
 */
export function highlightLine(map: any, geometry: any, properties?: Record<string, any>) {
  clearHighlight(map)
  try {
    const source = map.getSource("crep-highlight-line")
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: [{
          type: "Feature",
          properties: properties || {},
          geometry,
        }],
      })
    }
  } catch (e: any) {
    console.warn("[CREP/Highlight] highlightLine:", e.message)
  }
}

/**
 * Highlight a feature from a map click event.
 * Automatically determines point vs line from the clicked feature.
 */
export function highlightFromEvent(map: any, e: any) {
  const feature = e.features?.[0]
  if (!feature) return

  const geomType = feature.geometry?.type
  if (geomType === "Point" || geomType === "MultiPoint") {
    const coords = feature.geometry.coordinates
    highlightPoint(map, coords[0], coords[1], feature.properties)
  } else if (geomType === "LineString" || geomType === "MultiLineString") {
    highlightLine(map, feature.geometry, feature.properties)
  }
}

/**
 * Clear all highlights.
 */
export function clearHighlight(map: any) {
  try {
    const pointSource = map.getSource("crep-highlight-point")
    if (pointSource) {
      pointSource.setData({ type: "FeatureCollection", features: [] })
    }
  } catch {}
  try {
    const lineSource = map.getSource("crep-highlight-line")
    if (lineSource) {
      lineSource.setData({ type: "FeatureCollection", features: [] })
    }
  } catch {}
}
