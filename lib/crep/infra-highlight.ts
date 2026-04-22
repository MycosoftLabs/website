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

  // Apr 22, 2026 — Morgan: "strange selection bubble is still around
  // cameras not actually selecting them ... it also shows around cell
  // towers". The ring was 40 px at z14 — huge, and visually implied
  // selection even when the target widget (VideoWallWidget for cameras,
  // InfraAsset panel for plants/subs) hadn't opened. Tuned down to a
  // subtle tight ring: 8–14 px outer, 3–5 px inner. Keeps the "click
  // landed" signal without the misleading mega-bubble.
  try {
    if (map.getLayer("crep-highlight-point-glow")) map.removeLayer("crep-highlight-point-glow")
    map.addLayer({
      id: "crep-highlight-point-glow",
      type: "circle",
      source: "crep-highlight-point",
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 6, 8, 10, 14, 14],
        "circle-color": "transparent",
        "circle-stroke-width": 1.5,
        "circle-stroke-color": "#00ffff",
        "circle-opacity": 0.7,
        "circle-stroke-opacity": 0.6,
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
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 2.5, 8, 4, 14, 5.5],
        "circle-color": "#00ffff",
        "circle-opacity": 0.25,
        "circle-stroke-width": 0.8,
        "circle-stroke-color": "#ffffff",
        "circle-stroke-opacity": 0.5,
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
 * Apr 22, 2026 — Morgan: "we dont need that ring at all anywhere".
 * highlightPoint / highlightLine / highlightFromEvent all no-op now.
 * The cyan ring on every asset click was being misread as a "loading"
 * state and obscuring the entities below. Selection is signalled by
 * the widget panel opening, not by a map glow. Keeping the functions
 * exported so existing callsites compile + `clearHighlight` still
 * works for legacy state cleanup.
 */
export function highlightPoint(_map: any, _lng: number, _lat: number, _properties?: Record<string, any>) {
  // disabled
}

export function highlightLine(_map: any, _geometry: any, _properties?: Record<string, any>) {
  // disabled
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
export function highlightFromEvent(_map: any, _e: any) {
  // Apr 22, 2026 — disabled per Morgan ("we dont need that ring at all
  // anywhere"). Kept as an exported no-op so all 7 existing callsites
  // in CREPDashboardClient continue to compile without edits.
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
