/**
 * Convert Open-Meteo point samples to a dense number[][] for CREP raster layers (Apr 15, 2026).
 */

export interface GridPoint {
  lat: number;
  lon: number;
  value: number;
}

export function pointsTo2DGrid(points: GridPoint[]): {
  grid: number[][];
  min: number;
  max: number;
} | null {
  if (!points.length) return null;
  const lats = [...new Set(points.map((p) => p.lat))].sort((a, b) => a - b);
  const lons = [...new Set(points.map((p) => p.lon))].sort((a, b) => a - b);
  if (lats.length < 2 || lons.length < 2) return null;

  const idx = new Map<string, number>();
  for (const p of points) {
    idx.set(`${p.lat.toFixed(6)},${p.lon.toFixed(6)}`, p.value);
  }

  let min = Infinity;
  let max = -Infinity;
  const grid: number[][] = [];
  for (let i = 0; i < lats.length; i++) {
    const row: number[] = [];
    for (let j = 0; j < lons.length; j++) {
      const k = `${lats[i].toFixed(6)},${lons[j].toFixed(6)}`;
      const v = idx.get(k);
      const val = v !== undefined ? v : NaN;
      if (Number.isFinite(val)) {
        min = Math.min(min, val);
        max = Math.max(max, val);
      }
      row.push(val);
    }
    grid.push(row);
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
  return { grid, min, max };
}
