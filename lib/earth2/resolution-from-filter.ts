/**
 * Map CREP Earth-2 UI resolution to API degree spacing (Apr 15, 2026).
 * Smaller degrees = denser sample grid (more accurate; larger payloads).
 * True CorrDiff 1km/250m runs require Legion/GPU inference via MAS — this only
 * controls scalar grid + wind request density for operational/Open-Meteo paths.
 */

export type Earth2ResolutionPreset = "native" | "1km" | "250m";
export type Earth2GpuMode = "earth2" | "voice" | "physics" | "off";

/** ~0.25° matches global model labels; finer for “high” GPU mode */
export function gridResolutionDegrees(filter: {
  resolution: Earth2ResolutionPreset;
  gpuMode: Earth2GpuMode;
}): number {
  const { resolution, gpuMode } = filter;
  const boost = gpuMode === "earth2" ? 0.85 : 1;
  switch (resolution) {
    case "250m":
      return 0.06 * boost;
    case "1km":
      return 0.1 * boost;
    case "native":
    default:
      return 0.22 * boost;
  }
}

/** Canvas size for bilinear raster — viewport-aware caps to protect GPU */
export function rasterDimensions(mapWidth: number, mapHeight: number): { w: number; h: number } {
  const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
  const w = Math.min(2048, Math.max(512, Math.round(mapWidth * dpr)));
  const h = Math.min(2048, Math.max(512, Math.round(mapHeight * dpr)));
  return { w, h };
}
