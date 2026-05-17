export interface GeoPoint {
  lat: number
  lng: number
}

export interface CoastalFocus extends GeoPoint {
  name: string
  zoom: number
}

const COASTAL_ANCHORS: CoastalFocus[] = [
  { name: "Pacific coast", lat: 37.7749, lng: -122.4194, zoom: 6 },
  { name: "Southern California coast", lat: 33.7701, lng: -118.1937, zoom: 7 },
  { name: "Pacific Northwest coast", lat: 47.6062, lng: -122.3321, zoom: 6 },
  { name: "Gulf coast", lat: 29.7604, lng: -95.3698, zoom: 6 },
  { name: "Florida coast", lat: 25.7617, lng: -80.1918, zoom: 6 },
  { name: "Mid-Atlantic coast", lat: 36.8508, lng: -76.2859, zoom: 6 },
  { name: "New York coast", lat: 40.7128, lng: -74.006, zoom: 6 },
  { name: "New England coast", lat: 42.3601, lng: -71.0589, zoom: 6 },
  { name: "Alaska coast", lat: 61.2181, lng: -149.9003, zoom: 5 },
  { name: "Hawaii coast", lat: 21.3069, lng: -157.8583, zoom: 7 },
  { name: "British Columbia coast", lat: 49.2827, lng: -123.1207, zoom: 6 },
  { name: "Mexico Pacific coast", lat: 20.6534, lng: -105.2253, zoom: 6 },
  { name: "Caribbean coast", lat: 18.4655, lng: -66.1057, zoom: 6 },
  { name: "North Sea coast", lat: 51.5074, lng: -0.1278, zoom: 5 },
  { name: "Mediterranean coast", lat: 41.3851, lng: 2.1734, zoom: 5 },
  { name: "East Asia coast", lat: 35.6762, lng: 139.6503, zoom: 5 },
  { name: "Southeast Asia coast", lat: 1.3521, lng: 103.8198, zoom: 5 },
  { name: "Australia east coast", lat: -33.8688, lng: 151.2093, zoom: 5 },
]

function distanceSquared(a: GeoPoint, b: GeoPoint): number {
  const lngScale = Math.cos((a.lat * Math.PI) / 180)
  return (a.lat - b.lat) ** 2 + ((a.lng - b.lng) * lngScale) ** 2
}

export function nearestCoastalFocus(location: GeoPoint | null | undefined): CoastalFocus | null {
  if (!location || !Number.isFinite(location.lat) || !Number.isFinite(location.lng)) return null
  return COASTAL_ANCHORS.reduce((best, anchor) =>
    distanceSquared(location, anchor) < distanceSquared(location, best) ? anchor : best
  )
}

export function queryNeedsCoastalFocus(query: string): boolean {
  return /\b(vessels?|ships?|boats?|maritime|ais)\b/i.test(query) &&
    /\b(coast|coastal|shore|offshore|near\s+me|nearby|local|around\s+me)\b/i.test(query)
}
