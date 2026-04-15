/**
 * Bilinear rasterization of Earth-2 scalar grids for MapLibre image overlays (Apr 15, 2026).
 * Replaces per-cell GeoJSON fills with a single smooth RGBA texture (NVIDIA-style viz on the web).
 */

import type { GeoBounds } from "@/lib/earth2/client";

type ColorStop = { value: number; color: string };

function parseRgb(color: string): { r: number; g: number; b: number; a: number } {
  const m = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (m) {
    return {
      r: Number(m[1]),
      g: Number(m[2]),
      b: Number(m[3]),
      a: m[4] !== undefined ? Number(m[4]) : 1,
    };
  }
  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const full = hex.length === 3 ? hex.split("").map((c) => c + c).join("") : hex;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a: 1 };
  }
  return { r: 128, g: 128, b: 128, a: 0.6 };
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Piecewise linear color along stops (smoother than step colors). */
export function colorForScalar(value: number, stops: ColorStop[]): { r: number; g: number; b: number; a: number } {
  if (stops.length === 0) return { r: 128, g: 128, b: 128, a: 0 };
  if (value <= stops[0].value) return parseRgb(stops[0].color);
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (value >= a.value && value <= b.value) {
      const t = (value - a.value) / (b.value - a.value + 1e-9);
      const ca = parseRgb(a.color);
      const cb = parseRgb(b.color);
      return {
        r: Math.round(lerp(ca.r, cb.r, t)),
        g: Math.round(lerp(ca.g, cb.g, t)),
        b: Math.round(lerp(ca.b, cb.b, t)),
        a: lerp(ca.a, cb.a, t),
      };
    }
  }
  return parseRgb(stops[stops.length - 1].color);
}

function bilinear(
  grid: number[][],
  fi: number,
  fj: number,
): number {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < 1 || cols < 1) return NaN;
  const i0 = Math.max(0, Math.min(rows - 1, Math.floor(fi)));
  const j0 = Math.max(0, Math.min(cols - 1, Math.floor(fj)));
  const i1 = Math.max(0, Math.min(rows - 1, i0 + 1));
  const j1 = Math.max(0, Math.min(cols - 1, j0 + 1));
  const ti = fi - i0;
  const tj = fj - j0;
  const v00 = grid[i0][j0];
  const v01 = grid[i0][j1];
  const v10 = grid[i1][j0];
  const v11 = grid[i1][j1];
  const v0 = lerp(v00, v01, tj);
  const v1 = lerp(v10, v11, tj);
  return lerp(v0, v1, ti);
}

export interface GridRasterParams {
  grid: number[][];
  bounds: GeoBounds;
  colorStops: ColorStop[];
  width: number;
  height: number;
  /** Optional mask: hide invalid / NaN */
  validPredicate?: (v: number) => boolean;
}

/**
 * Renders scalar grid to RGBA canvas: rows index south→north, cols west→east.
 * Pixel (0,0) is northwest corner.
 */
export function gridToRasterCanvas(params: GridRasterParams): HTMLCanvasElement {
  const { grid, bounds, colorStops, width, height, validPredicate } = params;
  const isValid = validPredicate ?? ((v: number) => Number.isFinite(v));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.createImageData(width, height);
  const { north, south, east, west } = bounds;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  if (rows < 2 || cols < 2) {
    ctx.clearRect(0, 0, width, height);
    return canvas;
  }

  for (let py = 0; py < height; py++) {
    const lat = north - (py / Math.max(1, height - 1)) * (north - south);
    const fi = ((lat - south) / (north - south)) * (rows - 1);
    for (let px = 0; px < width; px++) {
      const lon = west + (px / Math.max(1, width - 1)) * (east - west);
      const fj = ((lon - west) / (east - west)) * (cols - 1);
      const v = bilinear(grid, fi, fj);
      const idx = (py * width + px) * 4;
      if (!isValid(v)) {
        img.data[idx] = 0;
        img.data[idx + 1] = 0;
        img.data[idx + 2] = 0;
        img.data[idx + 3] = 0;
        continue;
      }
      const { r, g, b, a } = colorForScalar(v, colorStops);
      img.data[idx] = r;
      img.data[idx + 1] = g;
      img.data[idx + 2] = b;
      img.data[idx + 3] = Math.round(Math.min(1, Math.max(0, a)) * 255);
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}
