export interface MapBoundsLike {
  north: number
  south: number
  east: number
  west: number
}

export interface ViewportSnapshot {
  bounds: MapBoundsLike
  zoom: number
}

function center(bounds: MapBoundsLike) {
  let lng = (bounds.east + bounds.west) / 2
  if (bounds.west > bounds.east) lng = ((bounds.east + 360 + bounds.west) / 2) % 360
  if (lng > 180) lng -= 360
  return { lat: (bounds.north + bounds.south) / 2, lng }
}

/** True when zoom changed materially or the map center shifted >25% of viewport span. */
export function isSignificantViewportChange(
  prev: ViewportSnapshot | null,
  next: ViewportSnapshot,
): boolean {
  if (!prev) return true
  if (Math.abs(prev.zoom - next.zoom) >= 0.45) return true

  const latSpan = Math.max(0.001, Math.abs(next.bounds.north - next.bounds.south))
  const lngSpan =
    next.bounds.west <= next.bounds.east
      ? Math.max(0.001, Math.abs(next.bounds.east - next.bounds.west))
      : Math.max(0.001, 360 - Math.abs(next.bounds.west - next.bounds.east))

  const prevCenter = center(prev.bounds)
  const nextCenter = center(next.bounds)
  const latShift = Math.abs(prevCenter.lat - nextCenter.lat) / latSpan
  const lngShift = Math.abs(prevCenter.lng - nextCenter.lng) / lngSpan
  return latShift > 0.22 || lngShift > 0.22
}

export function makeViewportRevisionKey(bounds: MapBoundsLike, zoom: number): string {
  const precision = zoom >= 12 ? 3 : zoom >= 8 ? 2 : 1
  const round = (n: number) => Number(n.toFixed(precision))
  return [
    round(bounds.north),
    round(bounds.south),
    round(bounds.east),
    round(bounds.west),
    zoom.toFixed(1),
  ].join("|")
}

export function latLngToTile(lat: number, lng: number, zoom: number) {
  const z = Math.max(1, Math.min(15, Math.round(zoom)))
  const n = 2 ** z
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n,
  )
  return { x, y, z }
}

export function esriWorldImageryTileUrl(lat: number, lng: number, zoom: number) {
  const { x, y, z } = latLngToTile(lat, lng, zoom)
  return `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
}
