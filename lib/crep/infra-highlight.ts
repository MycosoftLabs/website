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
 *
 * Hardened: outer try/catch around everything so a malformed feature
 * or a missing MapLibre API can never crash the click handler (which
 * bubbles to React and triggers "missing required error components").
 */
export function highlightFromEvent(map: any, e: any) {
  try {
    const feature = e?.features?.[0]
    if (!feature) return

    const geomType = feature.geometry?.type
    if (geomType === "Point" || geomType === "MultiPoint") {
      const coords = feature.geometry.coordinates
      if (Array.isArray(coords) && typeof coords[0] === "number" && typeof coords[1] === "number") {
        highlightPoint(map, coords[0], coords[1], feature.properties)
      }
      return
    }

    if (geomType !== "LineString" && geomType !== "MultiLineString") return

    // Try to find all sibling segments that share the same cable_id / line_id /
    // id within the source. This turns a partial-segment click into a full
    // end-to-end highlight.
    const sourceId: string | undefined =
      (feature as any).source ||
      e?.features?.[0]?.layer?.source ||
      undefined
    const props = feature.properties || {}
    const groupKey =
      props.cable_id ?? props.line_id ?? props.cableId ?? props.lineId ?? props.id

    let wholeLineShown = false
    if (sourceId && groupKey != null && groupKey !== "") {
      try {
        const merged = gatherLineByGroupId(map, sourceId, groupKey)
        if (merged && merged.geometry.coordinates.length > 0) {
          highlightLine(map, merged.geometry, { ...props, __fullLine: true, __segments: merged.segmentCount })
          wholeLineShown = true
          // Attempt to fit to the full line's extent — completely best-effort,
          // never allowed to crash the click handler.
          try {
            const bounds = computeLineBounds(merged.geometry)
            if (bounds && (map as any)?.fitBounds) {
              (map as any).fitBounds(bounds, { padding: 80, duration: 700, maxZoom: 7 })
            }
          } catch (fitErr) {
            // fitBounds fails on NaN or degenerate bounds — fall back to single segment
            console.warn("[CREP/Highlight] fitBounds skipped:", (fitErr as any)?.message)
          }
        }
      } catch (mergeErr) {
        console.warn("[CREP/Highlight] whole-line merge failed, falling back to single segment:", (mergeErr as any)?.message)
      }
    }

    if (!wholeLineShown && feature.geometry) {
      highlightLine(map, feature.geometry, feature.properties)
    }
  } catch (e: any) {
    // Absolute last-resort swallow — a click must never crash the CREP tree.
    console.warn("[CREP/Highlight] highlightFromEvent failed:", e?.message || e)
  }
}

/**
 * Apr 19, 2026 (Morgan: "sea cables only highlight part seen in viewport
 * not entire cable"). MapLibre's querySourceFeatures returns features
 * CLIPPED to loaded tiles — so clicking a transatlantic cable while
 * zoomed to one coastline returned just the visible chunk. Registries
 * (cable loader, tx-line loader) now pre-register their full feature
 * lists here; gatherLineByGroupId consults the registry FIRST and only
 * falls through to querySourceFeatures when no registry exists.
 */
const featureRegistry = new Map<string, Map<string, any[]>>()

export function registerLineFeatures(sourceId: string, features: any[]) {
  const byId = new Map<string, any[]>()
  for (const f of features || []) {
    const p = f?.properties || {}
    const key = String(p.cable_id ?? p.line_id ?? p.cableId ?? p.lineId ?? p.id ?? "")
    if (!key) continue
    const bucket = byId.get(key)
    if (bucket) bucket.push(f)
    else byId.set(key, [f])
  }
  featureRegistry.set(sourceId, byId)
}

/**
 * Walk the pre-registered feature list (primary) or fall back to
 * MapLibre's querySourceFeatures (secondary) and return the merged
 * geometry of every feature whose id / cable_id / line_id matches
 * `groupKey`.
 *
 * The registry path is required for GeoJSON sources whose features
 * span beyond the current viewport — MapLibre clips those to loaded
 * tiles when `querySourceFeatures` is called.
 */
export function gatherLineByGroupId(map: any, sourceId: string, groupKey: any):
  { geometry: { type: "MultiLineString"; coordinates: [number, number][][] }; segmentCount: number } | null {
  try {
    if (!sourceId || typeof sourceId !== "string") return null
    const keyStr = String(groupKey)

    // 1) Registry-first path — full features stashed by the loader.
    const registry = featureRegistry.get(sourceId)
    const registryMatches = registry?.get(keyStr)
    let matching: any[] = Array.isArray(registryMatches) ? registryMatches : []

    // 2) Fallback: querySourceFeatures for sources that didn't register.
    if (!matching.length) {
      if (!map || typeof map.querySourceFeatures !== "function") return null
      if (typeof map.getSource === "function" && !map.getSource(sourceId)) return null
      let features: any[] = []
      try { features = map.querySourceFeatures(sourceId) || [] }
      catch { return null }
      if (!Array.isArray(features) || !features.length) return null
      matching = features.filter((f) => {
        const p = f?.properties || {}
        return String(p.cable_id ?? p.line_id ?? p.cableId ?? p.lineId ?? p.id ?? "") === keyStr
      })
    }

    if (!matching.length) return null
    const coords: [number, number][][] = []
    for (const m of matching) {
      const g = m?.geometry
      if (!g || !g.coordinates) continue
      if (g.type === "LineString" && Array.isArray(g.coordinates)) {
        if (g.coordinates.length >= 2) coords.push(g.coordinates as [number, number][])
      } else if (g.type === "MultiLineString" && Array.isArray(g.coordinates)) {
        for (const line of g.coordinates as [number, number][][]) {
          if (Array.isArray(line) && line.length >= 2) coords.push(line)
        }
      }
    }
    if (!coords.length) return null
    return { geometry: { type: "MultiLineString", coordinates: coords }, segmentCount: coords.length }
  } catch { return null }
}

function computeLineBounds(geom: any): [[number, number], [number, number]] | null {
  if (!geom?.coordinates) return null
  let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90
  let depthLimit = 0
  const walk = (pts: any[]) => {
    if (!Array.isArray(pts)) return
    if (++depthLimit > 500000) return // safety cap against pathological nesting
    for (const p of pts) {
      if (!p) continue
      if (typeof p[0] === "number" && typeof p[1] === "number" &&
          !Number.isNaN(p[0]) && !Number.isNaN(p[1]) &&
          Number.isFinite(p[0]) && Number.isFinite(p[1])) {
        if (p[0] < minLng) minLng = p[0]
        if (p[0] > maxLng) maxLng = p[0]
        if (p[1] < minLat) minLat = p[1]
        if (p[1] > maxLat) maxLat = p[1]
      } else if (Array.isArray(p)) {
        walk(p)
      }
    }
  }
  walk(geom.coordinates)
  // Reject degenerate / unset bounds (the initial sentinel values would
  // make fitBounds throw)
  if (minLng === 180 || maxLng === -180 || minLat === 90 || maxLat === -90) return null
  if (minLng > maxLng || minLat > maxLat) return null
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
