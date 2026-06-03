import type { MapBoundsLike } from "@/lib/crep/viewport-revision"
import {
  filterEagleVideoSources,
  isDisplayableEagleCamera,
  normalizeEagleCameraCoords,
} from "@/lib/crep/eagle-camera-normalize"
import { normalizeYouTubeEmbedUrlSync } from "@/lib/crep/youtube-embed"

export interface EagleViewportSource {
  id: string
  name?: string | null
  provider: string
  lat: number
  lng: number
  stream_url?: string | null
  embed_url?: string | null
  media_url?: string | null
}

const BAKED_GEOJSON_URLS = [
  "/data/crep/eagle-cameras-registry.geojson",
  "/data/crep/eagle-cameras-manual-seed.geojson",
  "/data/crep/eagle-cameras-caltrans-san-diego-seed.geojson",
  "/data/crep/eagle-cameras-border-supplement.geojson",
  "/data/crep/eagle-cameras-nyc-dc-seed.geojson",
  "/data/crep/eagle-cameras-vegas-seed.geojson",
  "/data/crep/eagle-cameras-deployment-sites-seed.geojson",
] as const

let bakedLoadPromise: Promise<EagleViewportSource[]> | null = null

function featureToSource(feature: {
  properties?: Record<string, unknown>
  geometry?: { coordinates?: number[] }
}): EagleViewportSource | null {
  const p = feature.properties || {}
  const coords = feature.geometry?.coordinates
  const lng = Number(coords?.[0])
  const lat = Number(coords?.[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  const id = String(p.id || `${p.provider}-${lat}-${lng}`)
  const provider = String(p.provider || "camera")
  let embed_url = (p.embed_url as string) ?? null
  if (embed_url && (provider === "youtube_live" || /youtube/i.test(provider))) {
    embed_url = normalizeYouTubeEmbedUrlSync(embed_url) || embed_url
  }
  const raw = {
    id,
    name: (p.name as string) ?? (p.title as string) ?? null,
    provider,
    lat,
    lng,
    stream_url: (p.stream_url as string) ?? null,
    embed_url,
    media_url: (p.media_url as string) ?? null,
  }
  const normalized = normalizeEagleCameraCoords(raw)
  if (!isDisplayableEagleCamera(normalized)) return null
  return normalized
}

export function pointInViewportBbox(
  lng: number,
  lat: number,
  bounds: MapBoundsLike,
): boolean {
  if (lat < bounds.south || lat > bounds.north) return false
  if (bounds.west <= bounds.east) {
    return lng >= bounds.west && lng <= bounds.east
  }
  return lng >= bounds.west || lng <= bounds.east
}

export function mergeEagleSources(
  ...groups: EagleViewportSource[][]
): EagleViewportSource[] {
  const byId = new Map<string, EagleViewportSource>()
  for (const group of groups) {
    for (const source of group) {
      byId.set(source.id, source)
    }
  }
  return Array.from(byId.values())
}

export function filterSourcesInViewport(
  sources: EagleViewportSource[],
  bounds: MapBoundsLike,
  limit: number,
): EagleViewportSource[] {
  const lngSpan = bounds.west <= bounds.east
    ? bounds.east - bounds.west
    : 360 - bounds.west + bounds.east
  const centerLng = ((bounds.west + (lngSpan / 2) + 540) % 360) - 180
  const centerLat = (bounds.north + bounds.south) / 2
  const longitudeDelta = (lng: number) => {
    const diff = Math.abs(lng - centerLng)
    return Math.min(diff, 360 - diff)
  }

  return sources
    .filter((s) => pointInViewportBbox(s.lng, s.lat, bounds))
    .sort((a, b) => {
      const aDist = Math.hypot(longitudeDelta(a.lng), a.lat - centerLat)
      const bDist = Math.hypot(longitudeDelta(b.lng), b.lat - centerLat)
      return aDist - bDist
    })
    .slice(0, limit)
}

export async function loadBakedEagleCameras(): Promise<EagleViewportSource[]> {
  if (!bakedLoadPromise) {
    bakedLoadPromise = (async () => {
      const merged = new Map<string, EagleViewportSource>()
      await Promise.all(
        BAKED_GEOJSON_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "force-cache" })
            if (!res.ok) return
            const json = await res.json()
            for (const feature of json?.features || []) {
              const source = featureToSource(feature)
              if (source) merged.set(source.id, source)
            }
          } catch {
            /* ignore missing seed files */
          }
        }),
      )
      return Array.from(merged.values())
    })()
  }
  return bakedLoadPromise
}

