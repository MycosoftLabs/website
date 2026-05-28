/**
 * Satellite Disk Cache - keeps real TLE-backed satellites visible across
 * dev-server restarts and temporary upstream outages.
 */

import fs from "node:fs"
import path from "node:path"
import type { SatelliteRecord } from "@/lib/crep/registries/satellite-registry"

const CACHE_DIR = path.resolve(process.cwd(), "var", "cache")
const CACHE_FILE = path.join(CACHE_DIR, "satellites.json")
const SATELLITE_MAX_AGE_MS = 72 * 60 * 60 * 1000
const SATELLITE_MAX_ENTRIES = 3000

interface CachedSatellite extends SatelliteRecord {
  cached_at: string
}

interface CacheFile {
  version: 1
  written_at: string
  satellites: Record<string, CachedSatellite>
}

let memCache: Record<string, CachedSatellite> | null = null

function ensureDir() {
  if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true })
}

function loadFromDisk(): Record<string, CachedSatellite> {
  try {
    if (!fs.existsSync(CACHE_FILE)) return {}
    const parsed = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as CacheFile
    if (parsed.version !== 1 || !parsed.satellites) return {}
    return parsed.satellites
  } catch (err) {
    console.warn("[SatelliteDiskCache] load failed, starting empty:", err)
    return {}
  }
}

function getMemCache(): Record<string, CachedSatellite> {
  if (!memCache) memCache = loadFromDisk()
  return memCache
}

export function saveSatellitesToDiskCache(satellites: SatelliteRecord[]): number {
  if (!satellites?.length) return 0
  const cache = getMemCache()
  const cachedAt = new Date().toISOString()
  let stored = 0

  for (const satellite of satellites) {
    if (!satellite.noradId || !satellite.line1 || !satellite.line2) continue
    cache[String(satellite.noradId)] = { ...satellite, cached_at: cachedAt }
    stored++
  }

  const entries = Object.entries(cache)
    .sort(([, a], [, b]) => (new Date(b.cached_at).getTime() || 0) - (new Date(a.cached_at).getTime() || 0))
    .slice(0, SATELLITE_MAX_ENTRIES)

  const trimmed = Object.fromEntries(entries) as Record<string, CachedSatellite>
  memCache = trimmed

  try {
    ensureDir()
    fs.writeFileSync(CACHE_FILE, JSON.stringify({
      version: 1,
      written_at: cachedAt,
      satellites: trimmed,
    } satisfies CacheFile), "utf8")
  } catch (err) {
    console.warn("[SatelliteDiskCache] write failed:", err)
  }

  return stored
}

export function readSatellitesFromDiskCache(): SatelliteRecord[] {
  const cache = getMemCache()
  const now = Date.now()
  const fresh: SatelliteRecord[] = []

  for (const [noradId, satellite] of Object.entries(cache)) {
    const age = now - new Date(satellite.cached_at).getTime()
    if (age > SATELLITE_MAX_AGE_MS || Number.isNaN(age)) {
      delete cache[noradId]
      continue
    }
    const { cached_at, ...record } = satellite
    if (record.line1 && record.line2) fresh.push(record)
  }

  return fresh
}

export function getSatelliteDiskCacheStats() {
  return { total: Object.keys(getMemCache()).length, file: CACHE_FILE }
}
