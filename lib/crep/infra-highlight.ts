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
 *
 * For cables + transmission lines that are split into multiple feature
 * segments (antimeridian splits, per-hop landing segments, OSM multi-ways),
 * clicking one segment looks up the WHOLE line by id and highlights
 * every segment end-to-end.
 */
export function highlightFromEvent(map: any, e: any) {
  const feature = e.features?.[0]
  if (!feature) return

  const geomType = feature.geometry?.type
  if (geomType === "Point" || geomType === "MultiPoint") {
    const coords = feature.geometry.coordinates
    highlightPoint(map, coords[0], coords[1], feature.properties)
  } else if (geomType === "LineString" || geomType === "MultiLineString") {
    // Try to find all sibling segments that share the same cable_id / line_id /
    // id within the source. This turns a partial-segment click into a full
    // end-to-end highlight.
    const sourceId: string | undefined = (feature as any).source || e.features?.[0]?.layer?.source
    const props = feature.properties || {}
    const groupKey =
      props.cable_id ?? props.line_id ?? props.cableId ?? props.lineId ?? props.id
    if (sourceId && groupKey != null) {
      const merged = gatherLineByGroupId(map, sourceId, groupKey)
      if (merged) {
        highlightLine(map, merged.geometry, { ...props, __fullLine: true, __segments: merged.segmentCount })
        // Attempt to fit to the full line's extent
        try {
          const bounds = computeLineBounds(merged.geometry)
          if (bounds && (map as any).fitBounds) {
            (map as any).fitBounds(bounds, { padding: 80, duration: 700, maxZoom: 7 })
          }
        } catch {}
        return
      }
    }
    highlightLine(map, feature.geometry, feature.properties)
  }
}

/**
 * Walk the vector-tile / GeoJSON source and return the merged geometry of
 * every feature whose id / cable_id / line_id matches `groupKey`.
 *
 * Implementation note: we use querySourceFeatures so we pick up features
 * that are currently loaded but outside the viewport. Callers that need
 * full-catalog coverage can pre-compute the index at source-add time.
 */
export function gatherLineByGroupId(map: any, sourceId: string, groupKey: any):
  { geometry: { type: "MultiLineString"; coordinates: [number, number][][] }; segmentCount: number } | null {
  try {
    if (!map || typeof map.querySourceFeatures !== "function") return null
    const features: any[] = map.querySourceFeatures(sourceId) || []
    const keyStr = String(groupKey)
    const matching = features.filter((f) => {
      const p = f.properties || {}
      return String(p.cable_id ?? p.line_id ?? p.cableId ?? p.lineId ?? p.id ?? "") === keyStr
    })
    if (!matching.length) return null
    const coords: [number, number][][] = []
    for (const m of matching) {
      const g = m.geometry
      if (!g) continue
      if (g.type === "LineString") coords.push(g.coordinates as [number, number][])
      else if (g.type === "MultiLineString") {
        for (const line of g.coordinates as [number, number][][]) coords.push(line)
      }
    }
    if (!coords.length) return null
    return { geometry: { type: "MultiLineString", coordinates: coords }, segmentCount: coords.length }
  } catch { return null }
}

function computeLineBounds(geom: any): [[number, number], [number, number]] | null {
  if (!geom?.coordinates) return null
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90
  const walk = (pts: any[]) => {
    for (const p of pts) {
      if (typeof p[0] === "number") {
        if (p[0] < minLng) minLng = p[0]
        if (p[0] > maxLng) maxLng = p[0]
        if (p[1] < minLat) minLat = p[1]
        if (p[1] > maxLat) maxLat = p[1]
      } else walk(p)
    }
  }
  walk(geom.coordinates)
  if (minLng === 180 || maxLng === -180) return null
  return [[minLng, minLat], [maxLng, maxLat]]
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