function mapApiSources(raw: unknown[]): EagleViewportSource[] {
  return filterEagleVideoSources(
    raw.map((item) => {
      const c = item as Record<string, unknown>
      const lat = Number(c.lat ?? c.latitude)
      const lng = Number(c.lng ?? c.longitude)
      return {
        id: String(c.id || `${c.provider}-${lat}-${lng}`),
        name: (c.name as string) ?? (c.title as string) ?? null,
        provider: String(c.provider || "camera"),
        lat,
        lng,
        stream_url: (c.stream_url as string) ?? null,
        embed_url: (c.embed_url as string) ?? null,
        media_url: (c.media_url as string) ?? null,
      }
    }),
  )
}

async function fetchEagleApi(
  bounds: MapBoundsLike,
  opts: { fast: boolean; live: boolean; limit: number },
  signal?: AbortSignal,
): Promise<EagleViewportSource[]> {
  const bbox = `${bounds.west},${bounds.south},${bounds.east},${bounds.north}`
  const q = new URLSearchParams({
    bbox,
    limit: String(opts.limit),
  })
  if (opts.fast) q.set("fast", "1")
  if (!opts.live) q.set("live", "0")

  const res = await fetch(`/api/eagle/sources?${q}`, {
    signal,
    cache: "no-store",
  })
  if (!res.ok) return []
  const data = await res.json()
  return mapApiSources(data.sources || [])
}

export type EagleLoadPhase = "instant" | "fast" | "full"

/** Instant baked registry → fast MINDEX-only API → full live enrichment. */
export async function loadViewportEagleSources(
  bounds: MapBoundsLike,
  limit: number,
  onUpdate: (sources: EagleViewportSource[], phase: EagleLoadPhase) => void,
  signal?: AbortSignal,
): Promise<void> {
  const baked = await loadBakedEagleCameras()
  const instant = filterSourcesInViewport(baked, bounds, limit)
  if (instant.length) onUpdate(instant, "instant")

  let current = instant
  const lngSpan = bounds.west <= bounds.east
    ? bounds.east - bounds.west
    : 360 - bounds.west + bounds.east
  const latSpan = bounds.north - bounds.south
  const focusedViewport = lngSpan <= 5 && latSpan <= 5

  const loadFastApi = async () => {
    const fastApi = await fetchEagleApi(bounds, { fast: true, live: false, limit: Math.max(limit, 24) }, signal)
    if (fastApi.length) {
      current = filterSourcesInViewport(mergeEagleSources(current, fastApi), bounds, limit)
      onUpdate(current, "fast")
    }
  }

  const loadFullApi = async () => {
    const fullApi = await fetchEagleApi(bounds, { fast: false, live: false, limit: Math.max(limit, 128) }, signal)
    if (fullApi.length) {
      current = filterSourcesInViewport(mergeEagleSources(current, fullApi), bounds, limit)
      onUpdate(current, "full")
    }
  }

  try {
    if (focusedViewport) {
      await loadFullApi()
      if (!current.length) await loadFastApi()
    } else {
      await loadFastApi()
      await loadFullApi()
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw error
  }

  if (!current.length) onUpdate([], "full")
}

export function bboxKeyFromBounds(bounds: MapBoundsLike): string {
  return `${bounds.west.toFixed(4)},${bounds.south.toFixed(4)},${bounds.east.toFixed(4)},${bounds.north.toFixed(4)}`
}
