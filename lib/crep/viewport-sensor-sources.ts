import type { MapBoundsLike } from "@/lib/crep/viewport-revision"
import { pointInViewportBbox } from "@/lib/crep/eagle-viewport-sources"

export interface ViewportSensorLive {
  value: number
  unit: string
  parameter: string
  observed_at?: string | null
  label?: string
  color?: string
}

export interface ViewportSensorSource {
  id: string
  name: string
  provider: string
  agency?: string
  lat: number
  lng: number
  kind: string
  category: string
  station_id?: string
  description?: string
  live: ViewportSensorLive
}

export function filterSensorsInViewport(
  sensors: ViewportSensorSource[],
  bounds: MapBoundsLike,
  limit: number,
): ViewportSensorSource[] {
  return sensors
    .filter((s) => pointInViewportBbox(s.lng, s.lat, bounds))
    .slice(0, limit)
}

export async function loadViewportSensors(
  bounds: MapBoundsLike,
  limit: number,
  onUpdate: (sensors: ViewportSensorSource[]) => void,
  signal?: AbortSignal,
): Promise<void> {
  const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
  const q = new URLSearchParams({ bbox, limit: String(Math.max(limit, 12)) })
  const res = await fetch(`/api/crep/viewport-sensors?${q}`, { signal, cache: "no-store" })
  if (!res.ok) {
    onUpdate([])
    return
  }
  const json = await res.json()
  const sensors: ViewportSensorSource[] = Array.isArray(json.sensors) ? json.sensors : []
  onUpdate(filterSensorsInViewport(sensors, bounds, limit))
}
