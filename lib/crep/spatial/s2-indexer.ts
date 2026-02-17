import { S2CellId, S2LatLng } from "s2-geometry";

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeLng(lng: number): number {
  let normalized = lng;
  while (normalized > 180) normalized -= 360;
  while (normalized < -180) normalized += 360;
  return normalized;
}

export function getS2LevelFromZoom(zoom: number): number {
  return clamp(Math.floor(zoom / 2) + 4, 4, 20);
}

export function getS2CellId(lat: number, lng: number, level = 14): string {
  const latLng = S2LatLng.fromDegrees(clamp(lat, -90, 90), normalizeLng(lng));
  const cellId = S2CellId.fromLatLng(latLng).parent(clamp(level, 1, 30));
  return cellId.toToken();
}

function createLngSteps(west: number, east: number, gridStep: number): number[] {
  if (west <= east) {
    const lngs: number[] = [];
    for (let lng = west; lng <= east; lng += gridStep) lngs.push(lng);
    lngs.push(east);
    return lngs;
  }

  const wrappedEast = east + 360;
  const lngs: number[] = [];
  for (let lng = west; lng <= wrappedEast; lng += gridStep) lngs.push(normalizeLng(lng));
  lngs.push(normalizeLng(wrappedEast));
  return lngs;
}

export function getViewportCells(bounds: MapBounds, zoom: number): string[] {
  const level = getS2LevelFromZoom(zoom);
  const latSpan = Math.max(0.001, bounds.north - bounds.south);
  const lngSpan =
    bounds.west <= bounds.east
      ? Math.max(0.001, bounds.east - bounds.west)
      : Math.max(0.001, 360 - bounds.west + bounds.east);

  const approxGrid = clamp(Math.ceil(Math.sqrt((latSpan * lngSpan) / 2)), 3, 18);
  const latStep = latSpan / approxGrid;
  const lngStep = lngSpan / approxGrid;

  const cells = new Set<string>();
  const lngSteps = createLngSteps(bounds.west, bounds.east, lngStep);

  for (let lat = bounds.south; lat <= bounds.north; lat += latStep) {
    for (const lng of lngSteps) {
      cells.add(getS2CellId(lat, lng, level));
    }
  }

  cells.add(getS2CellId(bounds.north, bounds.west, level));
  cells.add(getS2CellId(bounds.north, bounds.east, level));
  cells.add(getS2CellId(bounds.south, bounds.west, level));
  cells.add(getS2CellId(bounds.south, bounds.east, level));

  return [...cells];
}
