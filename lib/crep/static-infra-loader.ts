/**
 * Static Infrastructure Loader — PMTiles-first, GeoJSON-fallback (Fix C)
 *
 * Generated PMTiles (public/data/crep/tiles/*.pmtiles) are massively
 * cheaper to load and render than the raw GeoJSON files:
 *   • MapLibre only materialises features in the current viewport tile
 *   • HTTP range-requested — no full 12-16 MB download per layer
 *   • Typical compressed PMTiles archive: ~1-3 MB per layer
 *
 * When a .pmtiles file isn't present (tippecanoe hasn't been run), we
 * fall back to fetching the bundled GeoJSON and setData()-ing it into a
 * GeoJSON source. The dashboard code paths stay the same — only the
 * source type/URL changes.
 */

export interface InfraLayerConfig {
  /** Stable id used for MapLibre source name */
  sourceId: string
  /** Vector tile layer name inside the PMTiles archive (matches --layer= in gen-pmtiles.sh) */
  pmtilesLayerName: string
  /** Relative URL of the .pmtiles file */
  pmtilesUrl: string
  /** Fallback GeoJSON URL (bundled static file) */
  geojsonUrl: string
  /** Human-readable debug label */
  label: string
}

export const INFRA_LAYERS: Record<string, InfraLayerConfig> = {
  substations: {
    sourceId: "crep-substations",
    pmtilesLayerName: "substations",
    pmtilesUrl: "/data/crep/tiles/substations-us.pmtiles",
    geojsonUrl: "/data/crep/substations-us.geojson",
    label: "US substations (HIFLD)",
  },
  transmissionLines: {
    sourceId: "crep-txlines",
    pmtilesLayerName: "transmission_lines",
    pmtilesUrl: "/data/crep/tiles/transmission-lines-us-major.pmtiles",
    geojsonUrl: "/data/crep/transmission-lines-us-major.geojson",
    label: "US transmission lines (HIFLD ≥345 kV)",
  },
  powerPlantsGlobal: {
    sourceId: "crep-plants-global",
    pmtilesLayerName: "power_plants",
    pmtilesUrl: "/data/crep/tiles/power-plants-global.pmtiles",
    geojsonUrl: "/data/crep/power-plants-global.geojson",
    label: "Global power plants (WRI)",
  },
}

/**
 * Probe whether a .pmtiles file is reachable (HEAD request).
 * 15-second in-memory memoization so we don't re-probe on every source add.
 */
const pmtilesProbeCache = new Map<string, { ts: number; available: boolean }>()
const PROBE_TTL_MS = 15_000

export async function isPMTilesAvailable(url: string): Promise<boolean> {
  const cached = pmtilesProbeCache.get(url)
  if (cached && Date.now() - cached.ts < PROBE_TTL_MS) return cached.available
  try {
    const res = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(3000) })
    const ok = res.ok && (res.headers.get("content-type") || "").length > 0
    pmtilesProbeCache.set(url, { ts: Date.now(), available: ok })
    return ok
  } catch {
    pmtilesProbeCache.set(url, { ts: Date.now(), available: false })
    return false
  }
}

/**
 * Add the given layer to a MapLibre map using PMTiles if available, or
 * GeoJSON as fallback. Returns metadata including which path was used.
 */
export async function addInfraSourceWithFallback(
  map: any,
  cfg: InfraLayerConfig,
  opts?: { forceGeoJSON?: boolean },
): Promise<{ mode: "pmtiles" | "geojson" | "skipped"; sourceId: string }> {
  if (!map || typeof map.getSource !== "function") {
    return { mode: "skipped", sourceId: cfg.sourceId }
  }
  // Already present?
  if (map.getSource(cfg.sourceId)) {
    return { mode: "skipped", sourceId: cfg.sourceId }
  }

  // Prefer PMTiles when the archive is published
  if (!opts?.forceGeoJSON && (await isPMTilesAvailable(cfg.pmtilesUrl))) {
    map.addSource(cfg.sourceId, {
      type: "vector",
      url: `pmtiles://${new URL(cfg.pmtilesUrl, window.location.origin).toString()}`,
    })
    console.log(`[CREP/Infra] ${cfg.label}: PMTiles source added`)
    return { mode: "pmtiles", sourceId: cfg.sourceId }
  }

  // Fallback: fetch the GeoJSON and register as a geojson source
  try {
    const res = await fetch(cfg.geojsonUrl, { cache: "force-cache" })
    if (!res.ok) throw new Error(`${cfg.geojsonUrl} → HTTP ${res.status}`)
    const fc = await res.json()
    map.addSource(cfg.sourceId, { type: "geojson", data: fc })
    console.log(`[CREP/Infra] ${cfg.label}: GeoJSON fallback added (${fc?.features?.length ?? 0} features)`)
    return { mode: "geojson", sourceId: cfg.sourceId }
  } catch (e: any) {
    console.warn(`[CREP/Infra] ${cfg.label}: source add failed:`, e?.message)
    return { mode: "skipped", sourceId: cfg.sourceId }
  }
}

/**
 * Extract the right `source-layer` property name given the mode. Callers
 * use this when adding the render layer — PMTiles needs `source-layer`,
 * GeoJSON does not.
 */
export function layerSpecForMode(
  mode: "pmtiles" | "geojson" | "skipped",
  cfg: InfraLayerConfig,
): { sourceLayer?: string } {
  if (mode === "pmtiles") return { sourceLayer: cfg.pmtilesLayerName }
  return {}
}
